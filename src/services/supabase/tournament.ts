import { supabase } from '../../lib/supabase';
import { 
  Match, 
  Tournament, 
  TeamFormationType, 
  TournamentFormat,
  TournamentData,
  Team
} from '../../types';
import { UserStatsService } from './userStatsService';
import { TournamentHistoryService } from './tournamentHistoryService';
import { 
  calculateGroupRankings, 
  GroupRanking, 
  generateEliminationBracket,
  updateEliminationBracket,
  getRankedQualifiers, // Nova função para qualificação
  generateEliminationBracketWithSmartBye, // Nova lógica de BYE inteligente
  processAllByesAdvanced, // Processamento automático de BYEs
  cleanPhantomMatchesAdvanced, // Limpeza de partidas fantasma
  generateSuper8Matches // Super 8 rodízio de duplas
} from '../../utils/rankingUtils';
import { handleSupabaseError } from '../../utils/supabase-error-handler';
import { distributeTeamsIntoGroups, createTournamentStructure } from '../../utils/groupFormationUtils';
import { useTournamentStore } from '../../store/tournamentStore';
import { TournamentJsonbService } from './tournament-jsonb';

// Add UUID generation function with better entropy
const generateUUID = (): string => {
  // Use crypto.randomUUID() if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback with better entropy
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  const moreRandom = Math.random().toString(36).substring(2, 15);
  
  return `${timestamp}-${randomPart}-${moreRandom}-${Math.random().toString(36).substring(2, 9)}`;
};

