import { supabase } from '../lib/supabase';
import { Tournament, Match, TeamFormationType, TournamentFormat } from '../types';
import { calculateGroupRankings, GroupRanking } from '../utils/rankingUtils';
import { createTwoSidedBracket, BracketSidesMetadata } from '../utils/bracketSidesUtil';
import { distributeTeamsIntoGroups } from '../utils/groupFormationUtils';
import { BracketPosition } from '../utils/bracketUtils';
import { useTournamentStore } from '../store/tournamentStore';

// Interface for potential tournament settings
interface TournamentSettings {
  qualifiersPerGroup?: number;
  groupSize?: number;
  // Add other settings as needed
}

// Helper function to handle Supabase errors with more details
const handleSupabaseError = (error: any, context: string) => {
  console.error(`Error in ${context}:`, error);
  
  let message = `Error in ${context}`;
  if (error.message) {
    message += `: ${error.message}`;
  }
  if (error.details) {
    message += ` - ${error.details}`;
  }
  if (error.hint) {
    message += ` (Hint: ${error.hint})`;
  }
  
  throw new Error(message);
};

// Add the transformTournament function
const transformTournament = (data: any): Tournament => ({
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
  
  // Para compatibilidade
  matches: data.matches_data || [],
  teamFormation: data.team_formation || TeamFormationType.FORMED,
  isNewTournament: data.isNewTournament || false,
});

// Helper function to generate round robin matches for a group
const generateGroupMatches = (
  tournamentId: string,
  eventId: string,
  groupNumber: number,
  teams: string[][]
): Omit<Match, 'id' | 'createdAt' | 'updatedAt'>[] => {
  const matches: Omit<Match, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  if (teams.length < 2) return matches;

  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matches.push({
        tournamentId: tournamentId,
        eventId: eventId,
        round: 0,
        position: 0,
        team1: teams[i],
        team2: teams[j],
        score1: null,
        score2: null,
        winnerId: null,
        completed: false,
        courtId: null,
        scheduledTime: null,
        stage: 'GROUP',
        groupNumber: groupNumber,
      });
    }
  }
  return matches;
};

// Helper function to form automatic pairs from participants
const formAutomaticPairs = (participants: any[]): string[][] => {
  const teams: string[][] = [];
  
  // Primeiro, formar duplas com base em parceiros pré-definidos
  const pairedParticipants = new Set<string>();
  
  participants.forEach(participant => {
    if (pairedParticipants.has(participant.id)) return;
    
    // Se o participante tem um parceiro definido
    if (participant.partnerId) {
      const partner = participants.find(p => p.id === participant.partnerId);
      if (partner && !pairedParticipants.has(partner.id)) {
        teams.push([participant.id, partner.id]);
        pairedParticipants.add(participant.id);
        pairedParticipants.add(partner.id);
        console.log(`Dupla formada: ${participant.name} + ${partner.name}`);
      }
    }
  });
  
  // Para participantes restantes sem parceiro, formar duplas automaticamente
  const remainingParticipants = participants.filter(p => !pairedParticipants.has(p.id));
  console.log(`${remainingParticipants.length} participantes sem dupla definida, formando duplas automaticamente...`);
  
  // Embaralhar para formar duplas aleatórias
  const shuffled = [...remainingParticipants].sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < shuffled.length - 1; i += 2) {
    teams.push([shuffled[i].id, shuffled[i + 1].id]);
    console.log(`Dupla automática formada: ${shuffled[i].name} + ${shuffled[i + 1].name}`);
  }
  
  // Se sobrar um participante ímpar, formar uma dupla "BYE" ou permitir individual
  if (shuffled.length % 2 === 1) {
    const lastParticipant = shuffled[shuffled.length - 1];
    teams.push([lastParticipant.id]);
    console.log(`Participante individual (BYE): ${lastParticipant.name}`);
  }
  
  console.log(`Total de ${teams.length} duplas/times formados`);
  return teams;
};

