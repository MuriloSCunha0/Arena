import { supabase } from '../../lib/supabase';
import { 
  Match, 
  Tournament, 
  Court, 
  TeamFormationType, 
  TournamentSettings, 
  TOURNAMENT_TYPES,
  TournamentFormat,
  TournamentData,
  Team
} from '../../types';
import { 
  calculateGroupRankings, 
  GroupRanking, 
  generateEliminationBracket, 
  updateEliminationBracket,
  calculateRankingsForPlacement 
} from '../../utils/rankingUtils';
import { handleSupabaseError } from '../../utils/supabase-error-handler';
import { distributeTeamsIntoGroups, createTournamentStructure } from '../../utils/groupFormationUtils';
import { useTournamentStore } from '../../store/tournamentStore';

// Add UUID generation function
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const transformMatch = (data: any): Match => ({
  id: data.id,
  eventId: data.event_id,
  tournamentId: data.tournament_id,
  round: data.round,
  position: data.position,
  team1: data.team1,
  team2: data.team2,
  score1: data.score1,
  score2: data.score2,
  winnerId: data.winner_id,
  completed: data.completed,
  scheduledTime: data.scheduled_time,
  courtId: data.court_id,
  stage: data.stage,
  groupNumber: data.group_number,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
});

// Fix: Update transformTournament to accept only data parameter
const transformTournament = (data: any, matches?: Match[]): Tournament => ({
  id: data.id,
  eventId: data.event_id,
  format: data.format as TournamentFormat || TournamentFormat.GROUP_STAGE_ELIMINATION,
  settings: data.settings || {},
  status: data.status,
  totalRounds: data.total_rounds,
  currentRound: data.current_round || 0,
  groupsCount: data.groups_count || 0,
  groupsData: data.groups_data || {},
  bracketsData: data.brackets_data || {},
  thirdPlaceMatch: data.third_place_match ?? true,
  autoAdvance: data.auto_advance ?? false,
  startedAt: data.started_at,
  completedAt: data.completed_at,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
  
  // Novos campos JSONB
  matchesData: data.matches_data || [],
  teamsData: data.teams_data || [],
  standingsData: data.standings_data || {},
  eliminationBracket: data.elimination_bracket || {},
  
  // Para compatibilidade - use matches parameter if provided
  matches: matches || data.matches_data || [],
});

const toSupabaseMatch = (match: Partial<Match>) => ({
  event_id: match.eventId,
  tournament_id: match.tournamentId,
  round: match.round,
  position: match.position,
  team1: match.team1,
  team2: match.team2,
  score1: match.score1,
  score2: match.score2,
  winner_id: match.winnerId,
  completed: match.completed,
  scheduled_time: match.scheduledTime,
  court_id: match.courtId,
  stage: match.stage,
  group_number: match.groupNumber,
});

const toSupabaseTournament = (tournament: Partial<Tournament>) => ({
  event_id: tournament.eventId,
  format: tournament.format,
  settings: tournament.settings,
  status: tournament.status,
  total_rounds: tournament.totalRounds,
  current_round: tournament.currentRound,
  groups_count: tournament.groupsCount,
  groups_data: tournament.groupsData,
  brackets_data: tournament.bracketsData,
  third_place_match: tournament.thirdPlaceMatch,
  auto_advance: tournament.autoAdvance,
  started_at: tournament.startedAt,
  completed_at: tournament.completedAt,
  
  // Novos campos JSONB
  matches_data: tournament.matchesData,
  teams_data: tournament.teamsData,
  standings_data: tournament.standingsData,
  elimination_bracket: tournament.eliminationBracket,
});

// Usar tipo padrão se não especificado
const getDefaultTournamentType = (): string => {
  return TOURNAMENT_TYPES.GROUPS_KNOCKOUT;
};

// Fix: Create interface for TournamentV2 that includes tournamentData
interface TournamentV2 extends Tournament {
  tournamentData?: TournamentData;
  matchesCount?: number;
  completedMatchesCount?: number;
}

const transformTournamentV2 = (data: any): TournamentV2 => ({
  id: data.id,
  eventId: data.event_id,
  format: data.format as TournamentFormat || TournamentFormat.GROUP_STAGE_ELIMINATION,
  teamFormation: data.team_formation,
  status: data.status,
  tournamentData: data.tournament_data,
  startedAt: data.started_at,
  completedAt: data.completed_at,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
  
  // Campos obrigatórios da interface Tournament
  currentRound: data.current_round || 0,
  groupsCount: data.groups_count || 0,
  thirdPlaceMatch: data.third_place_match ?? true,
  autoAdvance: data.auto_advance ?? false,
  
  // Campos calculados
  totalRounds: data.total_rounds,
  matchesCount: data.matches_count,
  completedMatchesCount: data.completed_matches_count,
  
  // Novos campos JSONB
  matchesData: data.tournament_data?.matches || [],
  teamsData: data.tournament_data?.teams || [],
  standingsData: {},
  eliminationBracket: {},
  
  // Para compatibilidade
  matches: data.tournament_data?.matches || [],
  settings: data.tournament_data?.settings || {}
});