export const transformMatch = (data: any): Match => {
  // Determinar stage baseado nos dados disponíveis
  // LÓGICA CORRIGIDA: group_number determina se é GROUP ou ELIMINATION
  let stage: 'GROUP' | 'ELIMINATION' = 'GROUP';
  
  // Critério mais claro: se tem group_number válido (>0), é fase de grupos
  if (data.group_number !== null && data.group_number !== undefined && data.group_number > 0) {
    stage = 'GROUP';
  } else if ((data.round || 0) > 0 && (data.group_number === null || data.group_number === undefined || data.group_number === 0)) {
    stage = 'ELIMINATION';
  } else {
    // Default para GROUP se round = 0 ou não está claro
    stage = 'GROUP';
  }
  
  console.log(`Match ${data.id}: round=${data.round}, group_number=${data.group_number}, determined stage=${stage}`);
  
  // Verificar se deveria estar completada baseado nos scores
  let completed = data.completed || false;
  let winnerId = data.winner_id || data.winnerId;
  
  // CORREÇÃO: Uma partida só está realmente completada se:
  // 1. Tem scores definidos (não null/undefined)
  // 2. Pelo menos um dos scores é maior que 0 (não aceitar 0x0)
  // 3. Os scores são diferentes (não aceitar empate)
  const hasValidScores = data.score1 !== null && data.score2 !== null && 
                        data.score1 !== undefined && data.score2 !== undefined;
  const hasNonZeroScores = (data.score1 > 0 || data.score2 > 0);
  const isDifferentScores = data.score1 !== data.score2;
  
  if (hasValidScores && hasNonZeroScores && isDifferentScores) {
    if (!completed) {
      completed = true;
      console.log(`Match ${data.id} has valid scores (${data.score1}x${data.score2}) and marked as completed`);
    }
    
    // Determinar vencedor se não estiver definido
    if (!winnerId) {
      winnerId = data.score1 > data.score2 ? 'team1' : 'team2';
      console.log(`Match ${data.id} winner determined as ${winnerId} based on scores (${data.score1}x${data.score2})`);
    }
  } else {
    // Se não tem scores válidos, garantir que não está marcada como completada
    if (hasValidScores && !hasNonZeroScores) {
      console.log(`Match ${data.id} has 0x0 scores, marking as not completed`);
    }
    completed = false;
    winnerId = null;
  }
  
  return {
    id: data.id,
    eventId: data.event_id,
    tournamentId: data.tournament_id,
    round: data.round || 0,
    position: data.position || 0,
    team1: data.team1,
    team2: data.team2,
    score1: data.score1 || 0,
    score2: data.score2 || 0,
    winnerId: winnerId,
    completed: completed,
    scheduledTime: data.scheduled_time || data.scheduledTime,
    courtId: data.court_id || data.courtId,
    stage: stage,
    groupNumber: data.group_number || data.groupNumber,
    createdAt: data.created_at || data.createdAt || new Date().toISOString(),
    updatedAt: data.updated_at || data.updatedAt || new Date().toISOString(),
  };
};

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
      console.log(`🔍 JSONB-ONLY: Fetching tournament for event ${eventId}...`);
      
      // Buscar torneio com todos os dados JSONB
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

      console.log(`📊 Tournament found: ${tournamentData.id}, status: ${tournamentData.status}, stage: ${tournamentData.stage}`);
      
      // NOVO: Usar dados das colunas JSONB específicas baseado no stage
      let allMatchesData: any[] = [];
      
      // Combinar dados de standings_data e elimination_bracket
      const standingsData = tournamentData.standings_data || [];
      let eliminationData = tournamentData.elimination_bracket 
        ? (Array.isArray(tournamentData.elimination_bracket) 
            ? tournamentData.elimination_bracket 
            : tournamentData.elimination_bracket.matches || []) // Novo formato com metadados
        : [];
      const matchesData = tournamentData.matches_data || [];
      
      console.log(`📊 JSONB data - standings: ${standingsData.length}, elimination: ${typeof tournamentData.elimination_bracket === 'object' ? 'object' : eliminationData.length}, matches: ${matchesData.length}`);
      
      // FUNÇÃO AUXILIAR para detectar placeholder
      const isPlaceholderId = (id: any) => typeof id === 'string' && (
        id.includes('WINNER_') || id.includes('TBD') || id.includes('Vencedor') || id === 'Desconhecido' || id.length < 36
      );

      // CORRIGIDO: Usar matches_data como fonte principal das partidas
      // standings_data é usado para rankings, não para as partidas em si
      const groupMatches = matchesData.filter((m: any) => m.stage === 'GROUP' || (!m.stage && m.groupNumber > 0));
      let eliminationMatches = eliminationData;

      console.log(`🔍 [DEBUG MERGE] Dados antes do merge:`);
      console.log(`- elimination_bracket tem ${eliminationMatches.length} partidas`);
      console.log(`- matches_data tem ${matchesData.length} partidas`);
      console.log(`- groupMatches filtradas: ${groupMatches.length}`);

      if (matchesData && matchesData.length) {
        const matchesDataMap = new Map<string, any>();
        matchesData.forEach((m: any) => matchesDataMap.set(m.id, m));
        
        eliminationMatches = eliminationMatches.map((em: any) => {
          const md = matchesDataMap.get(em.id);
          if (!md) {
            console.log(`🔍 [DEBUG MERGE] Sem match em matches_data para ${em.id}`);
            return em;
          }
          
          // Debug detalhado dos teams
          console.log(`🔍 [DEBUG MERGE] Match ${em.id}:`);
          console.log(`  - elimination_bracket: team1=${JSON.stringify(em.team1)}, team2=${JSON.stringify(em.team2)}`);
          console.log(`  - matches_data: team1=${JSON.stringify(md.team1)}, team2=${JSON.stringify(md.team2)}`);
          
          // CORRIGIDO: Sempre usar a versão que tem MENOS placeholders
          const emPlaceholders = ((em.team1 || []).filter((x: any) => isPlaceholderId(x)).length + 
                                 (em.team2 || []).filter((x: any) => isPlaceholderId(x)).length);
          const mdPlaceholders = ((md.team1 || []).filter((x: any) => isPlaceholderId(x)).length + 
                                 (md.team2 || []).filter((x: any) => isPlaceholderId(x)).length);
          
          console.log(`  - elimination_bracket placeholders: ${emPlaceholders}, matches_data placeholders: ${mdPlaceholders}`);
          
          // Sempre preferir a versão com MENOS placeholders (mais completa)
          if (mdPlaceholders < emPlaceholders) {
            console.log(`♻️ [MERGE] Usando matches_data (menos placeholders) para ${em.id}`);
            return { 
              ...em, // manter metadados do elimination_bracket
              team1: md.team1, // mas usar teams mais atualizados
              team2: md.team2,
              score1: md.score1,
              score2: md.score2,
              winnerId: md.winnerId,
              completed: md.completed,
              updatedAt: md.updatedAt || new Date().toISOString()
            };
          } else if (emPlaceholders < mdPlaceholders) {
            console.log(`♻️ [MERGE] Usando elimination_bracket (menos placeholders) para ${em.id}`);
            return em;
          } else {
            console.log(`📊 [MERGE] Mesmo número de placeholders, mesclando dados para ${em.id}`);
            return {
              ...em,
              // Preferir dados atualizados se existirem
              score1: md.score1 !== undefined ? md.score1 : em.score1,
              score2: md.score2 !== undefined ? md.score2 : em.score2,
              winnerId: md.winnerId || em.winnerId,
              completed: md.completed !== undefined ? md.completed : em.completed,
              updatedAt: md.updatedAt || em.updatedAt || new Date().toISOString()
            };
          }
        });
      }

      allMatchesData = [...groupMatches, ...eliminationMatches];
      
      console.log(`📊 [DEBUG] Group matches: ${groupMatches.length}, Elimination matches: ${eliminationMatches.length}, Total: ${allMatchesData.length}`);
      
      if (allMatchesData.length > 0) {
        console.log(`🔍 [DEBUG] Sample match data:`, JSON.stringify(allMatchesData[0], null, 2));
      }

      // Transform matches using the existing transformMatch function
      const allMatches = allMatchesData.map((match: any) => {
        // Ensure the match has the required fields for transformMatch
        const matchWithDefaults = {
          ...match,
          event_id: match.eventId || eventId,
          tournament_id: match.tournamentId || tournamentData.id,
          winner_id: match.winnerId,
          score1: match.score1 || 0,
          score2: match.score2 || 0,
          completed: match.completed || false,
          stage: match.stage || determineMatchStage(match), // Determinar stage se não existe
          group_number: match.groupNumber,
          court_id: match.courtId,
          scheduled_time: match.scheduledTime,
          created_at: match.createdAt || new Date().toISOString(),
          updated_at: match.updatedAt || new Date().toISOString()
        };
        
        return transformMatch(matchWithDefaults);
      });

      // CORREÇÃO: Remover duplicatas baseado no ID
      const seenIds = new Set<string>();
      const matches = allMatches.filter(match => {
        if (seenIds.has(match.id)) {
          console.warn(`🚨 Duplicate match ID found and removed: ${match.id}`);
          return false;
        }
        seenIds.add(match.id);
        return true;
      });

      const tournament = transformTournament(tournamentData, matches);
      tournament.isNewTournament = false;
      
      console.log(`✅ Tournament loaded with ${matches.length} matches from JSONB`);
      if (matches.length > 0) {
        const completedMatches = matches.filter(m => m.completed).length;
        console.log(`📈 Matches status: ${completedMatches}/${matches.length} completed`);
      }
      
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

  // Add the missing updateMatch method - JSONB-ONLY VERSION
  updateMatch: async (matchId: string, updates: Partial<Match>): Promise<Match> => {
    try {
      console.log(`🔄 JSONB-ONLY: Updating match ${matchId} with:`, updates);
      
      // Get current tournament from store
      const currentTournament = useTournamentStore.getState().tournament;
      
      if (!currentTournament) {
        throw new Error('Torneio não encontrado na memória. Recarregue a página e tente novamente.');
      }
      
      // Find the match in the current tournament data
      const matchInMemory = currentTournament.matches?.find(m => m.id === matchId);
      
      if (!matchInMemory) {
        throw new Error('Partida não encontrada. Recarregue a página e tente novamente.');
      }
      
      console.log('📊 Found match in memory:', matchInMemory);
      
      // Determine stage for the match
      const stage = updates.stage || matchInMemory.stage || determineMatchStage(matchInMemory);
      
      // Prepare update data
      const matchUpdateData = {
        ...updates,
        stage: stage,
        updatedAt: new Date().toISOString()
      };
      
      console.log(`📈 Updating match with stage ${stage}`);
      
      // Criar match completo para salvar
      const updatedMatch: Match = {
        ...matchInMemory,
        ...matchUpdateData,
        id: matchId,
        eventId: matchInMemory.eventId,
        tournamentId: matchInMemory.tournamentId,
        round: matchInMemory.round,
        position: matchInMemory.position,
        team1: matchInMemory.team1,
        team2: matchInMemory.team2,
        scheduledTime: matchUpdateData.scheduledTime || matchInMemory.scheduledTime,
        courtId: matchUpdateData.courtId || matchInMemory.courtId,
        groupNumber: matchUpdateData.groupNumber || matchInMemory.groupNumber,
        createdAt: matchInMemory.createdAt
      };
      
      // NOVA LÓGICA ROBUSTA: Usar saveMatchByStage para garantir salvamento correto
      const { saveMatchByStage } = await import('../../utils/rankingUtils');
      await saveMatchByStage(updatedMatch);
      
      console.log('✅ Match updated successfully in appropriate JSONB column');
      
      // NOVO: Atualizar estatísticas dos usuários se a partida foi completada
      if (updatedMatch.completed && (matchUpdateData.completed || matchUpdateData.winnerId)) {
        try {
          console.log('📊 Updating user statistics for completed match...');
          await UserStatsService.updateUserStatsFromMatch(updatedMatch);
          console.log('✅ User statistics updated successfully');
        } catch (statsError) {
          console.warn('⚠️ Could not update user statistics:', statsError);
          // Não falhar a atualização da partida por causa disso
        }
      }
      
      return updatedMatch;
      
    } catch (error) {
      console.error('❌ Error in JSONB-only updateMatch:', error);
      throw error instanceof Error ? error : new Error('Erro desconhecido ao atualizar partida');
    }
  },

  // Add a specific method for updating match results
  updateMatchResults: async (matchId: string, score1: number, score2: number): Promise<Match> => {
    try {
      console.log(`🔄 JSONB-ONLY: Updating match results for ${matchId}: ${score1}-${score2}`);
      
      // CORREÇÃO: Aplicar as mesmas regras de validação que transformMatch usa
      // Uma partida só está realmente completada se:
      // 1. Tem scores definidos (não null/undefined)
      // 2. Pelo menos um dos scores é maior que 0 (não aceitar 0x0)
      // 3. Os scores são diferentes (não aceitar empate)
      const hasValidScores = score1 !== null && score2 !== null && 
                            score1 !== undefined && score2 !== undefined;
      const hasNonZeroScores = (score1 > 0 || score2 > 0);
      const isDifferentScores = score1 !== score2;
      
      let completed = false;
      let winnerId: 'team1' | 'team2' | null = null;
      
      if (hasValidScores && hasNonZeroScores && isDifferentScores) {
        completed = true;
        winnerId = score1 > score2 ? 'team1' : 'team2';
        console.log(`✅ Match ${matchId} has valid scores (${score1}x${score2}) and marked as completed with winner: ${winnerId}`);
      } else {
        if (hasValidScores && !hasNonZeroScores) {
          console.log(`⚠️ Match ${matchId} has 0x0 scores, marking as not completed`);
        } else if (hasValidScores && !isDifferentScores) {
          console.log(`⚠️ Match ${matchId} has tied scores (${score1}x${score2}), marking as not completed`);
        } else {
          console.log(`⚠️ Match ${matchId} has invalid scores, marking as not completed`);
        }
      }
      
      // Get current tournament from store
      const currentTournament = useTournamentStore.getState().tournament;
      
      if (!currentTournament) {
        throw new Error('Torneio não encontrado na memória. Recarregue a página e tente novamente.');
      }
      
      // Find the match in the current tournament data
      const matchInMemory = currentTournament.matches?.find(m => m.id === matchId);
      
      if (!matchInMemory) {
        throw new Error('Partida não encontrada. Recarregue a página e tente novamente.');
      }
      
      console.log(`📊 Found match in memory: ${matchInMemory.team1} vs ${matchInMemory.team2}`);
      
      // Determine stage for the match
      const stage = matchInMemory.stage || determineMatchStage(matchInMemory);
      
      // Prepare update data
      const resultsUpdateData = {
        score1: score1,
        score2: score2,
        winnerId: winnerId,
        completed: completed,
        stage: stage,
        updatedAt: new Date().toISOString()
      };
      
      console.log(`📈 Updating match with stage ${stage}`);
      
      // Criar match completo para salvar
      const transformedMatch: Match = {
        ...matchInMemory,
        ...resultsUpdateData,
        id: matchId,
        eventId: matchInMemory.eventId,
        tournamentId: matchInMemory.tournamentId,
        round: matchInMemory.round,
        position: matchInMemory.position,
        team1: matchInMemory.team1,
        team2: matchInMemory.team2,
        scheduledTime: matchInMemory.scheduledTime,
        courtId: matchInMemory.courtId,
        groupNumber: matchInMemory.groupNumber,
        createdAt: matchInMemory.createdAt
      };
      
      // NOVA LÓGICA ROBUSTA: Usar saveMatchByStage para garantir salvamento correto
      const { saveMatchByStage } = await import('../../utils/rankingUtils');
      await saveMatchByStage(transformedMatch);
      
      console.log('✅ Match updated successfully in appropriate JSONB column');
      
      console.log('🎯 Transformed match:', transformedMatch);
      
      // NOVO: Atualizar estatísticas dos usuários após conclusão da partida
      if (transformedMatch.completed) {
        try {
          console.log('📊 Updating user statistics for completed match...');
          await UserStatsService.updateUserStatsFromMatch(transformedMatch);
          console.log('✅ User statistics updated successfully');
        } catch (statsError) {
          console.warn('⚠️ Could not update user statistics:', statsError);
          // Não falhar a atualização da partida por causa disso
        }
      }
      
      // Se a partida foi completada, verificar se o torneio pode ser finalizado
      if (transformedMatch.completed) {
        try {
          console.log('🔍 [updateMatchResults] Match completed, checking if elimination bracket needs update...');
          console.log('🔍 [updateMatchResults] Match stage:', transformedMatch.stage);
          console.log('🔍 [updateMatchResults] Match data:', {
            id: transformedMatch.id,
            stage: transformedMatch.stage,
            round: transformedMatch.round,
            position: transformedMatch.position,
            team1: transformedMatch.team1,
            team2: transformedMatch.team2,
            winnerId: transformedMatch.winnerId,
            score1: transformedMatch.score1,
            score2: transformedMatch.score2
          });
          
          // NOVO: Atualizar o bracket eliminatório se for uma partida eliminatória
          if (transformedMatch.stage === 'ELIMINATION') {
            console.log('🔄 [updateMatchResults] Match is ELIMINATION stage, updating bracket...');
            
            // CORREÇÃO: Passar a partida completada diretamente para evitar problemas de sincronia
            await TournamentService.updateEliminationBracketWithMatch(transformedMatch.tournamentId, transformedMatch);
            console.log('✅ [updateMatchResults] Elimination bracket updated successfully');
          } else {
            console.log('ℹ️ [updateMatchResults] Match is not ELIMINATION stage, skipping bracket update');
          }
          
          // Verificar se o torneio pode ser finalizado
          // Comentado temporariamente até corrigir a função
          // const completedTournament = await checkAndCompleteTournament(currentTournament);
          // console.log('Tournament completion check completed:', completedTournament?.status);
        } catch (error) {
          console.warn('Could not check tournament completion or update bracket:', error);
          // Não falhar a atualização da partida por causa disso
        }
      }
      
      return transformedMatch;
      
    } catch (error) {
      console.error('❌ Error in JSONB-only updateMatchResults:', error);
      
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
    options: { 
      groupSize?: number; 
      forceReset?: boolean;
      maxTeamsPerGroup?: number;
      autoCalculateGroups?: boolean;
      format?: string;
    } = {}
  ): Promise<Tournament> => {
    console.log(`Generating structure for event ${eventId}, formation: ${teamFormation}`);
    
    try {
      const defaultGroupSize = options?.groupSize || 3;
      const { forceReset = false, maxTeamsPerGroup = 4, autoCalculateGroups = false } = options;
      
      console.log(`Generating structure for event ${eventId}, formation: ${teamFormation}`);
      console.log(`📊 Options: groupSize=${defaultGroupSize}, maxTeamsPerGroup=${maxTeamsPerGroup}, autoCalculateGroups=${autoCalculateGroups}`);
      
      // NOVA LÓGICA: Buscar o torneio existente (criado automaticamente com o evento)
      let existingTournament: Tournament | null = null;
      try {
        existingTournament = await TournamentService.getByEventId(eventId);
      } catch (e) {
        console.warn('Could not fetch existing tournament:', e);
      }

      if (!existingTournament) {
        throw new Error(`Nenhum torneio encontrado para este evento. O torneio deveria ter sido criado automaticamente ao criar o evento.`);
      }

      // Se options.format estiver presente, adapta o formato do torneio
      if (options.format && options.format !== existingTournament.format) {
        existingTournament.format = options.format as TournamentFormat;
        console.log(`⚡ Adaptando formato do torneio para: ${options.format}`);
      }

      const tournamentId = existingTournament.id;
      console.log(`📊 Found existing tournament ${tournamentId} for event ${eventId}`);
      
      // Se forceReset foi solicitado, limpar apenas os dados JSONB
      if (forceReset) {
        console.log(`🔄 Force reset requested - clearing JSONB data for tournament ${tournamentId}`);
        
        const resetData = {
          status: 'CREATED',
          current_round: 0,
          groups_count: 0,
          matches_data: [],
          teams_data: [],
          standings_data: [],
          elimination_bracket: [],
          stage: 'GROUP',
          updated_at: new Date().toISOString(),
          settings: { 
            groupSize: defaultGroupSize,
            qualifiersPerGroup: 2,
            maxTeamsPerGroup: maxTeamsPerGroup,
            autoCalculateGroups: autoCalculateGroups
          }
        };

        const { error: resetError } = await supabase
          .from('tournaments')
          .update(resetData)
          .eq('id', tournamentId);
        
        if (resetError) {
          console.error('❌ Error resetting tournament JSONB data:', resetError);
          throw resetError;
        }
        
        console.log(`✅ Tournament JSONB data reset successfully`);
      }
      
      // NOVA LÓGICA: Sempre usar as equipes fornecidas (mesmo que vazias) para gerar/atualizar o torneio
      let teamsToUse: Team[] = [];
      if (teams && teams.length > 0) {
        // Usar equipes fornecidas
        teamsToUse = teams.map((participants, index) => ({
          id: `team_${index + 1}`,
          participants,
          seed: index + 1,
        }));
        console.log(`✅ Using ${teamsToUse.length} provided teams:`, teamsToUse.map(t => t.participants));
      } else {
        // Se não há equipes fornecidas, criar estrutura vazia
        teamsToUse = [];
        console.log('⚠️ No teams provided - tournament structure will be empty');
      }

      // Gerar partidas apenas se há equipes suficientes
      let matchesData: Match[] = [];
      let groupsCount = 0;

      // SUPORTE AO SUPER8: Se o formato do torneio for SUPER8, usar lógica especial
      if (existingTournament.format === TournamentFormat.SUPER8) {
        // Para Super 8, os participantes vêm de teamsToUse (cada team é um participante individual)
        // ou diretamente dos participantes do evento
        const participantIds: string[] = teamsToUse.flatMap(t => t.participants);
        if (participantIds.length < 4 || participantIds.length % 2 !== 0) {
          throw new Error('O Super 8 exige número par de participantes (mínimo 4)');
        }
        console.log(`🔄 Gerando rodízio Super 8 para ${participantIds.length} participantes...`);
        matchesData = generateSuper8Matches(participantIds).map((match, idx) => ({
          ...match,
          id: generateUUID(),
          tournamentId: tournamentId,
          eventId: eventId,
          position: idx + 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
        groupsCount = 1;
        console.log(`✅ Super 8: ${matchesData.length} partidas geradas.`);
      } else if (teamsToUse.length >= 2) {
        console.log(`Generating matches for ${teamsToUse.length} teams...`);
        // Distribuir em grupos usando a nova lógica
        const shuffledTeams = [...teamsToUse].sort(() => Math.random() - 0.5);
        const groups = distributeTeamsIntoGroups(
          shuffledTeams.map(t => t.participants), 
          maxTeamsPerGroup,
          autoCalculateGroups
        );
        console.log(`📊 Groups distribution result: ${groups.length} groups created`);
        groups.forEach((group, index) => {
          console.log(`   Group ${index + 1}: ${group.length} teams`);
        });
        groupsCount = groups.length;
        // Gerar partidas
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
      } else {
        console.log('Not enough teams to generate matches - skipping match generation');
      }

      // Tentar inserir partidas na nova tabela matches
      if (matchesData.length > 0) {
        try {
          const { error: insertMatchesError } = await supabase
            .from('matches')
            .insert(matchesData.map(match => ({
              id: match.id,
              tournament_id: match.tournamentId,
              event_id: match.eventId,
              round_number: match.round,
              match_number: match.position,
              team1_ids: match.team1,
              team2_ids: match.team2,
              team1_score: match.score1,
              team2_score: match.score2,
              winner_team: match.winnerId,
              status: match.completed ? 'COMPLETED' : 'SCHEDULED',
              court_id: match.courtId,
              scheduled_at: match.scheduledTime,
              group_number: match.groupNumber,
              metadata: { stage: match.stage },
              created_at: match.createdAt,
              updated_at: match.updatedAt
            })));
            
          if (insertMatchesError && insertMatchesError.code === '42P01') {
            console.warn('matches table does not exist, storing matches in tournament data');
          } else if (insertMatchesError) {
            console.warn('Could not insert matches into matches table:', insertMatchesError);
          } else {
            console.log(`Inserted ${matchesData.length} matches into matches table`);
          }
        } catch (matchError) {
          console.warn('Could not insert matches:', matchError);
        }
      }

      // Atualizar torneio com dados finais (apenas colunas JSONB)
      console.log(`📝 Updating tournament ${tournamentId} JSONB columns with:`);
      console.log(`   - Groups: ${groupsCount}`);
      console.log(`   - Teams: ${teamsToUse.length}`);
      console.log(`   - Matches: ${matchesData.length}`);
      
      const updateData = { 
        format: existingTournament.format,
        groups_count: groupsCount,
        matches_data: matchesData,
        teams_data: teamsToUse,
        standings_data: matchesData, // Salvar partidas de grupos em standings_data
        stage: 'GROUP', // Definir stage inicial como GROUP
        updated_at: new Date().toISOString(),
        settings: { 
          groupSize: defaultGroupSize,
          qualifiersPerGroup: 2,
          maxTeamsPerGroup: maxTeamsPerGroup,
          autoCalculateGroups: autoCalculateGroups
        }
      };

      const { data: finalTournament, error: finalUpdateError } = await supabase
        .from('tournaments')
        .update(updateData)
        .eq('id', tournamentId)
        .select()
        .single();

      if (finalUpdateError) {
        console.error('❌ Error updating tournament JSONB data:', finalUpdateError);
        throw finalUpdateError;
      }
      
      console.log(`✅ Tournament JSONB data updated successfully. Final data:`, {
        id: finalTournament.id,
        groups_count: finalTournament.groups_count,
        teams_count: finalTournament.teams_data?.length || 0,
        matches_count: finalTournament.matches_data?.length || 0,
        settings: finalTournament.settings
      });

      const tournament = transformTournament(finalTournament, matchesData);
      tournament.isNewTournament = false; // Nunca é novo, sempre atualiza o existente
      
      console.log(`✅ Tournament structure generated/updated successfully for event ${eventId}`);
      return tournament;
      
    } catch (error) {
      console.error('Error generating tournament structure:', error);
      throw error;
    }
  },

  // Add method to generate elimination bracket
  generateEliminationBracket: async (tournamentId: string, useBeachTennisRules: boolean = true): Promise<Tournament> => {
    try {
      console.log(`🏆 Generating elimination bracket for tournament ${tournamentId} (Beach Tennis rules: ${useBeachTennisRules})`);
      
      // IMPORTANTE: Aguarda um pouco para garantir que todas as transações de banco estejam completas
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // SOLUÇÃO JSONB: Tentar carregar do JSONB primeiro, depois fallback para tabela
      let currentTournament: Tournament | null = null;
      
      try {
        currentTournament = await TournamentJsonbService.fetchTournamentFromJsonb(tournamentId);
        console.log('Tournament loaded from JSONB for bracket generation');
      } catch (jsonbError) {
        console.warn('Could not load from JSONB, using table fallback:', jsonbError);
      }
      
      // Se não conseguiu do JSONB, usar método tradicional
      if (!currentTournament) {
        currentTournament = await TournamentService.fetchTournament(tournamentId);
      }
      
      if (!currentTournament) {
        throw new Error('Torneio não encontrado');
      }
      
      console.log(`Tournament fetched with ${currentTournament.matches.length} matches`);
      
      // Check if group stage is complete
      const groupMatches = currentTournament.matches.filter(m => m.stage === 'GROUP');
      const completedGroupMatches = groupMatches.filter(m => m.completed);
      
      console.log(`Group stage: ${completedGroupMatches.length}/${groupMatches.length} matches completed`);
      
      // Debug: Log cada partida do grupo para entender o problema
      console.log('Group matches analysis:');
      groupMatches.forEach((match, index) => {
        console.log(`  Match ${index + 1} (${match.id}):`, {
          team1: match.team1,
          team2: match.team2,
          score1: match.score1,
          score2: match.score2,
          completed: match.completed,
          winnerId: match.winnerId,
          stage: match.stage,
          groupNumber: match.groupNumber,
          round: match.round
        });
      });
      
      // CORREÇÃO: Verificar se realmente existem partidas de grupo
      if (groupMatches.length === 0) {
        console.error('No group matches found! All matches:', currentTournament.matches);
        throw new Error('Nenhuma partida da fase de grupos foi encontrada. Verifique se o torneio foi criado corretamente.');
      }
      
      // Verificação mais flexível: aceitar se há pelo menos algumas partidas completadas
      // e o usuário escolheu continuar mesmo assim
      const completionRate = groupMatches.length > 0 ? (completedGroupMatches.length / groupMatches.length) : 0;
      console.log(`Completion rate: ${(completionRate * 100).toFixed(1)}%`);
      
      // CORREÇÃO: Verificar se as partidas têm scores válidos, mesmo que não estejam marcadas como completed
      const matchesWithScores = groupMatches.filter(m => 
        m.score1 !== null && m.score1 !== undefined && 
        m.score2 !== null && m.score2 !== undefined
      );
      
      console.log(`Matches with scores: ${matchesWithScores.length}/${groupMatches.length}`);
      
      if (completedGroupMatches.length === 0 && matchesWithScores.length === 0) {
        throw new Error('Nenhuma partida da fase de grupos foi completada. Não é possível gerar a fase eliminatória.');
      }
      
      // SOLUÇÃO ROBUSTA: Se há partidas com scores mas não marcadas como completadas, corrigi-las ANTES de prosseguir
      const matchesToFix = groupMatches.filter(match => 
        !match.completed && 
        match.score1 !== null && match.score1 !== undefined &&
        match.score2 !== null && match.score2 !== undefined
      );
      
      if (matchesToFix.length > 0) {
        console.log(`FIXING ${matchesToFix.length} matches that have scores but aren't marked as completed...`);
        
        for (const match of matchesToFix) {
          try {
            const winnerId = (match.score1 || 0) > (match.score2 || 0) ? 'team1' : 'team2';
            await TournamentService.updateMatch(match.id, {
              completed: true,
              winnerId: winnerId
            });
            console.log(`✓ Fixed match ${match.id}: marked as completed with winner ${winnerId}`);
            
            // Atualizar também no objeto local
            match.completed = true;
            match.winnerId = winnerId;
          } catch (updateError) {
            console.warn(`✗ Could not update match ${match.id}:`, updateError);
          }
        }
        
        // IMPORTANTE: Após corrigir, aguardar um pouco para garantir que as mudanças sejam persistidas
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Forçar um refresh do torneio para garantir que temos os dados atualizados
        console.log('Refreshing tournament after match fixes...');
        const refreshedTournament = await TournamentService.fetchTournament(tournamentId);
        if (refreshedTournament) {
          currentTournament = refreshedTournament;
          console.log('Tournament refreshed successfully');
        }
        
        // Re-check completed matches after fixing
        const reCheckedCompleted = groupMatches.filter(m => m.completed);
        console.log(`After fixing: ${reCheckedCompleted.length}/${groupMatches.length} matches completed`);
      }
      
      // Verificação final: usar critério mais flexível
      const finalMatchesWithScores = groupMatches.filter(m => 
        m.score1 !== null && m.score1 !== undefined && 
        m.score2 !== null && m.score2 !== undefined
      );
      
      if (finalMatchesWithScores.length === 0) {
        throw new Error('Nenhuma partida da fase de grupos possui resultados. Adicione os resultados antes de gerar a fase eliminatória.');
      }
      
      if (finalMatchesWithScores.length !== groupMatches.length) {
        console.warn(`Only ${finalMatchesWithScores.length} of ${groupMatches.length} group matches have scores. Proceeding with available matches...`);
        // Não bloquear mais aqui - permitir geração parcial se necessário
      }
      
      // Log das partidas para debug
      console.log('Group matches for elimination calculation:');
      groupMatches.forEach(match => {
        console.log(`- Match ${match.id}: ${match.team1} vs ${match.team2} = ${match.score1}-${match.score2}, completed: ${match.completed}, stage: ${match.stage}`);
      });
      
      // Calculate group rankings
      const matchesByGroup = groupMatches.reduce((acc, match) => {
        const groupNum = match.groupNumber || 0;
        if (!acc[groupNum]) acc[groupNum] = [];
        acc[groupNum].push(match);
        return acc;
      }, {} as Record<number, Match[]>);
      
      // Calculate group rankings using Beach Tennis rules
      const groupRankings: Record<number, GroupRanking[]> = {};
      for (const [groupNum, matches] of Object.entries(matchesByGroup)) {
        if (useBeachTennisRules) {
          // Import the Beach Tennis ranking function
          const { calculateBeachTennisGroupRankings } = await import('../../utils/beachTennisRules');
          groupRankings[parseInt(groupNum)] = calculateBeachTennisGroupRankings(matches);
        } else {
          groupRankings[parseInt(groupNum)] = calculateGroupRankings(matches);
        }
        console.log(`Group ${groupNum} rankings (Beach Tennis: ${useBeachTennisRules}):`, groupRankings[parseInt(groupNum)]);
      }
      
      console.log('🏆 Calculating group-based qualification (2 per group)...');
      
      // Calculate correct number of qualified teams: 2 qualifiers per group
      const numberOfGroups = Object.keys(groupRankings).length;
      const qualifiersPerGroup = 2; // Standard Beach Tennis: top 2 from each group
      const totalQualified = numberOfGroups * qualifiersPerGroup;
      
      console.log(`📊 Qualification: ${numberOfGroups} groups × ${qualifiersPerGroup} qualifiers = ${totalQualified} total qualified teams`);
      
      // Use getRankedQualifiers to get exactly 2 teams from each group
      const { getRankedQualifiers } = await import('../../utils/rankingUtils');
      const qualifiedTeams = getRankedQualifiers(groupRankings, qualifiersPerGroup);
      
      console.log('✅ Qualified teams for elimination (by group):', qualifiedTeams.map((t: any) => `${t.rank}º - ${t.teamId.join(' & ')} (Grupo ${t.groupNumber}, SG: ${t.stats.gameDifference})`));
      
      // Generate elimination matches using NEW smart BYE logic
      let eliminationMatches: Match[];
      let eliminationMetadata: any;
      
      console.log('✅ Using NEW robust Beach Tennis BYE logic for elimination bracket');
      const bracketResult = generateEliminationBracketWithSmartBye(qualifiedTeams);
      eliminationMatches = bracketResult.matches;
      eliminationMetadata = bracketResult.metadata;
      
      // Set tournament and event IDs for all matches
      eliminationMatches.forEach(match => {
        match.tournamentId = tournamentId;
        match.eventId = currentTournament.eventId;
        match.stage = 'ELIMINATION'; // Garantir que o stage está correto
      });
      
      console.log(`Generated ${eliminationMatches.length} elimination matches with robust logic`);
      
      // [NOVO] Processar automaticamente os BYEs
      console.log('🔄 Processando BYEs automaticamente após geração...');
      const processedMatches = processAllByesAdvanced(eliminationMatches);
      console.log(`✅ BYEs processados automaticamente`);
      
      // [NOVO] Limpar partidas fantasma
      console.log('🧹 Limpando partidas fantasma...');
      const cleanMatches = cleanPhantomMatchesAdvanced(processedMatches);
      console.log(`✅ Partidas fantasma removidas`);
      
      // Usar as partidas limpas como partidas finais
      eliminationMatches = cleanMatches;
      
      // NOVA LÓGICA: Salvar partidas de eliminação em elimination_bracket
      try {
        const { data: tournament, error } = await supabase
          .from('tournaments')
          .select('*')
          .eq('id', tournamentId)
          .single();
        
        if (error || !tournament) {
          throw new Error('Tournament not found');
        }
        
        // Salvar partidas de eliminação em elimination_bracket
        const existingEliminationBracket = Array.isArray(tournament.elimination_bracket) 
          ? tournament.elimination_bracket 
          : [];
        
        console.log(`🔍 [DEBUG] Existing elimination matches: ${existingEliminationBracket.length}`);
        console.log(`🔍 [DEBUG] New elimination matches: ${eliminationMatches.length}`);
        
        // CORRIGIDO: Se já existem partidas de eliminação, limpar antes de adicionar novas
        // Isso evita partidas duplicadas ou obsoletas
        const allEliminationMatches = eliminationMatches; // Usar apenas as novas partidas
        const uniqueEliminationMatches = removeDuplicateMatches(allEliminationMatches);
        
        console.log(`🔍 [DEBUG] Unique elimination matches: ${uniqueEliminationMatches.length}`);
        
        // Também manter todas as partidas (grupos + eliminação) em matches_data
        const groupMatches = currentTournament.matches.filter(m => m.stage !== 'ELIMINATION');
        const allMatches = [...groupMatches, ...eliminationMatches];
        const uniqueAllMatches = removeDuplicateMatches(allMatches);
        
        console.log(`🔍 [DEBUG] Group matches: ${groupMatches.length}, Total unique matches: ${uniqueAllMatches.length}`);
        
        // Create bracket data with metadata for Beach Tennis rules
        const bracketData = eliminationMetadata ? {
          matches: uniqueEliminationMatches,
          metadata: eliminationMetadata,
          qualifiedTeams: qualifiedTeams.map((team: any) => ({
            teamId: team.teamId,
            rank: team.rank,
            groupNumber: team.groupNumber
          })),
          generatedAt: new Date().toISOString(),
          useBeachTennisRules
        } : uniqueEliminationMatches;
        
        // Atualizar o torneio com os novos dados
        const { error: updateError } = await supabase
          .from('tournaments')
          .update({
            elimination_bracket: bracketData,
            matches_data: uniqueAllMatches,
            stage: 'ELIMINATION', // Atualizar stage do torneio
            status: 'STARTED',
            updated_at: new Date().toISOString()
          })
          .eq('id', tournamentId);
        
        if (updateError) {
          throw updateError;
        }
        
        console.log(`Elimination matches saved: ${uniqueEliminationMatches.length} in elimination_bracket`);
        
      } catch (saveError) {
        console.error('Error saving elimination matches:', saveError);
        throw saveError;
      }
      
      // SOLUÇÃO JSONB: Retornar tournament atualizado do JSONB como fonte confiável
      try {
        const tournamentFromJsonb = await TournamentJsonbService.fetchTournamentFromJsonb(tournamentId);
        if (tournamentFromJsonb) {
          tournamentFromJsonb.status = 'STARTED';
          console.log(`Elimination bracket generated with ${eliminationMatches.length} matches`);
          return tournamentFromJsonb;
        }
      } catch (jsonbError) {
        console.warn('Could not fetch from JSONB after generation:', jsonbError);
      }
      
      // Fallback: Return updated tournament from current data
      const allMatches = [...currentTournament.matches, ...eliminationMatches];
      const updatedTournament: Tournament = {
        ...currentTournament,
        matches: allMatches, // Usar todas as partidas (grupos + eliminação)
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
      console.log(`[NOVO] Atualizando chaveamento para a partida ${completedMatchId} com lógica robusta`);
      
      // PASSO 1: Obter estado atual do torneio
      const currentTournament = useTournamentStore.getState().tournament;
      if (!currentTournament) {
        throw new Error('Torneio não encontrado no estado');
      }

      // PASSO 2: Aplicar lógica robusta de atualização de chaveamento
      console.log('🔄 Aplicando lógica updateEliminationBracket...');
      
      // Debug: Mostrar todas as partidas disponíveis
      console.log(`🔍 [DEBUG] Total de partidas no torneio: ${currentTournament.matches?.length || 0}`);
      console.log(`🔍 [DEBUG] Buscando partida completada: ${completedMatchId}`);
      
      // Encontrar a partida completada para obter dados do vencedor
      const completedMatch = currentTournament.matches?.find(m => m.id === completedMatchId);
      
      if (!completedMatch) {
        console.error(`❌ [DEBUG] Partida ${completedMatchId} não encontrada`);
        console.log(`🔍 [DEBUG] Partidas disponíveis:`, currentTournament.matches?.map(m => ({ 
          id: m.id, 
          stage: m.stage, 
          completed: m.completed, 
          winnerId: m.winnerId,
          scores: `${m.score1}x${m.score2}`
        })));
        throw new Error('Partida completada não encontrada');
      }
      
      console.log(`✅ [DEBUG] Partida encontrada:`, {
        id: completedMatch.id,
        stage: completedMatch.stage,
        completed: completedMatch.completed,
        winnerId: completedMatch.winnerId,
        scores: `${completedMatch.score1}x${completedMatch.score2}`,
        team1: completedMatch.team1,
        team2: completedMatch.team2
      });
      
      if (!completedMatch.winnerId) {
        console.error(`❌ [DEBUG] Partida ${completedMatchId} encontrada mas sem winnerId`);
        console.log(`🔍 [DEBUG] Dados completos da partida:`, completedMatch);
        throw new Error('Partida completada não encontrada ou sem vencedor definido');
      }
      
      const winnerTeam = completedMatch.winnerId === 'team1' ? completedMatch.team1 : completedMatch.team2;
      if (!winnerTeam) {
        throw new Error('Time vencedor não identificado');
      }
      
      let updatedMatches = updateEliminationBracket(
        currentTournament.matches || [], 
        completedMatchId, 
        completedMatch.winnerId, 
        winnerTeam
      );
      
      // PASSO 3: Processar BYEs automaticamente
      console.log('🔄 Processando BYEs automaticamente...');
      updatedMatches = processAllByesAdvanced(updatedMatches);
      
      // PASSO 4: Limpar partidas fantasma
      console.log('🧹 Limpando partidas fantasma...');
      updatedMatches = cleanPhantomMatchesAdvanced(updatedMatches);

      // PASSO 5: Sincronizar com o banco de dados usando saveMatchByStage
      console.log('� Sincronizando com banco de dados...');
      
      // Separar partidas por stage e salvar nas colunas apropriadas
      const groupMatches = updatedMatches.filter(m => m.stage === 'GROUP');
      const eliminationMatches = updatedMatches.filter(m => m.stage === 'ELIMINATION');
      
      // Preparar dados para update
      const updateData: any = {
        matches_data: updatedMatches,
        standings_data: groupMatches,
        elimination_bracket: {
          matches: eliminationMatches,
          metadata: {
            lastUpdated: new Date().toISOString(),
            updatedByMatch: completedMatchId
          }
        },
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('tournaments')
        .update(updateData)
        .eq('id', tournamentId);

      if (updateError) {
        throw new Error(`Erro ao atualizar chaveamento: ${updateError.message}`);
      }

      // PASSO 6: Recarregar estado do torneio
      const tournament = await TournamentService.getByEventId(currentTournament.eventId);
      
      if (!tournament) {
        throw new Error('Não foi possível recarregar o torneio após a atualização.');
      }

      // PASSO 7: Atualizar estado da UI
      useTournamentStore.setState({ tournament });
      console.log(`✅ [NOVO] Chaveamento atualizado com sucesso usando lógica robusta`);
      
      return tournament;
      
    } catch (error) {
      console.error('❌ [NOVO] Erro ao atualizar chaveamento eliminatório:', error);
      throw error;
    }
  },

  // Add method to update elimination bracket with completed match (avoid sync issues)
  updateEliminationBracketWithMatch: async (tournamentId: string, completedMatch: Match): Promise<Tournament> => {
    try {
      console.log(`[NOVO] Atualizando chaveamento com partida completada: ${completedMatch.id}`);
      
      // PASSO 1: Obter estado atual do torneio
      const currentTournament = useTournamentStore.getState().tournament;
      if (!currentTournament) {
        throw new Error('Torneio não encontrado no estado');
      }

      console.log(`✅ [DEBUG] Partida completada recebida diretamente:`, {
        id: completedMatch.id,
        stage: completedMatch.stage,
        completed: completedMatch.completed,
        winnerId: completedMatch.winnerId,
        scores: `${completedMatch.score1}x${completedMatch.score2}`,
        team1: completedMatch.team1,
        team2: completedMatch.team2
      });
      
      if (!completedMatch.winnerId) {
        throw new Error('Partida completada não possui vencedor definido');
      }
      
      const winnerTeam = completedMatch.winnerId === 'team1' ? completedMatch.team1 : completedMatch.team2;
      if (!winnerTeam) {
        throw new Error('Time vencedor não identificado');
      }
      
      // PASSO 2: Criar lista de partidas atualizada
      const updatedMatches = currentTournament.matches?.map(m => 
        m.id === completedMatch.id ? completedMatch : m
      ) || [];
      
      // PASSO 3: Aplicar lógica robusta de atualização de chaveamento
      let finalMatches = updateEliminationBracket(
        updatedMatches, 
        completedMatch.id, 
        completedMatch.winnerId, 
        winnerTeam
      );
      
      // PASSO 4: Processar BYEs automaticamente
      console.log('🔄 Processando BYEs automaticamente...');
      finalMatches = processAllByesAdvanced(finalMatches);
      
      // PASSO 5: Limpar partidas fantasma
      console.log('🧹 Limpando partidas fantasma...');
      finalMatches = cleanPhantomMatchesAdvanced(finalMatches);
      
      // PASSO 6: Preparar dados para persistência garantindo que elimination_bracket seja atualizado
  const eliminationMatchesToSave = finalMatches.filter(m => m.stage === 'ELIMINATION');

      // Tentar preservar metadata existente (se houver)
      let existingElim = currentTournament.eliminationBracket as any;
      let eliminationBracketPayload: any;
      if (existingElim && !Array.isArray(existingElim) && existingElim.metadata) {
        eliminationBracketPayload = {
          matches: eliminationMatchesToSave,
            metadata: existingElim.metadata,
            generatedAt: new Date().toISOString()
        };
      } else {
        eliminationBracketPayload = eliminationMatchesToSave;
      }

      const updatePayload: any = {
        matches_data: finalMatches,
        elimination_bracket: eliminationBracketPayload,
        updated_at: new Date().toISOString()
      };

      // NÃO sobrescrever standings_data aqui, exceto se quisermos manter sincronizado (opcional)
      // Apenas se standings_data vier vazio mas temos groupMatchesToSave
      // (Evita perder dados existentes de grupos)
      // if (!currentTournament.standingsData || (currentTournament.standingsData as any).length === 0) {
      //   updatePayload.standings_data = groupMatchesToSave;
      // }

      const { error: updateError } = await supabase
        .from('tournaments')
        .update(updatePayload)
        .eq('id', tournamentId);

      if (updateError) {
        throw new Error(`Erro ao atualizar chaveamento: ${updateError.message}`);
      }

      // PASSO 7: Recarregar estado do torneio
      const tournament = await TournamentService.getByEventId(currentTournament.eventId);
      
      if (!tournament) {
        throw new Error('Não foi possível recarregar o torneio após a atualização.');
      }

      // PASSO 8: Atualizar estado da UI com refresh forçado
      const refreshedTournament = {
        ...tournament,
        lastUpdated: new Date().toISOString(),
        forceRefresh: Date.now() // Timestamp para forçar re-render
      };
      
      useTournamentStore.setState({ tournament: refreshedTournament });
      console.log(`✅ [NOVO] Chaveamento atualizado com sucesso usando partida completada diretamente`);
      
      return tournament;
      
    } catch (error) {
      console.error('❌ [NOVO] Erro ao atualizar chaveamento eliminatório com partida:', error);
      throw error;
    }
  },

  // Add method to fetch tournament with matches
  fetchTournament: async (tournamentId: string): Promise<Tournament | null> => {
    try {
      console.log(`Fetching tournament ${tournamentId}...`);
      
      // SOLUÇÃO JSONB: Tentar primeiro carregar do JSONB como fonte confiável
      try {
        const tournamentFromJsonb = await TournamentJsonbService.fetchTournamentFromJsonb(tournamentId);
        if (tournamentFromJsonb && tournamentFromJsonb.matches.length > 0) {
          console.log(`Tournament loaded from JSONB with ${tournamentFromJsonb.matches.length} matches`);
          return tournamentFromJsonb;
        }
      } catch (jsonbError) {
        console.warn('Could not load from JSONB, falling back to table query:', jsonbError);
      }

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

      // Fetch matches from the new matches table structure
      let matchesData: any[] = [];
      try {
        console.log('Fetching matches from matches table...');
        
        const { data: matches, error: matchesError } = await supabase
          .from('matches')
          .select('*')
          .eq('tournament_id', tournamentId)
          .order('round_number', { ascending: true })
          .order('match_number', { ascending: true });

        if (matchesError) {
          console.warn('Error fetching matches from matches table:', matchesError);
          
          if (matchesError.code === '42P01') {
            console.log('matches table does not exist, using JSONB data only');
          }
        } else {
          // Transform matches from the new schema to our expected format
          matchesData = (matches || []).map(match => ({
            id: match.id,
            tournament_id: match.tournament_id,
            event_id: match.event_id,
            round: match.round_number,
            position: match.match_number || 0,
            team1: match.team1_ids,
            team2: match.team2_ids,
            score1: match.team1_score,
            score2: match.team2_score,
            winner_id: match.winner_team,
            completed: match.status === 'COMPLETED',
            court_id: match.court_id,
            scheduled_time: match.scheduled_at,
            stage: match.metadata?.stage || 'GROUP',
            group_number: match.group_number,
            created_at: match.created_at,
            updated_at: match.updated_at
          }));
          console.log(`Fetched ${matchesData.length} matches from matches table`);
        }
      } catch (matchError) {
        console.warn('Could not fetch matches from matches table:', matchError);
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
        .from('matches')
        .select('id')
        .eq('tournament_id', tournamentId);
      
      if (fetchError) {
        console.error('Error fetching existing matches:', fetchError);
        return;
      }
      
      const existingMatchIds = new Set(existingMatches?.map(m => m.id) || []);
      
      // Find matches that exist in memory but not in database
      // CORREÇÃO: Filtrar matches com placeholders e IDs inválidos que não devem ser inseridos no banco
      const matchesToInsert = currentTournament.matches.filter(match => {
        // PRIMEIRO: Verificar se o ID do match é um UUID válido
        const isValidMatchId = typeof match.id === 'string' && 
                               match.id.length === 36 && 
                               /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(match.id);
        
        if (!isValidMatchId) {
          console.log(`🚫 Skipping match with non-UUID ID: ${match.id}`);
          return false;
        }
        
        // Skip if already exists in database
        if (existingMatchIds.has(match.id)) {
          return false;
        }
        
        // Função para verificar se um teamId é um placeholder inválido
        const isPlaceholder = (teamId: string): boolean => {
          return typeof teamId === 'string' && (
            teamId.includes('WINNER_') ||
            teamId.includes('TBD') ||
            teamId.includes('Vencedor') ||
            teamId === 'Desconhecido' ||
            teamId.length < 36 // UUIDs têm 36 caracteres
          );
        };
        
        // Skip matches with placeholder teams (como WINNER_QF1, etc)
        const hasPlaceholderTeam1 = match.team1 && match.team1.some(teamId => isPlaceholder(teamId));
        const hasPlaceholderTeam2 = match.team2 && match.team2.some(teamId => isPlaceholder(teamId));
        
        // Skip matches com teams vazios ou nulos
        const hasEmptyTeam1 = !match.team1 || match.team1.length === 0;
        const hasEmptyTeam2 = !match.team2 || match.team2.length === 0;
        
        // CORREÇÃO: Permitir partidas onde pelo menos um lado tem UUIDs válidos (para semifinais com BYE)
        // Só skip se AMBOS os lados tiverem placeholders ou se algum lado estiver vazio
        if (hasEmptyTeam1 || hasEmptyTeam2) {
          console.log(`🚫 Skipping match ${match.id} with empty teams:`, {
            team1: match.team1,
            team2: match.team2,
            reason: hasEmptyTeam1 ? 'empty team1' : 'empty team2'
          });
          return false;
        }
        
        if (hasPlaceholderTeam1 && hasPlaceholderTeam2) {
          console.log(`🚫 Skipping match ${match.id} with both teams having placeholders:`, {
            team1: match.team1,
            team2: match.team2,
            team1Details: match.team1?.map(t => ({ value: t, isPlaceholder: isPlaceholder(t), length: t?.length })),
            team2Details: match.team2?.map(t => ({ value: t, isPlaceholder: isPlaceholder(t), length: t?.length })),
            reason: 'both teams have placeholders'
          });
          return false;
        }
        
        // Verificar se todos os UUIDs são válidos
        const allTeamIds = [...(match.team1 || []), ...(match.team2 || [])];
        const hasInvalidUUIDs = allTeamIds.some(teamId => {
          return typeof teamId !== 'string' || 
                 teamId.length !== 36 || 
                 !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(teamId);
        });
        
        if (hasInvalidUUIDs) {
          console.log(`🚫 Skipping match ${match.id} with invalid UUIDs:`, {
            team1: match.team1,
            team2: match.team2
          });
          return false;
        }
        
        // Only sync matches with real participant UUIDs
        console.log(`✅ Match ${match.id} is valid for database sync`);
        return true;
      });
      
      if (matchesToInsert.length > 0) {
        console.log(`Inserting ${matchesToInsert.length} missing matches into database`);
        
        try {
          const { error: insertError } = await supabase
            .from('matches')
            .insert(matchesToInsert.map(match => ({
              id: match.id,
              tournament_id: match.tournamentId,
              event_id: match.eventId,
              round_number: match.round,
              match_number: match.position,
              team1_ids: match.team1,
              team2_ids: match.team2,
              team1_score: match.score1,
              team2_score: match.score2,
              winner_team: match.winnerId,
              status: match.completed ? 'COMPLETED' : 'SCHEDULED',
              court_id: match.courtId,
              scheduled_at: match.scheduledTime,
              group_number: match.groupNumber,
              metadata: { stage: match.stage },
              created_at: match.createdAt,
              updated_at: match.updatedAt
            })));
          
          if (insertError) {
            console.warn('Could not sync all matches to database:', insertError);
          } else {
            console.log(`Successfully synced ${matchesToInsert.length} matches to database`);
          }
        } catch (insertError) {
          console.warn('Error syncing matches to database:', insertError);
        }
      } else {
        console.log('All matches are already synchronized with database');
      }
      
    } catch (error) {
      console.error('Error syncing matches to database:', error);
    }
  },

  // Método para reiniciar torneio completamente
  restartTournament: async (eventId: string): Promise<Tournament> => {
    try {
      console.log(`🔄 Restarting tournament for event ${eventId}...`);
      
      // 1. Buscar dados do evento
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
      
      if (eventError || !eventData) {
        throw new Error(`Evento não encontrado: ${eventId}`);
      }
      
      console.log(`📋 Event found: ${eventData.title || eventData.name}`);
      
      // 2. Buscar torneio existente
      const existingTournament = await TournamentService.getByEventId(eventId);
      
      if (!existingTournament) {
        throw new Error(`Torneio não encontrado para o evento: ${eventId}`);
      }
      
      console.log(`🗑️ Resetting existing tournament: ${existingTournament.id}`);
      
      // ✅ Não tentar deletar de tabelas que podem não existir
      // As partidas são armazenadas em JSONB e serão limpas com o reset
      
      // 3. Resetar o torneio existente ao invés de deletar
      const resetTournamentData = {
        status: 'CREATED',
        format: eventData.tournament_format || 'GROUP_STAGE_ELIMINATION',
        settings: { 
          groupSize: 4,
          qualifiersPerGroup: 2
        },
        current_round: 0,
        groups_count: 0,
        stage: 'GROUP',
        teams_data: [], // Array vazio - será preenchido conforme duplas são formadas
        matches_data: [],
        standings_data: [],
        elimination_bracket: {},
        started_at: null,
        completed_at: null,
        updated_at: new Date().toISOString()
      };
      
      const { data: newTournament, error: updateError } = await supabase
        .from('tournaments')
        .update(resetTournamentData)
        .eq('id', existingTournament.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error resetting tournament:', updateError);
        throw new Error('Erro ao reiniciar torneio');
      }
      
      console.log(`✅ Tournament reset successfully: ${newTournament.id}`);
      
      // 5. Transformar e retornar torneio
      const tournament = transformTournament(newTournament, []);
      tournament.isNewTournament = false; // É um reset, não um novo torneio
      
      console.log(`🔄 Tournament restarted successfully for event ${eventId}`);
      return tournament;
      
      console.log(`🔄 Tournament restarted successfully for event ${eventId}`);
      return tournament;
      
    } catch (error) {
      console.error('Error restarting tournament:', error);
      throw error;
    }
  },

  // Método para adicionar/atualizar dupla na teams_data
  addOrUpdateTeam: async (tournamentId: string, team: Team): Promise<void> => {
    try {
      console.log(`👥 Adding/updating team in tournament ${tournamentId}:`, team.participants);
      
      // Buscar torneio atual
      const { data: tournament, error } = await supabase
        .from('tournaments')
        .select('teams_data')
        .eq('id', tournamentId)
        .single();
      
      if (error || !tournament) {
        throw new Error('Tournament not found');
      }
      
      const teamsData = tournament.teams_data || [];
      
      // Verificar se a dupla já existe (baseado nos participantes)
      const existingTeamIndex = teamsData.findIndex((t: Team) => 
        JSON.stringify(t.participants.sort()) === JSON.stringify(team.participants.sort())
      );
      
      if (existingTeamIndex !== -1) {
        // Atualizar dupla existente
        teamsData[existingTeamIndex] = team;
        console.log(`📝 Updated existing team: ${team.participants.join(' & ')}`);
      } else {
        // Adicionar nova dupla
        teamsData.push(team);
        console.log(`➕ Added new team: ${team.participants.join(' & ')}`);
      }
      
      // Atualizar no banco
      const { error: updateError } = await supabase
        .from('tournaments')
        .update({
          teams_data: teamsData,
          updated_at: new Date().toISOString()
        })
        .eq('id', tournamentId);
      
      if (updateError) {
        throw updateError;
      }
      
      console.log(`✅ Teams data updated: ${teamsData.length} teams total`);
      
    } catch (error) {
      console.error('Error adding/updating team:', error);
      throw error;
    }
  },

  // Método para remover dupla da teams_data
  removeTeam: async (tournamentId: string, teamId: string): Promise<void> => {
    try {
      console.log(`🗑️ Removing team ${teamId} from tournament ${tournamentId}`);
      
      // Buscar torneio atual
      const { data: tournament, error } = await supabase
        .from('tournaments')
        .select('teams_data')
        .eq('id', tournamentId)
        .single();
      
      if (error || !tournament) {
        throw new Error('Tournament not found');
      }
      
      const teamsData = tournament.teams_data || [];
      
      // Filtrar para remover a dupla
      const updatedTeamsData = teamsData.filter((t: Team) => t.id !== teamId);
      
      // Atualizar no banco
      const { error: updateError } = await supabase
        .from('tournaments')
        .update({
          teams_data: updatedTeamsData,
          updated_at: new Date().toISOString()
        })
        .eq('id', tournamentId);
      
      if (updateError) {
        throw updateError;
      }
      
      console.log(`✅ Team removed. Remaining teams: ${updatedTeamsData.length}`);
      
    } catch (error) {
      console.error('Error removing team:', error);
      throw error;
    }
  },

  // Método para formar duplas aleatórias (sorteio)
  generateRandomTeams: async (tournamentId: string, participants: string[]): Promise<Team[]> => {
    try {
      console.log(`🎲 Generating random teams for tournament ${tournamentId} with ${participants.length} participants`);
      
      if (participants.length % 2 !== 0) {
        throw new Error('Número de participantes deve ser par para formar duplas');
      }
      
      // Embaralhar participantes
      const shuffledParticipants = [...participants].sort(() => Math.random() - 0.5);
      
      // Formar duplas
      const teams: Team[] = [];
      for (let i = 0; i < shuffledParticipants.length; i += 2) {
        const team: Team = {
          id: `team_${Math.floor(i / 2) + 1}`,
          participants: [shuffledParticipants[i], shuffledParticipants[i + 1]],
          seed: Math.floor(i / 2) + 1,
        };
        teams.push(team);
      }
      
      // Salvar todas as duplas no torneio
      const { error: updateError } = await supabase
        .from('tournaments')
        .update({
          teams_data: teams,
          updated_at: new Date().toISOString()
        })
        .eq('id', tournamentId);
      
      if (updateError) {
        throw updateError;
      }
      
      console.log(`✅ Generated ${teams.length} random teams and saved to tournament`);
      teams.forEach((team, index) => {
        console.log(`   ${index + 1}. ${team.participants.join(' & ')}`);
      });
      
      return teams;
      
    } catch (error) {
      console.error('Error generating random teams:', error);
      throw error;
    }
  },

  // Método para obter duplas atuais do torneio
  getTeamsData: async (tournamentId: string): Promise<Team[]> => {
    try {
      const { data: tournament, error } = await supabase
        .from('tournaments')
        .select('teams_data')
        .eq('id', tournamentId)
        .single();
      
      if (error || !tournament) {
        throw new Error('Tournament not found');
      }
      
      return tournament.teams_data || [];
      
    } catch (error) {
      console.error('Error getting teams data:', error);
      throw error;
    }
  },

  // Função para verificar e gerar automaticamente a próxima rodada eliminatória
  checkAndGenerateNextEliminationRound: async (matchId: string, tournamentId: string): Promise<void> => {
    try {
      console.log(`🔍 Checking if next elimination round should be generated after match ${matchId}`);
      
      // Buscar torneio atual
      const currentTournament = await TournamentService.fetchTournament(tournamentId);
      if (!currentTournament) {
        console.warn('Tournament not found for next round generation');
        return;
      }
      
      // Filtrar apenas partidas eliminatórias
      const eliminationMatches = currentTournament.matches.filter(m => m.stage === 'ELIMINATION');
      
      if (eliminationMatches.length === 0) {
        console.log('No elimination matches found');
        return;
      }
      
      // Organizar partidas por rodada
      const roundsMap = new Map<number, Match[]>();
      eliminationMatches.forEach(match => {
        const round = match.round || 0;
        if (!roundsMap.has(round)) {
          roundsMap.set(round, []);
        }
        roundsMap.get(round)!.push(match);
      });
      
      // Verificar cada rodada para ver se está completa e se a próxima precisa ser gerada
      const sortedRounds = Array.from(roundsMap.keys()).sort((a, b) => a - b);
      
      for (const currentRound of sortedRounds) {
        const roundMatches = roundsMap.get(currentRound)!;
        const completedMatches = roundMatches.filter(m => m.completed);
        
        console.log(`🔄 Round ${currentRound}: ${completedMatches.length}/${roundMatches.length} matches completed`);
        
        // Se a rodada atual está completa
        if (completedMatches.length === roundMatches.length && roundMatches.length > 0) {
          const nextRound = currentRound + 1;
          
          // Verificar se a próxima rodada já existe
          const nextRoundMatches = roundsMap.get(nextRound) || [];
          
          if (nextRoundMatches.length === 0 && completedMatches.length > 1) {
            // Gerar próxima rodada automaticamente
            console.log(`🚀 Generating next round ${nextRound} automatically`);
            await TournamentService.generateNextEliminationRound(tournamentId, currentRound);
            
            // Recarregar torneio para mostrar nova rodada
            const tournamentStore = useTournamentStore.getState();
            if (tournamentStore.fetchTournament) {
              await tournamentStore.fetchTournament(currentTournament.eventId);
            }
            
            break; // Gerar apenas uma rodada por vez
          } else if (nextRoundMatches.length > 0) {
            // A próxima rodada já existe, verificar se precisa atualizar os times
            console.log(`🔍 Next round ${nextRound} already exists, checking if teams need to be updated...`);
            
            // Verificar se há partidas na próxima rodada que ainda têm "TBD" ou teams vazios
            const matchesNeedingUpdate = nextRoundMatches.filter(match => 
              !match.team1 || !match.team2 || 
              match.team1.length === 0 || match.team2.length === 0 ||
              (Array.isArray(match.team1) && match.team1.some(name => typeof name === 'string' && name.includes('TBD'))) ||
              (Array.isArray(match.team2) && match.team2.some(name => typeof name === 'string' && name.includes('TBD')))
            );
            
            if (matchesNeedingUpdate.length > 0) {
              console.log(`🔄 Updating ${matchesNeedingUpdate.length} matches in round ${nextRound} with winners from round ${currentRound}`);
              await TournamentService.updateNextRoundWithWinners(currentTournament, currentRound, nextRound);
              
              // Recarregar torneio para mostrar os times atualizados
              const tournamentStore = useTournamentStore.getState();
              if (tournamentStore.fetchTournament) {
                await tournamentStore.fetchTournament(currentTournament.eventId);
              }
              
              break; // Atualizar apenas uma rodada por vez
            } else {
              console.log(`✅ Round ${nextRound} already has all teams defined`);
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Error checking next elimination round:', error);
      // Não falhar por causa disso, apenas log
    }
  },

  // Função para gerar a próxima rodada eliminatória
  generateNextEliminationRound: async (tournamentId: string, completedRound: number): Promise<void> => {
    try {
      console.log(`🏆 Generating next elimination round after round ${completedRound}`);
      
      // Buscar torneio atual
      const currentTournament = await TournamentService.fetchTournament(tournamentId);
      if (!currentTournament) {
        throw new Error('Tournament not found');
      }
      
      // Buscar vencedores da rodada completada
      const completedRoundMatches = currentTournament.matches.filter(m => 
        m.stage === 'ELIMINATION' && 
        m.round === completedRound && 
        m.completed
      );
      
      if (completedRoundMatches.length === 0) {
        console.log('No completed matches found for the round');
        return;
      }
      
      // Se só há um vencedor, o torneio está completo
      if (completedRoundMatches.length === 1) {
        console.log('🏆 Tournament completed - only one match in this round');
        return;
      }
      
      console.log(`Found ${completedRoundMatches.length} completed matches in round ${completedRound}`);
      
      // Extrair vencedores e organizar para a próxima rodada
      const winners: string[][] = [];
      completedRoundMatches.forEach(match => {
        if (match.winnerId && match.team1 && match.team2) {
          const winningTeam = match.winnerId === 'team1' ? match.team1 : match.team2;
          winners.push(winningTeam);
        }
      });
      
      console.log(`${winners.length} winners advancing to next round`);
      
      if (winners.length < 2) {
        console.log('Not enough winners to create next round');
        return;
      }
      
      // Gerar partidas para a próxima rodada
      const nextRound = completedRound + 1;
      const nextRoundMatches: Match[] = [];
      
      // Emparejar vencedores (2 em 2)
      for (let i = 0; i < winners.length - 1; i += 2) {
        const team1 = winners[i];
        const team2 = winners[i + 1];
        
        const matchId = generateUUID();
        const newMatch: Match = {
          id: matchId,
          eventId: currentTournament.eventId,
          tournamentId: tournamentId,
          round: nextRound,
          position: Math.floor(i / 2) + 1,
          team1: team1,
          team2: team2,
          score1: null,
          score2: null,
          winnerId: null,
          completed: false,
          courtId: null,
          scheduledTime: null,
          stage: 'ELIMINATION',
          groupNumber: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        nextRoundMatches.push(newMatch);
        console.log(`Created match: ${team1.join(' & ')} vs ${team2.join(' & ')}`);
      }
      
      // Se há um número ímpar de vencedores, o último avança automaticamente
      if (winners.length % 2 === 1) {
        const lastWinner = winners[winners.length - 1];
        console.log(`${lastWinner.join(' & ')} advances automatically (BYE)`);
        
        // Se há apenas um vencedor sobrando e só uma partida, criar a final
        if (nextRoundMatches.length === 1) {
          const finalMatchId = generateUUID();
          const finalMatch: Match = {
            id: finalMatchId,
            eventId: currentTournament.eventId,
            tournamentId: tournamentId,
            round: nextRound + 1,
            position: 1,
            team1: lastWinner,
            team2: [], // Será preenchido quando a semifinal terminar
            score1: null,
            score2: null,
            winnerId: null,
            completed: false,
            courtId: null,
            scheduledTime: null,
            stage: 'ELIMINATION',
            groupNumber: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          nextRoundMatches.push(finalMatch);
        }
      }
      
      if (nextRoundMatches.length === 0) {
        console.log('No matches to create for next round');
        return;
      }
      
      // Salvar novas partidas no banco
      const allMatches = [...currentTournament.matches, ...nextRoundMatches];
      
      // Atualizar torneio com as novas partidas
      const { error: updateError } = await supabase
        .from('tournaments')
        .update({
          matches_data: allMatches,
          elimination_bracket: allMatches.filter(m => m.stage === 'ELIMINATION'),
          updated_at: new Date().toISOString()
        })
        .eq('id', tournamentId);
      
      if (updateError) {
        throw updateError;
      }
      
      console.log(`✅ Generated ${nextRoundMatches.length} matches for round ${nextRound}`);
      
    } catch (error) {
      console.error('Error generating next elimination round:', error);
      throw error;
    }
  },

  // Função para atualizar a próxima rodada com os vencedores da rodada anterior
  updateNextRoundWithWinners: async (tournament: Tournament, completedRound: number, nextRound: number): Promise<void> => {
    try {
      console.log(`🔄 [updateNextRoundWithWinners] Updating round ${nextRound} with winners from round ${completedRound}`);
      
      // Buscar partidas completadas da rodada anterior
      const completedMatches = tournament.matches.filter(m => 
        m.stage === 'ELIMINATION' && 
        m.round === completedRound && 
        m.completed === true
      );
      
      // Buscar partidas da próxima rodada
      const nextRoundMatches = tournament.matches.filter(m => 
        m.stage === 'ELIMINATION' && 
        m.round === nextRound
      );
      
      console.log(`🔍 [updateNextRoundWithWinners] Found ${completedMatches.length} completed matches and ${nextRoundMatches.length} next round matches`);
      
      if (completedMatches.length === 0 || nextRoundMatches.length === 0) {
        console.log(`⚠️ [updateNextRoundWithWinners] Not enough matches to update`);
        return;
      }
      
      // Ordenar as partidas para garantir ordem correta
      completedMatches.sort((a, b) => (a.position || 0) - (b.position || 0));
      nextRoundMatches.sort((a, b) => (a.position || 0) - (b.position || 0));
      
      console.log(`📋 [updateNextRoundWithWinners] Completed matches order:`, 
        completedMatches.map(m => `Match ${m.position}: ${m.winnerId}`)
      );
      
      // Extrair vencedores em ordem
      const winners: { team: string[], names: string[] }[] = [];
      completedMatches.forEach(match => {
        if (match.winnerId && match.team1 && match.team2) {
          const winningTeam = match.winnerId === 'team1' ? match.team1 : match.team2;
          
          winners.push({
            team: winningTeam,
            names: winningTeam // Usar diretamente os IDs dos participantes
          });
          
          console.log(`🏆 [updateNextRoundWithWinners] Winner from match ${match.position}: ${winningTeam.join(' & ')}`);
        }
      });
      
      console.log(`📊 [updateNextRoundWithWinners] Total winners: ${winners.length}`);
      
      if (winners.length < 2) {
        console.log(`⚠️ [updateNextRoundWithWinners] Not enough winners to update next round`);
        return;
      }
      
      // Atualizar as partidas da próxima rodada com os vencedores
      const updatedMatches = [...tournament.matches];
      let winnersUsed = 0;
      
      for (let i = 0; i < nextRoundMatches.length && winnersUsed < winners.length - 1; i++) {
        const nextMatch = nextRoundMatches[i];
        const winner1 = winners[winnersUsed];
        const winner2 = winners[winnersUsed + 1];
        
        if (winner1 && winner2) {
          console.log(`🔄 [updateNextRoundWithWinners] Updating match ${nextMatch.position}: ${winner1.names.join(' & ')} vs ${winner2.names.join(' & ')}`);
          
          // Encontrar o índice da partida no array principal
          const matchIndex = updatedMatches.findIndex(m => m.id === nextMatch.id);
          if (matchIndex !== -1) {
            updatedMatches[matchIndex] = {
              ...updatedMatches[matchIndex],
              team1: winner1.team,
              team2: winner2.team,
              updatedAt: new Date().toISOString()
            };
            
            console.log(`✅ [updateNextRoundWithWinners] Updated match ${nextMatch.id}`);
          }
        }
        
        winnersUsed += 2;
      }
      
      // Salvar as alterações no banco
      const { error } = await supabase
        .from('tournaments')
        .update({
          matches_data: updatedMatches,
          elimination_bracket: updatedMatches.filter(m => m.stage === 'ELIMINATION'),
          updated_at: new Date().toISOString()
        })
        .eq('id', tournament.id);

      if (error) {
        console.error(`❌ [updateNextRoundWithWinners] Error saving matches:`, error);
        throw error;
      }
      
      console.log(`✅ [updateNextRoundWithWinners] Round ${nextRound} updated with winners from round ${completedRound}`);
      
    } catch (error) {
      console.error(`❌ [updateNextRoundWithWinners] Error:`, error);
      throw error;
    }
  },

  // ...existing code...
};

// Função auxiliar para salvar match na coluna JSONB apropriada
const saveMatchByStage = async (match: Match): Promise<void> => {
  try {
    console.log(`Saving match ${match.id} to appropriate JSONB column based on stage: ${match.stage}`);
    
    // Buscar dados atuais do torneio
    const { data: tournament, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', match.tournamentId)
      .single();
    
    if (error || !tournament) {
      throw new Error('Tournament not found');
    }
    
    let updateData: any = {
      stage: match.stage,
      updated_at: new Date().toISOString()
    };
    
    if (match.stage === 'GROUP') {
      // Salvar em standings_data
      const standingsData = tournament.standings_data || [];
      const existingIndex = standingsData.findIndex((m: Match) => m.id === match.id);
      
      if (existingIndex !== -1) {
        standingsData[existingIndex] = match;
      } else {
        standingsData.push(match);
      }
      
      // Remover duplicatas
      const uniqueMatches = removeDuplicateMatches(standingsData);
      updateData.standings_data = uniqueMatches;
      
      console.log(`Match ${match.id} saved to standings_data (${uniqueMatches.length} matches)`);
      
    } else if (match.stage === 'ELIMINATION') {
      // Salvar em elimination_bracket
      const eliminationData = Array.isArray(tournament.elimination_bracket) 
        ? tournament.elimination_bracket 
        : [];
      const existingIndex = eliminationData.findIndex((m: Match) => m.id === match.id);
      
      if (existingIndex !== -1) {
        eliminationData[existingIndex] = match;
      } else {
        eliminationData.push(match);
      }
      
      // Remover duplicatas
      const uniqueMatches = removeDuplicateMatches(eliminationData);
      updateData.elimination_bracket = uniqueMatches;
      
      console.log(`Match ${match.id} saved to elimination_bracket (${uniqueMatches.length} matches)`);
    }
    
    // Também manter no matches_data para compatibilidade
    const matchesData = tournament.matches_data || [];
    const existingMatchIndex = matchesData.findIndex((m: Match) => m.id === match.id);
    
    if (existingMatchIndex !== -1) {
      matchesData[existingMatchIndex] = match;
    } else {
      matchesData.push(match);
    }
    
    const uniqueAllMatches = removeDuplicateMatches(matchesData);
    updateData.matches_data = uniqueAllMatches;
    
    // Atualizar no banco
    const { error: updateError } = await supabase
      .from('tournaments')
      .update(updateData)
      .eq('id', match.tournamentId);
    
    if (updateError) {
      throw updateError;
    }
    
    console.log(`Match ${match.id} saved successfully in stage-specific column`);
    
  } catch (error) {
    console.error('Error saving match by stage:', error);
    throw error;
  }
};

// Função auxiliar para determinar o stage de um match
const determineMatchStage = (match: Match): 'GROUP' | 'ELIMINATION' => {
  // Critério: se tem group_number válido (>0), é fase de grupos
  if (match.groupNumber !== null && match.groupNumber !== undefined && match.groupNumber > 0) {
    return 'GROUP';
  }
  
  // Se tem round > 0 e não tem group_number, é eliminatória
  if ((match.round || 0) > 0 && (!match.groupNumber || match.groupNumber === 0)) {
    return 'ELIMINATION';
  }
  
  // Default para GROUP
  return 'GROUP';
};

// Função auxiliar para remover duplicatas de matches
const removeDuplicateMatches = (matches: Match[]): Match[] => {
  const seenIds = new Set<string>();
  return matches.filter(match => {
    if (seenIds.has(match.id)) {
      console.warn(`🚨 Duplicate match ID found and removed: ${match.id}`);
      return false;
    }
    seenIds.add(match.id);
    return true;
  });
};

/**
 * Função para gerar bracket com courts (compatibilidade com UI)
 * Esta função é um wrapper que combina a funcionalidade de geração de estrutura
 * com a formação de equipes baseada nos participantes
 */
export const generateBracketWithCourts = async (
  eventId: string,
  participants: any[],
  courtAssignments: Record<string, string[]>,
  options: { groupSize?: number; forceReset?: boolean } = {}
): Promise<Tournament> => {
  console.log(`🏆 generateBracketWithCourts called for event ${eventId} with ${participants.length} participants`);
  console.log(`🏟️ Court assignments:`, courtAssignments);
  
  try {
    // Se foi solicitado reset, primeiro reiniciar o torneio
    if (options.forceReset) {
      console.log(`🔄 Force reset requested - restarting tournament first`);
      await TournamentService.restartTournament(eventId);
    }
    
    // Formar equipes a partir dos participantes
    const participantIds = participants.map(p => p.id);
    console.log(`👥 Participant IDs: ${participantIds.length}`, participantIds);
    
    // Se número ímpar de participantes, remover o último
    if (participantIds.length % 2 !== 0) {
      console.log('⚠️ Odd number of participants, removing last one to form pairs');
      participantIds.pop();
    }
    
    // Embaralhar e formar duplas
    const shuffled = [...participantIds].sort(() => Math.random() - 0.5);
    const teams: string[][] = [];
    for (let i = 0; i < shuffled.length; i += 2) {
      teams.push([shuffled[i], shuffled[i + 1]]);
    }
    
    console.log(`🎯 Formed ${teams.length} teams from ${participantIds.length} participants`);
    
    if (teams.length < 2) {
      throw new Error('Precisa de pelo menos 4 participantes (2 duplas) para criar um torneio');
    }
    
    // Gerar estrutura do torneio
    const tournament = await TournamentService.generateTournamentStructure(
      eventId,
      teams,
      TeamFormationType.RANDOM,
      options
    );
    
    console.log(`✅ Tournament structure generated successfully: ${tournament.id}`);
    console.log(`📊 Tournament has ${tournament.matches.length} matches`);
    
    return tournament;
    
  } catch (error) {
    console.error('❌ Error in generateBracketWithCourts:', error);
    throw error;
  }
};

/**
 * Verifica se o torneio está completo e atualiza o status
 */
const checkAndCompleteTournament = async (tournament: Tournament): Promise<Tournament | null> => {
  try {
    console.log('Checking tournament completion status:', tournament.id);
    
    // Se já está finalizado, não precisa fazer nada
    if (tournament.status === 'FINISHED') {
      console.log('Tournament already finished');
      return tournament;
    }

    const matches = tournament.matches || [];
    
    // Verificar se todas as partidas estão completas
    const allMatchesCompleted = matches.length > 0 && matches.every(match => match.completed);
    
    if (!allMatchesCompleted) {
      console.log('Not all matches completed yet');
      return tournament;
    }

    // Verificar se há uma partida final (maior round na fase de eliminação)
    const eliminationMatches = matches.filter(match => match.stage === 'ELIMINATION');
    
    if (eliminationMatches.length === 0) {
      console.log('No elimination matches found, checking group stage completion');
      // Se é só fase de grupos, verificar se todas estão completas
      const groupMatches = matches.filter(match => match.stage === 'GROUP' || !match.stage);
      const allGroupMatchesCompleted = groupMatches.length > 0 && groupMatches.every(match => match.completed);
      
      if (!allGroupMatchesCompleted) {
        return tournament;
      }
    } else {
      // Encontrar a partida final (maior round)
      const maxRound = Math.max(...eliminationMatches.map(match => match.round));
      const finalMatches = eliminationMatches.filter(match => match.round === maxRound);
      
      // Verificar se a(s) partida(s) final(is) está(ão) completa(s)
      const finalMatchesCompleted = finalMatches.every(match => match.completed);
      
      if (!finalMatchesCompleted) {
        console.log('Final matches not completed yet');
        return tournament;
      }
    }

    console.log('All tournament matches completed, marking tournament as finished');
    
    // Atualizar status do torneio para FINISHED
    const completedAt = new Date().toISOString();
    
    const { data: updatedTournament, error } = await supabase
      .from('tournaments')
      .update({
        status: 'FINISHED',
        completed_at: completedAt
      })
      .eq('id', tournament.id)
      .select('*')
      .single();

    if (error) {
      console.error('Error completing tournament:', error);
      return tournament;
    }

    console.log('Tournament marked as completed:', updatedTournament);
    
    // NOVO: Salvar histórico do torneio para todos os participantes
    try {
      console.log('📊 Saving tournament history for all participants...');
      
      // Obter equipes do torneio
      const teamsData = tournament.teamsData || [];
      
      if (teamsData.length > 0) {
        await TournamentHistoryService.saveTournamentHistory(
          { ...tournament, status: 'FINISHED', completedAt: completedAt },
          matches,
          teamsData
        );
        console.log('✅ Tournament history saved successfully');
      } else {
        console.warn('⚠️ No teams data found for tournament history');
      }
    } catch (historyError) {
      console.warn('⚠️ Could not save tournament history:', historyError);
      // Não falhar a finalização do torneio por causa disso
    }
    
    // NOVO: Atualizar estatísticas dos vencedores do torneio
    try {
      console.log('🏆 Finding tournament winners...');
      
      // Encontrar vencedores: quem venceu a partida final ou tem melhor posição
      const eliminationMatches = matches.filter(match => match.stage === 'ELIMINATION');
      
      if (eliminationMatches.length > 0) {
        // Torneio com fase de eliminação - encontrar vencedor da final
        const maxRound = Math.max(...eliminationMatches.map(match => match.round));
        const finalMatch = eliminationMatches.find(match => match.round === maxRound && match.completed);
        
        if (finalMatch && finalMatch.winnerId && finalMatch.team1 && finalMatch.team2) {
          const winnersTeam = finalMatch.winnerId === 'team1' ? finalMatch.team1 : finalMatch.team2;
          await UserStatsService.updateTournamentStats(winnersTeam);
          console.log('✅ Tournament winner statistics updated');
        }
      } else {
        // Torneio só com fase de grupos - consideraremos vencedores os primeiros colocados
        console.log('Group-only tournament - skipping tournament winner stats for now');
      }
    } catch (statsError) {
      console.warn('⚠️ Could not update tournament winner statistics:', statsError);
      // Não falhar a finalização do torneio por causa disso
    }
    
    return transformTournament(updatedTournament, matches);
    
  } catch (error) {
    console.error('Error checking tournament completion:', error);
    return tournament;
  }
};