export const TournamentService = {
  // Método atualizado para trabalhar exclusivamente com JSONB
  async getByEventId(eventId: string): Promise<Tournament | null> {
    try {
      console.log(`🔍 Fetching tournament for event ${eventId}...`);
      
      // Busca o torneio com todos os dados JSONB
      const { data: tournament, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching tournament:', error.message);
        return null;
      }
      
      if (!tournament) {
        console.log(`No tournament found for event ${eventId}`);
        return null;
      }

      console.log(`📊 Tournament found: ${tournament.id}, status: ${tournament.status}`);
      console.log(`📊 JSONB matches_data length: ${tournament.matches_data?.length || 0}`);

      // Use transformTournament para criar o objeto Tournament correto
      // transformTournament já configura matches = data.matches_data
      const transformedTournament = transformTournament(tournament);
      transformedTournament.isNewTournament = false;

      // Log para debug
      console.log(`✅ Tournament transformed with ${transformedTournament.matches?.length || 0} matches`);
      
      if (transformedTournament.matches && transformedTournament.matches.length > 0) {
        const completedMatches = transformedTournament.matches.filter(m => m.completed).length;
        console.log(`📈 Matches status: ${completedMatches}/${transformedTournament.matches.length} completed`);
      }

      return transformedTournament;
    } catch (error) {
      console.error('Error in getByEventId:', error);
      return null;
    }
  },

  async updateMatchInTournament(tournamentId: string, matchId: string, updates: Partial<Match>): Promise<void> {
    // Buscar torneio atual
    const { data: tournament, error: fetchError } = await supabase
      .from('tournaments')
      .select('matches_data')
      .eq('id', tournamentId)
      .single();

    if (fetchError) throw fetchError;

    // Atualizar partida no array JSON
    const updatedMatches = tournament.matches_data.map((match: any) => 
      match.id === matchId ? { ...match, ...updates } : match
    );

    // Salvar de volta
    const { error: updateError } = await supabase
      .from('tournaments')
      .update({ matches_data: updatedMatches })
      .eq('id', tournamentId);

    if (updateError) throw updateError;
  },

  // Adicionar lógica para diferenciar duplas formadas e aleatórias
  differentiateTeams: (
    teams: string[][],
    teamFormationType: TeamFormationType
  ): { formedTeams: string[][]; randomTeams: string[][] } => {
    const formedTeams: string[][] = [];
    const randomTeams: string[][] = [];

    teams.forEach((team) => {
      if (teamFormationType === TeamFormationType.FORMED) {
        formedTeams.push(team);
      } else {
        randomTeams.push(team);
      }
    });

    return { formedTeams, randomTeams };
  },

  // Integrar formedTeams e randomTeams na lógica de geração do torneio
  generateTournamentStructure: async (
    eventId: string,
    teams: string[][],
    teamFormationType: TeamFormationType,
    options: { groupSize?: number; forceReset?: boolean } = {}
  ): Promise<Tournament> => {
    console.log(`Generating structure for event ${eventId}, formation: ${teamFormationType}, options:`, options);

    const { formedTeams, randomTeams } = TournamentService.differentiateTeams(teams, teamFormationType);

    if (teamFormationType === TeamFormationType.FORMED) {
      console.log('Processing formed teams:', formedTeams);
    } else {
      console.log('Processing random teams:', randomTeams);
    }

    const defaultGroupSize = options?.groupSize || 3;
    const { forceReset = false } = options;

    try {
      if (!eventId || !teams || teams.length < 2) {
        throw new Error("É necessário pelo menos 2 times/duplas para gerar o torneio");
      }

      let existingTournament: Tournament | null = null;
      try {
        existingTournament = await TournamentService.getByEventId(eventId);
      } catch (e) {
        console.warn('Could not fetch existing tournament:', e);
      }

      let tournamentId: string;

      if (existingTournament) {
        if (!forceReset) {
          throw new Error("Um torneio já existe para este evento. Use forceReset para recriar.");
        }

        // Try to delete existing matches if table exists
        try {
          const { error: deleteMatchesError } = await supabase
            .from('tournament_matches')
            .delete()
            .eq('tournament_id', existingTournament.id);
          
          if (deleteMatchesError && deleteMatchesError.code !== '42P01') {
            throw deleteMatchesError;
          }
        } catch (deleteError) {
          console.warn('Could not delete existing matches (table may not exist):', deleteError);
        }

        // Update tournament with only existing columns
        const updateData: any = { 
          status: 'CREATED', 
          updated_at: new Date().toISOString(),
          settings: { 
            groupSize: defaultGroupSize,
            qualifiersPerGroup: 2
          },
          format: TournamentFormat.GROUP_STAGE_ELIMINATION // Use enum instead of string
        };

        const { data: updatedTournament, error: updateError } = await supabase
          .from('tournaments')
          .update(updateData)
          .eq('id', existingTournament.id)
          .select()
          .single();
        
        if (updateError) throw updateError;
        tournamentId = updatedTournament.id;

      } else {
        // Create new tournament
        const insertData: any = {
          event_id: eventId,
          status: 'CREATED',
          format: TournamentFormat.GROUP_STAGE_ELIMINATION, // Use enum instead of string
          settings: { 
            groupSize: defaultGroupSize,
            qualifiersPerGroup: 2
          }
        };

        const { data: newTournament, error: insertError } = await supabase
          .from('tournaments')
          .insert(insertData)
          .select()
          .single();
        
        if (insertError) throw insertError;
        tournamentId = newTournament.id;
      }
      
      // Generate groups and matches
      const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
      const groups = distributeTeamsIntoGroups(shuffledTeams, defaultGroupSize);

      const allGroupMatches: Omit<Match, 'id' | 'createdAt' | 'updatedAt'>[] = [];
      groups.forEach((group, index) => {
        const groupNumber = index + 1;
        const groupMatches = generateGroupMatches(tournamentId, eventId, groupNumber, group);
        allGroupMatches.push(...groupMatches);
      });

      // Try to insert matches if table exists
      if (allGroupMatches.length > 0) {
        try {
          const { error: insertMatchesError } = await supabase
            .from('tournament_matches')
            .insert(allGroupMatches.map(match => ({
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
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })));
          if (insertMatchesError && insertMatchesError.code === '42P01') {
            console.warn('tournament_matches table does not exist, skipping match insertion');
          } else if (insertMatchesError) {
            throw insertMatchesError;
          }
        } catch (matchError) {
          console.warn('Could not insert matches:', matchError);
        }
      }

      // Return the created tournament
      const finalTournament = await TournamentService.getByEventId(eventId);
      if (!finalTournament) {
        // Fallback: create a complete tournament object
        return {
          id: tournamentId,
          eventId: eventId,
          format: TournamentFormat.GROUP_STAGE_ELIMINATION,
          status: 'CREATED',
          currentRound: 0,
          groupsCount: groups.length,
          groupsData: {},
          bracketsData: {},
          thirdPlaceMatch: true,
          autoAdvance: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          matchesData: [],
          teamsData: [],
          standingsData: {},
          eliminationBracket: {},
          matches: [],
          settings: { groupSize: defaultGroupSize, qualifiersPerGroup: 2 },
          teamFormation: teamFormationType,
          isNewTournament: true
        };
      }

      finalTournament.isNewTournament = true;
      return finalTournament;

    } catch (error) {
      console.error('Error in generateTournamentStructure:', error);
      throw error;
    }
  },

  generateEliminationBracket: async (tournamentId: string): Promise<Tournament> => {
    console.log(`Generating elimination bracket for tournament ${tournamentId}`);
    try {
      // Get tournament data
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();
        
      if (tournamentError) throw tournamentError;
      if (!tournamentData) throw new Error("Tournament not found");

      // Return a complete tournament structure
      const basicTournament: Tournament = {
        id: tournamentId,
        eventId: tournamentData.event_id,
        format: tournamentData.format || TournamentFormat.GROUP_STAGE_ELIMINATION,
        status: 'STARTED',
        currentRound: 0,
        groupsCount: tournamentData.groups_count || 0,
        groupsData: tournamentData.groups_data || {},
        bracketsData: tournamentData.brackets_data || {},
        thirdPlaceMatch: tournamentData.third_place_match ?? true,
        autoAdvance: tournamentData.auto_advance ?? false,
        startedAt: tournamentData.started_at,
        completedAt: tournamentData.completed_at,
        createdAt: tournamentData.created_at,
        updatedAt: tournamentData.updated_at,
        matchesData: [],
        teamsData: [],
        standingsData: {},
        eliminationBracket: {},
        matches: [],
        settings: tournamentData.settings || { groupSize: 3, qualifiersPerGroup: 2 },
        teamFormation: tournamentData.team_formation || TeamFormationType.FORMED,
        isNewTournament: false
      };

      return basicTournament;
    } catch (error) {
      console.error('Error in generateEliminationBracket:', error);
      throw error;
    }
  },

  generateTwoSidedEliminationBracket: async (
    tournamentId: string, 
    bracketSidesMetadata: BracketSidesMetadata
  ): Promise<Tournament> => {
    console.log(`Generating two-sided elimination bracket for tournament ${tournamentId}`);
    try {
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();
      if (tournamentError) throw tournamentError;
      if (!tournamentData) throw new Error("Tournament not found");

      // Delete any existing elimination matches
      const { error: deleteError } = await supabase
        .from('tournament_matches')
        .delete()
        .eq('tournament_id', tournamentId)
        .eq('stage', 'ELIMINATION');
      if (deleteError) throw deleteError;

      // Create the two-sided bracket structure
      const eliminationMatches = createTwoSidedBracket(
        tournamentId,
        tournamentData.event_id,
        bracketSidesMetadata
      );

      if (eliminationMatches.length > 0) {
        // Insert the elimination matches
        const { error: insertError } = await supabase
          .from('tournament_matches')
          .insert(eliminationMatches.map(match => ({
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
          })));
        if (insertError) throw insertError;
      }

      // Update tournament status
      const { error: updateError } = await supabase
        .from('tournaments')
        .update({
          status: 'ELIMINATION',
          updated_at: new Date().toISOString()
        })
        .eq('id', tournamentId);
      if (updateError) throw updateError;

      // Return the updated tournament
      const updatedTournament = await TournamentService.getByEventId(tournamentData.event_id);
      if (!updatedTournament) {
        throw new Error("Failed to fetch updated tournament data");
      }
      return updatedTournament;
    } catch (error) {
      handleSupabaseError(error, 'generateTwoSidedEliminationBracket');
      throw error;
    }
  },

  updateMatch: async (matchId: string, score1: number, score2: number): Promise<Match> => {
    try {
      console.log(`Updating match ${matchId} with scores: ${score1}-${score2}`);

      // Determinar vencedor baseado nos scores (garantir que não há empate)
      let winnerId: 'team1' | 'team2' | null = null;
      if (score1 > score2) {
        winnerId = 'team1';
        console.log("Winner determined: team1");
      } else if (score2 > score1) {
        winnerId = 'team2';
        console.log("Winner determined: team2");
      } else {
        throw new Error("Empate não é permitido. Um time deve vencer a partida.");
      }

      // Dados para atualizar
      const updateData = {
        score1,
        score2,
        winner_id: winnerId,
        completed: true, // Garantir que a partida é marcada como concluída
        updated_at: new Date().toISOString()
      };
      console.log("Update data:", updateData);

      const { data, error } = await supabase
        .from('tournament_matches')
        .update(updateData)
        .eq('id', matchId)
        .select('*')
        .single();

      if (error) {
        console.error("Error updating match:", error);
        throw handleSupabaseError(error, 'updating match');
      }
      
      if (!data) {
        throw new Error("Falha ao atualizar partida - nenhum dado retornado");
      }

      console.log("Match updated successfully:", data);
      
      // Atualizar também os dados em memória usando o store adequadamente
      const tournamentStore = useTournamentStore.getState();
      if (tournamentStore.tournament && tournamentStore.tournament.matches) {
        const updatedMatches = tournamentStore.tournament.matches.map(m => 
          m.id === matchId ? {...m, score1, score2, winnerId, completed: true} : m
        );
        
        // Usar setState com tipagem adequada
        useTournamentStore.setState((state) => ({
          ...state,
          tournament: state.tournament ? {...state.tournament, matches: updatedMatches} : null
        }));
      }

      // Avançar vencedor se necessário
      if (winnerId) {
        await TournamentService.advanceWinner(data as Match);
      }

      return data as Match;
    } catch (error) {
      console.error('Error in updateMatch:', error);
      throw error;
    }
  },

  advanceWinner: async (match: any): Promise<void> => {
    // Não avança o vencedor se não for fase eliminatória, não tiver vencedor ou não tiver times
    if (match.stage !== 'ELIMINATION' || !match.winner_id || !match.team1 || !match.team2) {
      return;
    }

    const winnerTeam = match.winner_id === 'team1' ? match.team1 : match.team2;
    if (!winnerTeam) return;

    const nextRound = match.round + 1;
    const nextPosition = Math.ceil(match.position / 2);

    try {
      const { data: nextMatch, error: findError } = await supabase
        .from('tournament_matches')
        .select('id, team1, team2')
        .eq('tournament_id', match.tournament_id)
        .eq('round', nextRound)
        .eq('position', nextPosition)
        .eq('stage', 'ELIMINATION')
        .single();

      if (findError && findError.code !== 'PGRST116') throw findError;
      if (!nextMatch) {
        return;
      }

      const updateData: { team1?: string[]; team2?: string[] } = {};
      if (match.position % 2 === 1) {
        updateData.team1 = winnerTeam;
      } else {
        updateData.team2 = winnerTeam;
      }

      const { error: updateError } = await supabase
        .from('tournament_matches')
        .update(updateData)
        .eq('id', nextMatch.id);

      if (updateError) throw updateError;

    } catch (error) {
      handleSupabaseError(error, 'advanceWinner');
      throw error;
    }
  },

  checkTournamentCompletion: async (tournamentId: string): Promise<void> => {
    try {
      const { data: finalMatch, error: finalMatchError } = await supabase
        .from('tournament_matches')
        .select('completed')
        .eq('tournament_id', tournamentId)
        .eq('stage', 'ELIMINATION')
        .order('round', { ascending: false })
        .order('position', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (finalMatchError) throw finalMatchError;

      if (finalMatch && finalMatch.completed) {
        await TournamentService.updateStatus(tournamentId, 'FINISHED');
      }
    } catch (error) {
      handleSupabaseError(error, 'checkTournamentCompletion');
    }
  },

  updateStatus: async (tournamentId: string, status: 'CREATED' | 'STARTED' | 'FINISHED' | 'CANCELLED'): Promise<Tournament> => {
    try {
      const { data: updatedTournament, error } = await supabase
        .from('tournaments')
        .update({ status: status, updated_at: new Date().toISOString() })
        .eq('id', tournamentId)
        .select()
        .single();

      if (error) throw error;
      return transformTournament(updatedTournament);
    } catch (error) {
      handleSupabaseError(error, 'updateStatus');
      throw error;
    }
  },

  assignCourtToMatch: async (matchId: string, courtId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('tournament_matches')
        .update({ court_id: courtId, updated_at: new Date().toISOString() })
        .eq('id', matchId);

      if (error) throw error;
    } catch (error) {
      handleSupabaseError(error, 'assignCourtToMatch');
      throw error;
    }
  },

  updateMatchSchedule: async (matchId: string, courtId: string | null, scheduledTime: string | null): Promise<Match> => {
    try {
      const { data: updatedMatch, error } = await supabase
        .from('tournament_matches')
        .update({
          court_id: courtId,
          scheduled_time: scheduledTime,
          updated_at: new Date().toISOString()
        })
        .eq('id', matchId)
        .select()
        .single();

      if (error) throw error;
      return updatedMatch;
    } catch (error) {
      handleSupabaseError(error, 'updateMatchSchedule');
      throw error;
    }
  },

  // Método para formar equipes a partir de participantes
  formTeamsFromParticipants: (
    participants: any[],
    teamFormationType: TeamFormationType,
    options: { groupSize?: number } = {}
  ): { teams: string[][]; metadata: { formedPairs: number; autoPairs: number; singlePlayers: number } } => {
    console.log('Forming teams from participants:', participants.length, 'participants, Type:', teamFormationType);
    
    if (teamFormationType === TeamFormationType.FORMED) {
      // Para duplas formadas, usar formação automática que respeita parcerias + auto-forma as restantes
      const teams = formAutomaticPairs(participants);
      
      // Calcular estatísticas
      const formedPairs = participants.filter(p => p.partnerId).length / 2;
      const autoPairs = teams.filter(t => t.length === 2).length - formedPairs;
      const singlePlayers = teams.filter(t => t.length === 1).length;
      
      return { 
        teams, 
        metadata: { 
          formedPairs: Math.floor(formedPairs), 
          autoPairs: Math.floor(autoPairs), 
          singlePlayers 
        } 
      };
    } else if (teamFormationType === TeamFormationType.MANUAL) {
      // Para modo manual, formar duplas com base nos dados manuais dos participantes
      const teams: string[][] = [];
      const processedParticipants = new Set<string>();
      
      // Primeiro, formar duplas com parceiros manuais definidos
      participants.forEach(participant => {
        if (processedParticipants.has(participant.id)) return;
        
        const metadata = participant.metadata || {};
        const manualPartnerName = metadata.manualPartnerName;
        
        if (manualPartnerName) {
          // Procurar o parceiro pelos metadados ou pelo nome
          const partner = participants.find(p => 
            !processedParticipants.has(p.id) && 
            (p.name === manualPartnerName || p.metadata?.manualPartnerName === participant.name)
          );
          
          if (partner) {
            teams.push([participant.id, partner.id]);
            processedParticipants.add(participant.id);
            processedParticipants.add(partner.id);
          }
        }
      });
      
      // Depois, formar duplas com os participantes restantes
      const remainingParticipants = participants.filter(p => !processedParticipants.has(p.id));
      for (let i = 0; i < remainingParticipants.length - 1; i += 2) {
        teams.push([remainingParticipants[i].id, remainingParticipants[i + 1].id]);
      }
      
      // Se sobrar um participante ímpar, criar uma "dupla" só com ele
      if (remainingParticipants.length % 2 === 1) {
        teams.push([remainingParticipants[remainingParticipants.length - 1].id]);
      }
      
      return { 
        teams, 
        metadata: { 
          formedPairs: teams.filter(t => t.length === 2).length, 
          autoPairs: 0, 
          singlePlayers: teams.filter(t => t.length === 1).length 
        } 
      };
    } else {
      // Para duplas aleatórias, embaralhar completamente
      const shuffled = [...participants].sort(() => Math.random() - 0.5);
      const teams: string[][] = [];
      
      for (let i = 0; i < shuffled.length - 1; i += 2) {
        teams.push([shuffled[i].id, shuffled[i + 1].id]);
      }
      
      // Se sobrar um participante ímpar, criar um time individual
      if (shuffled.length % 2 === 1) {
        teams.push([shuffled[shuffled.length - 1].id]);
      }
      
      console.log('Formed random teams:', teams.length);
      return { 
        teams, 
        metadata: { 
          formedPairs: 0, 
          autoPairs: teams.filter(t => t.length === 2).length, 
          singlePlayers: teams.filter(t => t.length === 1).length 
        } 
      };
    }
  },

  // Função para ajustar grupos com sobras automaticamente
  adjustGroupsWithLeftovers: (
    groups: string[][][],
    defaultGroupSize: number
  ): string[][][] => {
    const adjustedGroups = [...groups];

    // Verificar se há sobras
    const leftovers = adjustedGroups.find(group => group.length < defaultGroupSize);
    if (leftovers) {
      // Redistribuir sobras para outros grupos
      adjustedGroups.forEach(group => {
        while (group.length < defaultGroupSize && leftovers.length > 0) {
          group.push(leftovers.pop()!);
        }
      });

      // Se ainda houver sobras, criar um novo grupo
      if (leftovers.length > 0) {
        adjustedGroups.push([...leftovers]);
      }
    }

    return adjustedGroups;
  },

  // Função para calcular pontos proporcionais com base no número de jogos
  calculateProportionalPoints: (
    matches: Match[],
    totalGames: number
  ): Record<string, number> => {
    const points: Record<string, number> = {};

    matches.forEach((match) => {
      if (!match.team1 || !match.team2) return;

      const team1Key = match.team1.join('|');
      const team2Key = match.team2.join('|');

      const team1Points = (match.score1 || 0) / totalGames;
      const team2Points = (match.score2 || 0) / totalGames;

      points[team1Key] = (points[team1Key] || 0) + team1Points;
      points[team2Key] = (points[team2Key] || 0) + team2Points;
    });

    return points;
  },

  // Função para criar chaveamento dividido em dois lados
  createTwoSidedBracket: (
    teams: string[][],
    tournamentId: string,
    eventId: string
  ): { leftSide: Omit<Match, 'id' | 'createdAt' | 'updatedAt'>[]; rightSide: Omit<Match, 'id' | 'createdAt' | 'updatedAt'>[] } => {
    const leftSide: Omit<Match, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    const rightSide: Omit<Match, 'id' | 'createdAt' | 'updatedAt'>[] = [];

    const midPoint = Math.ceil(teams.length / 2);
    const leftTeams = teams.slice(0, midPoint);
    const rightTeams = teams.slice(midPoint);

    leftTeams.forEach((team, index) => {
      const opponent = leftTeams[leftTeams.length - 1 - index] || null;
      leftSide.push({
        tournamentId,
        eventId,
        team1: team,
        team2: opponent,
        round: 1,
        position: index + 1,
        score1: null,
        score2: null,
        winnerId: null,
        completed: false,
        courtId: null,
        scheduledTime: null,
        stage: 'ELIMINATION',
        groupNumber: null,
      });
    });

    rightTeams.forEach((team, index) => {
      const opponent = rightTeams[rightTeams.length - 1 - index] || null;
      rightSide.push({
        tournamentId,
        eventId,
        team1: team,
        team2: opponent,
        round: 1,
        position: index + 1,
        score1: null,
        score2: null,
        winnerId: null,
        completed: false,
        courtId: null,
        scheduledTime: null,
        stage: 'ELIMINATION',
        groupNumber: null,
      });
    });

    return { leftSide, rightSide };
  },

  // Função para aplicar regras de confronto e definir cabeças de chave
  applySeedingRules: (
    teams: string[][],
    rankings: Record<string, number>
  ): string[][] => {
    // Ordenar equipes com base no ranking
    const sortedTeams = teams.sort((a, b) => {
      const rankA = rankings[a.join('|')] || 0;
      const rankB = rankings[b.join('|')] || 0;
      return rankB - rankA; // Ordem decrescente de ranking
    });

    // Aplicar regras de confronto para evitar que equipes do mesmo grupo se enfrentem cedo
    const seededTeams: string[][] = [];
    const groupMap = new Map<string, string[][]>();

    sortedTeams.forEach((team) => {
      const groupKey = team.join('|');
      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, []);
      }
      groupMap.get(groupKey)!.push(team);
    });

    groupMap.forEach((groupTeams) => {
      seededTeams.push(...groupTeams);
    });

    return seededTeams;
  },

  // Função para distribuir equipes com base em pontuação
  allocateTeamsByScore: (
    teams: string[][],
    scores: Record<string, number>,
    numGroups: number
  ): string[][][] => {
    const groups: string[][][] = Array.from({ length: numGroups }, () => []);

    // Ordenar equipes por pontuação
    const sortedTeams = teams.sort((a, b) => {
      const scoreA = scores[a.join('|')] || 0;
      const scoreB = scores[b.join('|')] || 0;
      return scoreB - scoreA; // Ordem decrescente de pontuação
    });

    // Distribuir equipes nos grupos de forma balanceada
    sortedTeams.forEach((team, index) => {
      const groupIndex = index % numGroups;
      groups[groupIndex].push(team);
    });

    return groups;
  },

  // Função para validar critérios de desempate e ajustar rankings
  validateTiebreakCriteria: (
    groupRankings: Record<number, GroupRanking[]>
  ): GroupRanking[] => {
    const allRankings: GroupRanking[] = [];

    Object.values(groupRankings).forEach((rankings) => {
      rankings.sort((a, b) => {
        // Critérios de desempate
        if (a.stats.wins !== b.stats.wins) return b.stats.wins - a.stats.wins; // Mais vitórias
        const aHeadToHead = a.stats.headToHeadWins[b.teamId.join('|')] ? 1 : 0;
        const bHeadToHead = b.stats.headToHeadWins[a.teamId.join('|')] ? 1 : 0;
        if (aHeadToHead !== bHeadToHead) return bHeadToHead - aHeadToHead; // Confronto direto
        const aSetPercentage = a.stats.setsWon / (a.stats.setsWon + a.stats.setsLost || 1);
        const bSetPercentage = b.stats.setsWon / (b.stats.setsWon + b.stats.setsLost || 1);
        if (aSetPercentage !== bSetPercentage) return bSetPercentage - aSetPercentage; // % de sets vencidos
        const aGamePercentage = a.stats.gamesWon / (a.stats.gamesWon + a.stats.gamesLost || 1);
        const bGamePercentage = b.stats.gamesWon / (b.stats.gamesWon + b.stats.gamesLost || 1);
        if (aGamePercentage !== bGamePercentage) return bGamePercentage - aGamePercentage; // % de games vencidos
        return 0; // Empate final
      });

      allRankings.push(...rankings);
    });

    return allRankings;
  },

  // Função para ajustar posições no chaveamento para evitar conflitos
  adjustBracketPositions: (
    bracket: BracketPosition[],
    groupAssignments: Record<string, number>
  ): BracketPosition[] => {
    const adjustedBracket = [...bracket];

    for (let i = 0; i < adjustedBracket.length / 2; i++) {
      const pos1 = i;
      const pos2 = adjustedBracket.length - 1 - i;

      const team1 = adjustedBracket[pos1]?.teamId;
      const team2 = adjustedBracket[pos2]?.teamId;

      if (!team1 || !team2) continue;

      const group1 = groupAssignments[team1.join('|')];
      const group2 = groupAssignments[team2.join('|')];

      if (group1 === group2) {
        // Encontrar uma posição alternativa para evitar conflito
        for (let j = 0; j < adjustedBracket.length; j++) {
          const altPos = adjustedBracket.length - 1 - j;
          const altTeam = adjustedBracket[altPos]?.teamId;

          if (altTeam && groupAssignments[altTeam.join('|')] !== group1) {
            // Trocar posições
            [adjustedBracket[pos2], adjustedBracket[altPos]] = [
              adjustedBracket[altPos],
              adjustedBracket[pos2],
            ];
            break;
          }
        }
      }
    }

    return adjustedBracket;
  },
};