const toSupabaseTournamentV2 = (tournament: Partial<TournamentV2>) => ({
  event_id: tournament.eventId,
  format: tournament.format,
  team_formation: tournament.teamFormation,
  status: tournament.status,
  tournament_data: tournament.tournamentData,
  started_at: tournament.startedAt,
  completed_at: tournament.completedAt
});

export const TournamentService = {
  async getByEventId(eventId: string): Promise<Tournament | null> {
    try {
      // Check if tournaments table exists and get basic tournament data
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();

      if (tournamentError) {
         console.error(`Supabase error fetching tournament for event ${eventId}:`, tournamentError);
         return null;
      }

      if (!tournamentData) {
        console.log(`No tournament found for event ${eventId}.`);
        return null;
      }

      // Try to fetch matches, handle if table doesn't exist
      let matchesData: any[] = [];
      try {
        const { data: matches, error: matchesError } = await supabase
          .from('tournament_matches')
          .select('*')
          .eq('tournament_id', tournamentData.id)
          .order('stage', { ascending: true })
          .order('group_number', { ascending: true, nullsFirst: true })
          .order('round', { ascending: true })
          .order('position', { ascending: true });

        if (matchesError) {
          if (matchesError.code === '42P01') {
            console.warn('tournament_matches table does not exist - using matches from tournament data');
            // Try to get matches from tournament data if stored there
            matchesData = tournamentData.matches || [];
          } else {
            throw new Error(`Failed to fetch matches: ${matchesError.message}`);
          }
        } else {
          matchesData = matches || [];
        }
      } catch (matchError) {
        console.warn('Could not fetch tournament matches, using embedded matches:', matchError);
        // Fallback to matches stored in tournament data
        matchesData = tournamentData.matches || [];
      }

      // Transform matches if they exist
      const matches = matchesData.map((match: any) => {
        // Handle both database format and embedded format
        if (match.event_id) {
          return transformMatch(match);
        } else {
          // Already in the correct format or needs minimal transformation
          return {
            id: match.id || `match_${Date.now()}_${Math.random()}`,
            eventId: match.eventId || eventId,
            tournamentId: match.tournamentId || tournamentData.id,
            round: match.round || 0,
            position: match.position || 0,
            team1: match.team1,
            team2: match.team2,
            score1: match.score1,
            score2: match.score2,
            winnerId: match.winnerId,
            completed: match.completed || false,
            scheduledTime: match.scheduledTime,
            courtId: match.courtId,
            stage: match.stage || 'GROUP',
            groupNumber: match.groupNumber,
            createdAt: match.createdAt || new Date().toISOString(),
            updatedAt: match.updatedAt || new Date().toISOString(),
          } as Match;
        }
      });

      const tournament = transformTournament(tournamentData, matches);
      tournament.isNewTournament = false;
      return tournament;

    } catch (error) {
      console.error(`General error in getByEventId for event ${eventId}:`, error);
      return null;
    }
  },

  // Add method to form automatic pairs from participants
  formTeamsFromParticipants: (
    participants: any[],
    teamFormationType: TeamFormationType,
    options?: { groupSize?: number }
  ): { teams: string[][]; metadata: any } => {
    const defaultGroupSize = options?.groupSize || 3;
    
    const result = createTournamentStructure(
      participants,
      teamFormationType,
      defaultGroupSize
    );

    return {
      teams: result.teams,
      metadata: result.metadata
    };
  },

  // Add the missing updateStatus method
  updateStatus: async (tournamentId: string, status: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({ 
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', tournamentId);

      if (error) {
        throw handleSupabaseError(error, 'updating tournament status');
      }
    } catch (error) {
      console.error('Error updating tournament status:', error);
      throw error;
    }
  },

  // Add the missing updateMatch method
  updateMatch: async (matchId: string, updates: Partial<Match>): Promise<Match> => {
    try {
      // Fetch the current match to preserve data
      const { data: currentMatch, error: fetchError } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('id', matchId)
        .single();
        
      if (fetchError) {
        console.error('Error fetching match data:', fetchError);
        throw new Error('Erro ao buscar dados da partida');
      }
      
      if (!currentMatch) {
        throw new Error('Partida não encontrada');
      }
      
      // Prepare the update object for the database
      // Be careful with the structure and keep the original team arrays
      const updateData = {
        ...(updates.score1 !== undefined && { score1: updates.score1 }),
        ...(updates.score2 !== undefined && { score2: updates.score2 }),
        ...(updates.winnerId !== undefined && { winner_id: updates.winnerId }),
        ...(updates.completed !== undefined && { completed: updates.completed }),
        ...(updates.courtId !== undefined && { court_id: updates.courtId }),
        ...(updates.scheduledTime !== undefined && { scheduled_time: updates.scheduledTime }),
        // Keep the group number as is - important for our issue
        ...(updates.groupNumber !== undefined && { group_number: updates.groupNumber })
      };
      
      try {
        // Update the match in the database
        const { data: updatedMatch, error } = await supabase
          .from('tournament_matches')
          .update(updateData)
          .eq('id', matchId)
          .select()
          .single();
        
        if (error) {
          console.error('Could not update in tournament_matches table:', error);
          throw new Error('Erro ao atualizar resultado da partida');
        }
        
        // Convert from snake_case to camelCase
        return {
          ...updatedMatch,
          tournamentId: updatedMatch.tournament_id,
          eventId: updatedMatch.event_id,
          winnerId: updatedMatch.winner_id,
          courtId: updatedMatch.court_id,
          scheduledTime: updatedMatch.scheduled_time,
          groupNumber: updatedMatch.group_number,
          // Preserve the team arrays as they are
          team1: updatedMatch.team1,
          team2: updatedMatch.team2
        } as Match;
        
      } catch (matchTableError) {
        console.error('Error updating match in tournament_matches table:', matchTableError);
        throw new Error('Erro ao atualizar resultado da partida');
      }
    } catch (error) {
      console.error('Error updating match:', error);
      throw error instanceof Error ? error : new Error('Erro desconhecido ao atualizar partida');
    }
  },

  // Add a specific method for updating match results
  updateMatchResults: async (matchId: string, score1: number, score2: number): Promise<Match> => {
    try {
      console.log(`Updating match results for ${matchId}: ${score1}-${score2}`);
      
      // Determine winner based on scores
      const winnerId = score1 > score2 ? 'team1' : 'team2';
      
      // First, check if the match exists in the database
      const { data: existingMatch, error: checkError } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('id', matchId)
        .maybeSingle();
      
      if (checkError) {
        console.error('Error checking if match exists:', checkError);
        throw new Error(`Erro ao verificar partida: ${checkError.message}`);
      }
      
      if (!existingMatch) {
        console.warn(`Match ${matchId} not found in database. This might be a match that exists only in memory.`);
        
        // Get current tournament from store
        const currentTournament = useTournamentStore.getState().tournament;
        
        if (currentTournament) {
          const matchInMemory = currentTournament.matches?.find(m => m.id === matchId);
          
          if (matchInMemory) {
            console.log('Found match in memory, attempting to insert it into database first...');
            
            try {
              // Insert the match into the database first
              const { data: insertedMatch, error: insertError } = await supabase
                .from('tournament_matches')
                .insert({
                  id: matchInMemory.id,
                  tournament_id: matchInMemory.tournamentId,
                  event_id: matchInMemory.eventId,
                  round: matchInMemory.round,
                  position: matchInMemory.position,
                  team1: matchInMemory.team1,
                  team2: matchInMemory.team2,
                  score1: score1, // Use the new scores
                  score2: score2,
                  winner_id: winnerId,
                  completed: true,
                  court_id: matchInMemory.courtId,
                  scheduled_time: matchInMemory.scheduledTime,
                  stage: matchInMemory.stage,
                  group_number: matchInMemory.groupNumber,
                  created_at: matchInMemory.createdAt || new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .select()
                .single();
            
            if (insertError) {
              console.error('Error inserting match:', insertError);
              throw new Error(`Erro ao inserir partida: ${insertError.message}`);
            }
            
            console.log('Match inserted successfully:', insertedMatch);
            
            // Transform and return the inserted match
            return {
              id: insertedMatch.id,
              eventId: insertedMatch.event_id,
              tournamentId: insertedMatch.tournament_id,
              round: insertedMatch.round,
              position: insertedMatch.position,
              team1: insertedMatch.team1,
              team2: insertedMatch.team2,
              score1: insertedMatch.score1,
              score2: insertedMatch.score2,
              winnerId: insertedMatch.winner_id,
              completed: insertedMatch.completed,
              scheduledTime: insertedMatch.scheduled_time,
              courtId: insertedMatch.court_id,
              stage: insertedMatch.stage,
              groupNumber: insertedMatch.group_number,
              createdAt: insertedMatch.created_at,
              updatedAt: insertedMatch.updated_at
            } as Match;
            
          } catch (insertError) {
            console.error('Failed to insert match into database:', insertError);
            // Fall back to updating in memory only
            throw new Error('Partida não encontrada no banco de dados e não foi possível criá-la.');
          }
        } else {
          throw new Error('Partida não encontrada nem no banco de dados nem na memória.');
        }
      } else {
        throw new Error('Não foi possível acessar os dados do torneio.');
      }
    }
    
    // If we reach here, the match exists in the database, proceed with update
    const updateData = {
      score1: score1,
      score2: score2,
      winner_id: winnerId,
      completed: true,
      updated_at: new Date().toISOString()
    };
    
    console.log('Update data:', updateData);
    
    // Update the match
    const { data: updatedMatch, error: updateError } = await supabase
      .from('tournament_matches')
      .update(updateData)
      .eq('id', matchId)
      .select('*')
      .single();
    
    if (updateError) {
      console.error('Error updating match:', updateError);
      
      // Handle specific error cases
      if (updateError.code === '406') {
        throw new Error('Erro de permissão: Você não tem autorização para atualizar esta partida.');
      }
      
      if (updateError.code === 'PGRST116') {
        throw new Error('Partida não encontrada durante a atualização.');
      }
      
      throw new Error(`Erro ao atualizar partida: ${updateError.message}`);
    }
    
    if (!updatedMatch) {
      throw new Error('Nenhum dado retornado após atualização');
    }
    
    console.log('Match updated successfully:', updatedMatch);
    
    // Transform the response to match our interface
    const transformedMatch: Match = {
      id: updatedMatch.id,
      eventId: updatedMatch.event_id,
      tournamentId: updatedMatch.tournament_id,
      round: updatedMatch.round,
      position: updatedMatch.position,
      team1: updatedMatch.team1,
      team2: updatedMatch.team2,
      score1: updatedMatch.score1,
      score2: updatedMatch.score2,
      winnerId: updatedMatch.winner_id,
      completed: updatedMatch.completed,
      scheduledTime: updatedMatch.scheduled_time,
      courtId: updatedMatch.court_id,
      stage: updatedMatch.stage,
      groupNumber: updatedMatch.group_number,
      createdAt: updatedMatch.created_at,
      updatedAt: updatedMatch.updated_at
    };
    
    return transformedMatch;
    
  } catch (error) {
    console.error('Error in updateMatchResults:', error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Erro desconhecido ao atualizar resultado da partida');
  }
},

  // Add method for updating match schedule
  updateMatchSchedule: async (matchId: string, courtId: string | null, scheduledTime: string | null): Promise<Match> => {
    try {
      const updates: Partial<Match> = {
        courtId,
        scheduledTime
      };

      return await TournamentService.updateMatch(matchId, updates);
    } catch (error) {
      console.error('Error updating match schedule:', error);
      throw error;
    }
  },

  generateTournamentStructure: async (
    eventId: string,
    teams: string[][],
    teamFormation: TeamFormationType,
    options: { groupSize?: number; forceReset?: boolean } = {}
  ): Promise<Tournament> => {
    console.log(`Generating structure for event ${eventId}, formation: ${teamFormation}`);
    
    try {
      const defaultGroupSize = options?.groupSize || 3;
      const { forceReset = false } = options;
      
      // Verificar se já existe um torneio PARA ESTE EVENTO ESPECÍFICO
      let existingTournament: Tournament | null = null;
      try {
        existingTournament = await TournamentService.getByEventId(eventId);
      } catch (e) {
        console.warn('Could not fetch existing tournament:', e);
      }

      let tournamentId: string;

      if (existingTournament) {
        // Se existe um torneio para ESTE evento e não foi solicitado reset, retornar erro
        if (!forceReset) {
          throw new Error(`Um torneio já existe para este evento (${eventId}). Use a opção "Recriar" para substituir o torneio existente.`);
        }

        console.log(`Force reset requested for event ${eventId}, recreating tournament`);
        
        // Deletar partidas existentes apenas deste torneio
        try {
          const { error: deleteMatchesError } = await supabase
            .from('tournament_matches')
            .delete()
            .eq('tournament_id', existingTournament.id);
          
          if (deleteMatchesError && deleteMatchesError.code !== '42P01') {
            console.warn('Could not delete existing matches:', deleteMatchesError);
          } else {
            console.log(`Deleted existing matches for tournament ${existingTournament.id}`);
          }
        } catch (deleteError) {
          console.warn('Could not delete existing matches (table may not exist):', deleteError);
        }

        // Atualizar o torneio existente ao invés de criar um novo
        const updateData: any = { 
          status: 'CREATED', 
          updated_at: new Date().toISOString(),
          settings: { 
            groupSize: defaultGroupSize,
            qualifiersPerGroup: 2
          },
          format: TournamentFormat.GROUP_STAGE_ELIMINATION,
          current_round: 0,
          groups_count: 0,
          matches_data: [],
          teams_data: [],
          standings_data: {},
          elimination_bracket: {}
        };

        const { data: updatedTournament, error: updateError } = await supabase
          .from('tournaments')
          .update(updateData)
          .eq('id', existingTournament.id)
          .select()
          .single();
        
        if (updateError) throw updateError;
        tournamentId = updatedTournament.id;
        console.log(`Reset tournament ${tournamentId} for event ${eventId}`);

      } else {
        // Criar novo torneio para este evento
        console.log(`Creating new tournament for event ${eventId}`);
        
        const insertData: any = {
          event_id: eventId,
          status: 'CREATED',
          format: TournamentFormat.GROUP_STAGE_ELIMINATION,
          settings: { 
            groupSize: defaultGroupSize,
            qualifiersPerGroup: 2
          },
          current_round: 0,
          groups_count: 0,
          matches_data: [],
          teams_data: [],
          standings_data: {},
          elimination_bracket: {}
        };

        const { data: newTournament, error: insertError } = await supabase
          .from('tournaments')
          .insert(insertData)
          .select()
          .single();
        
        if (insertError) throw insertError;
        tournamentId = newTournament.id;
        console.log(`Created new tournament ${tournamentId} for event ${eventId}`);
      }
      
      // Formar equipes
      const teamsData: Team[] = teams.map((participants, index) => ({
        id: `team_${index + 1}`,
        participants,
        seed: index + 1,
      }));

      // Distribuir em grupos
      const shuffledTeams = [...teamsData].sort(() => Math.random() - 0.5);
      const groups = distributeTeamsIntoGroups(
        shuffledTeams.map(t => t.participants), 
        defaultGroupSize
      );

      // Gerar partidas
      const matchesData: Match[] = [];
      groups.forEach((group, groupIndex) => {
        const groupNumber = groupIndex + 1;
        
        for (let i = 0; i < group.length; i++) {
          for (let j = i + 1; j < group.length; j++) {
            matchesData.push({
              id: generateUUID(),
              tournamentId: tournamentId,
              eventId: eventId,
              round: 0,
              position: matchesData.length,
              team1: group[i],
              team2: group[j],
              score1: null,
              score2: null,
              winnerId: null,
              completed: false,
              courtId: null,
              scheduledTime: null,
              stage: 'GROUP',
              groupNumber: groupNumber,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        }
      });

      // Tentar inserir partidas na tabela tournament_matches
      if (matchesData.length > 0) {
        try {
          const { error: insertMatchesError } = await supabase
            .from('tournament_matches')
            .insert(matchesData.map(match => ({
              id: match.id,
              tournament_id: match.tournamentId,
              event_id: match.eventId,
              round: match.round,
              position: match.position,
              team1: match.team1,
              team2: match.team2,
              score1: match.score1,
              score2: match.score2,
              winner_id: match.winnerId,
              completed: match.completed,
              court_id: match.courtId,
              scheduled_time: match.scheduledTime,
              stage: match.stage,
              group_number: match.groupNumber,
              created_at: match.createdAt,
              updated_at: match.updatedAt
            })));
            
          if (insertMatchesError && insertMatchesError.code === '42P01') {
            console.warn('tournament_matches table does not exist, storing matches in tournament data');
          } else if (insertMatchesError) {
            console.warn('Could not insert matches into tournament_matches:', insertMatchesError);
          } else {
            console.log(`Inserted ${matchesData.length} matches into tournament_matches table`);
          }
        } catch (matchError) {
          console.warn('Could not insert matches:', matchError);
        }
      }

      // Atualizar torneio com dados finais
      const { data: finalTournament, error: finalUpdateError } = await supabase
        .from('tournaments')
        .update({ 
          groups_count: groups.length,
          matches_data: matchesData,
          teams_data: teamsData,
          updated_at: new Date().toISOString()
        })
        .eq('id', tournamentId)
        .select()
        .single();

      if (finalUpdateError) throw finalUpdateError;

      const tournament = transformTournament(finalTournament, matchesData);
      tournament.isNewTournament = !existingTournament; // Só é novo se não existia antes
      
      console.log(`Tournament structure generated successfully for event ${eventId}`);
      return tournament;
      
    } catch (error) {
      console.error('Error generating tournament structure:', error);
      throw error;
    }
  },

  // Add method to generate elimination bracket
  generateEliminationBracket: async (tournamentId: string): Promise<Tournament> => {
    try {
      console.log(`Generating elimination bracket for tournament ${tournamentId}`);
      
      // First, fetch the current tournament with all matches
      const currentTournament = await TournamentService.fetchTournament(tournamentId);
      
      if (!currentTournament) {
        throw new Error('Torneio não encontrado');
      }
      
      // Check if group stage is complete
      const groupMatches = currentTournament.matches.filter(m => m.stage === 'GROUP');
      const completedGroupMatches = groupMatches.filter(m => m.completed);
      
      if (completedGroupMatches.length !== groupMatches.length) {
        throw new Error('Todas as partidas da fase de grupos devem estar concluídas antes de gerar a fase eliminatória');
      }
      
      // Calculate group rankings
      const matchesByGroup = groupMatches.reduce((acc, match) => {
        const groupNum = match.groupNumber || 0;
        if (!acc[groupNum]) acc[groupNum] = [];
        acc[groupNum].push(match);
        return acc;
      }, {} as Record<number, Match[]>);
      
      const groupRankings: Record<number, GroupRanking[]> = {};
      for (const [groupNum, matches] of Object.entries(matchesByGroup)) {
        groupRankings[parseInt(groupNum)] = calculateGroupRankings(matches);
      }
      
      // Generate elimination matches
      const eliminationMatches = generateEliminationBracket(groupRankings, 2);
      
      // Set tournament and event IDs for all matches
      eliminationMatches.forEach(match => {
        match.tournamentId = tournamentId;
        match.eventId = currentTournament.eventId;
      });
      
      // Try to insert elimination matches into the database
      try {
        const { data: insertedMatches, error: insertError } = await supabase
          .from('tournament_matches')
          .insert(eliminationMatches.map(toSupabaseMatch))
          .select();
        
        if (insertError) {
          console.warn('Could not insert elimination matches into database:', insertError);
        } else {
          console.log(`Inserted ${insertedMatches?.length ?? 0} elimination matches`);
        }
      } catch (matchError) {
        console.warn('Could not insert elimination matches:', matchError);
      }
        // Update tournament status
      try {
        await TournamentService.updateStatus(tournamentId, 'STARTED'); // Changed: Use 'STARTED' as a valid tournament_status value
      } catch (statusError) {
        console.warn('Could not update tournament status:', statusError);
      }
      
      // Return updated tournament
      const updatedTournament: Tournament = {
        ...currentTournament,
        matches: [...currentTournament.matches, ...eliminationMatches],
        status: 'STARTED' // Changed: Use 'STARTED' as a valid tournament_status value
      };
      
      console.log(`Elimination bracket generated with ${eliminationMatches.length} matches`);
      return updatedTournament;
      
    } catch (error) {
      console.error('Error generating elimination bracket:', error);
      throw error;
    }
  },

  // Add method to update elimination bracket after match completion
  updateEliminationBracket: async (tournamentId: string, completedMatchId: string): Promise<Tournament> => {
    try {
      console.log(`Updating elimination bracket for tournament ${tournamentId} after match ${completedMatchId}`);
      
      // Fetch current tournament
      const currentTournament = await TournamentService.fetchTournament(tournamentId);
      
      if (!currentTournament) {
        throw new Error('Torneio não encontrado');
      }
      
      // Find the completed match
      const completedMatch = currentTournament.matches.find(m => m.id === completedMatchId);
      
      if (!completedMatch || !completedMatch.completed || !completedMatch.winnerId) {
        throw new Error('Partida não encontrada ou não concluída');
      }
      
      // Determine winner team
      const winnerTeamId = completedMatch.winnerId === 'team1' ? completedMatch.team1 : completedMatch.team2;
      
      if (!winnerTeamId) {
        throw new Error('Vencedor não identificado');
      }
      
      // Update elimination bracket
      const updatedMatches = updateEliminationBracket(
        currentTournament.matches,
        completedMatchId,
        completedMatch.winnerId,
        winnerTeamId
      );
      
      // Find matches that were updated
      const matchesToUpdate = updatedMatches.filter(match => {
        const originalMatch = currentTournament.matches.find(m => m.id === match.id);
        return originalMatch && (
          JSON.stringify(originalMatch.team1) !== JSON.stringify(match.team1) ||
          JSON.stringify(originalMatch.team2) !== JSON.stringify(match.team2)
        );
      });
      
      // Update matches in database
      for (const match of matchesToUpdate) {
        try {
          await TournamentService.updateMatch(match.id, {
            team1: match.team1,
            team2: match.team2
          });
        } catch (updateError) {
          console.warn(`Could not update match ${match.id}:`, updateError);
        }
      }
      
      // Return updated tournament
      const updatedTournament: Tournament = {
        ...currentTournament,
        matches: updatedMatches
      };
      
      console.log(`Elimination bracket updated, ${matchesToUpdate.length} matches modified`);
      return updatedTournament;
      
    } catch (error) {
      console.error('Error updating elimination bracket:', error);
      throw error;
    }
  },

  // Add method to fetch tournament with matches
  fetchTournament: async (tournamentId: string): Promise<Tournament | null> => {
    try {
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .maybeSingle();

      if (tournamentError) {
        console.error(`Error fetching tournament ${tournamentId}:`, tournamentError);
        return null;
      }

      if (!tournamentData) {
        console.log(`Tournament ${tournamentId} not found`);
        return null;
      }

      // Fetch matches if table exists
      let matchesData: any[] = [];
      try {
        const { data: matches, error: matchesError } = await supabase
          .from('tournament_matches')
          .select('*')
          .eq('tournament_id', tournamentId)
          .order('stage', { ascending: true })
          .order('group_number', { ascending: true, nullsFirst: true })
          .order('round', { ascending: true })
          .order('position', { ascending: true });

        if (matchesError) {
          if (matchesError.code === '42P01') {
            console.warn('tournament_matches table does not exist');
          } else {
            throw matchesError;
          }
        } else {
          matchesData = matches || [];
        }
      } catch (matchError) {
        console.warn('Could not fetch tournament matches:', matchError);
      }

      // Transform matches
      const matches = matchesData.map((match: any) => transformMatch(match));

      return transformTournament(tournamentData, matches);
    } catch (error) {
      console.error('Error fetching tournament:', error);
      throw error;
    }
  },

  // Update the advanced method to handle bilateral brackets
  advanceWinner: async (match: Match): Promise<void> => {
    // Don't advance if not elimination stage, no winner, or no teams
    if (match.stage !== 'ELIMINATION' || !match.winnerId || !match.team1 || !match.team2) {
      return;
    }

    const winnerTeam = match.winnerId === 'team1' ? match.team1 : match.team2;
    if (!winnerTeam) return;

    // Get match metadata to determine bracket side
    const { data: matchWithMetadata, error: getError } = await supabase
      .from('tournament_matches')
      .select('id, metadata')
      .eq('id', match.id)
      .single();

    if (getError) {
      console.error('Error getting match metadata:', getError);
      // Continue with default behavior if we can't get metadata
    }

    const side = matchWithMetadata?.metadata?.side || null;
    const nextRound = match.round + 1;
    const nextPosition = Math.ceil(match.position / 2);

    try {
      // If this is the final round of a side, the winner advances to the final match
      const { data: finalRoundMatches, error: finalRoundError } = await supabase
        .from('tournament_matches')
        .select('round')
        .eq('tournament_id', match.tournamentId)
        .eq('stage', 'ELIMINATION')
        .order('round', { ascending: false })
        .limit(1);

      if (finalRoundError) throw finalRoundError;

      const maxRound = finalRoundMatches.length > 0 ? finalRoundMatches[0].round : null;
      
      // Handle the special case for advancing to the final
      if (maxRound && side && nextRound === maxRound) {
        // This is a semi-final, so find the final match
        const { data: finalMatch, error: findFinalError } = await supabase
          .from('tournament_matches')
          .select('id, team1, team2')
          .eq('tournament_id', match.tournamentId)
          .eq('round', maxRound)
          .eq('position', 1)
          .single();

        if (findFinalError && findFinalError.code !== 'PGRST116') throw findFinalError;
        
        if (finalMatch) {
          // Update the correct side of the final match
          const teamField = side === 'left' ? 'team1' : 'team2';
          
          const { error: updateError } = await supabase
            .from('tournament_matches')
            .update({ [teamField]: winnerTeam })
            .eq('id', finalMatch.id);

          if (updateError) throw updateError;
          
          console.log(`Advanced winner from ${match.id} (${side} side) to the final match ${finalMatch.id}`);
          return;
        }
      }

      // Standard advancement within the same side
      const { data: nextMatch, error: findError } = await supabase
        .from('tournament_matches')
        .select('id, team1, team2, metadata')
        .eq('tournament_id', match.tournamentId)
        .eq('round', nextRound)
        .eq('position', nextPosition);

      if (findError) throw findError;
      
      // Find the next match on the same side
      const sameNextMatch = nextMatch?.find(m => 
        !side || !m.metadata?.side || m.metadata?.side === side
      );
      
      if (sameNextMatch) {
        const updateField = match.position % 2 === 1 ? 'team1' : 'team2';
        
        const { error: updateError } = await supabase
          .from('tournament_matches')
          .update({ [updateField]: winnerTeam })
          .eq('id', sameNextMatch.id);

        if (updateError) throw updateError;
        
        console.log(`Advanced winner from match ${match.id} to match ${sameNextMatch.id} (${updateField})`);
      }

    } catch (error) {
      console.error('Error advancing winner:', error);
      throw error;
    }
  },

  // Add this method to synchronize matches
  syncMatchesToDatabase: async (tournamentId: string): Promise<void> => {
    try {
      console.log(`Syncing matches to database for tournament ${tournamentId}`);
      
      // Get current tournament from store
      const currentTournament = useTournamentStore.getState().tournament;
      
      if (!currentTournament || !currentTournament.matches) {
        console.warn('No tournament or matches found in memory to sync');
        return;
      }
      
      // Get existing matches from database
      const { data: existingMatches, error: fetchError } = await supabase
        .from('tournament_matches')
        .select('id')
        .eq('tournament_id', tournamentId);
      
      if (fetchError) {
        console.error('Error fetching existing matches:', fetchError);
        return;
      }
      
      const existingMatchIds = new Set(existingMatches?.map(m => m.id) || []);
      
      // Find matches that exist in memory but not in database
      const matchesToInsert = currentTournament.matches.filter(match => 
        !existingMatchIds.has(match.id)
      );
      
      if (matchesToInsert.length > 0) {
        console.log(`Inserting ${matchesToInsert.length} missing matches into database`);
        
        const { error: insertError } = await supabase
          .from('tournament_matches')
          .insert(matchesToInsert.map(match => ({
            id: match.id,
            tournament_id: match.tournamentId,
            event_id: match.eventId,
            round: match.round,
            position: match.position,
            team1: match.team1,
            team2: match.team2,
            score1: match.score1,
            score2: match.score2,
            winner_id: match.winnerId,
            completed: match.completed,
            court_id: match.courtId,
            scheduled_time: match.scheduledTime,
            stage: match.stage,
            group_number: match.groupNumber,
            created_at: match.createdAt || new Date().toISOString(),
            updated_at: match.updatedAt || new Date().toISOString()
          })));
        
        if (insertError) {
          console.error('Error inserting missing matches:', insertError);
        } else {
          console.log('Successfully synced matches to database');
        }
      } else {
        console.log('All matches are already synchronized with database');
      }
      
    } catch (error) {
      console.error('Error syncing matches to database:', error);
    }
  },
};

export const TournamentServiceV2 = {
  async getByEventId(eventId: string): Promise<TournamentV2 | null> {
    const { data, error } = await supabase
      .from('tournaments_v2')
      .select('*')
      .eq('event_id', eventId)
      .maybeSingle();

    if (error || !data) return null;
    return transformTournamentV2(data);
  },

  async create(tournament: Partial<TournamentV2>): Promise<TournamentV2> {
    const tournamentData: TournamentData = {
      settings: {
        groupSize: 4,
        qualifiersPerGroup: 2,
        thirdPlaceMatch: true,
        autoAdvance: false,
        ...tournament.tournamentData?.settings
      },
      groups: [],
      matches: [],
      brackets: [],
      statistics: {},
      metadata: {},
      ...tournament.tournamentData
    };

    const { data, error } = await supabase
      .from('tournaments_v2')
      .insert({
        ...toSupabaseTournamentV2(tournament),
        tournament_data: tournamentData
      })
      .select()
      .single();

    if (error) throw error;
    return transformTournamentV2(data);
  },

  async addMatch(tournamentId: string, match: Match): Promise<boolean> {
    const { error } = await supabase.rpc('add_match_to_tournament', {
      tournament_id: tournamentId,
      match_data: match
    });

    return !error;
  },

  async updateMatch(tournamentId: string, matchId: string, matchData: Partial<Match>): Promise<boolean> {
    const { error } = await supabase.rpc('update_match_in_tournament', {
      tournament_id: tournamentId,
      match_id: matchId,
      new_match_data: matchData
    });

    return !error;
  }
};
