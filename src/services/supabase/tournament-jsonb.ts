import { supabase } from '../../lib/supabase';
import { Match, Tournament } from '../../types';

/**
 * Serviço para gerenciar torneios usando campos JSONB como fonte principal de dados
 * Resolve problemas de sincronização ao usar os campos JSON como cache confiável
 */
export const TournamentJsonbService = {
  
  /**
   * Salva todas as partidas no campo matches_data da tabela tournaments
   */
  saveMatchesToJsonb: async (tournamentId: string, matches: Match[]): Promise<void> => {
    try {
      console.log(`Saving ${matches.length} matches to JSONB for tournament ${tournamentId}`);
      
      // CORREÇÃO: Remover duplicatas antes de salvar
      const seenIds = new Set<string>();
      const uniqueMatches = matches.filter(match => {
        if (seenIds.has(match.id)) {
          console.warn(`🚨 Duplicate match ID found and removed before saving: ${match.id}`);
          return false;
        }
        seenIds.add(match.id);
        return true;
      });
      
      if (uniqueMatches.length !== matches.length) {
        console.warn(`⚠️ Removed ${matches.length - uniqueMatches.length} duplicate matches before saving`);
      }
      
      const matchesJsonb = uniqueMatches.map(match => ({
        id: match.id,
        tournamentId: match.tournamentId,
        eventId: match.eventId,
        round: match.round,
        position: match.position,
        team1: match.team1,
        team2: match.team2,
        score1: match.score1,
        score2: match.score2,
        winnerId: match.winnerId,
        completed: match.completed,
        courtId: match.courtId,
        scheduledTime: match.scheduledTime,
        stage: match.stage,
        groupNumber: match.groupNumber,
        createdAt: match.createdAt,
        updatedAt: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('tournaments')
        .update({ 
          matches_data: matchesJsonb,
          updated_at: new Date().toISOString()
        })
        .eq('id', tournamentId);

      if (error) {
        throw new Error(`Erro ao salvar partidas em JSONB: ${error.message}`);
      }

      console.log(`Successfully saved ${uniqueMatches.length} matches to JSONB`);
    } catch (error) {
      console.error('Error saving matches to JSONB:', error);
      throw error;
    }
  },

  /**
   * Recupera todas as partidas do campo matches_data
   */
  getMatchesFromJsonb: async (tournamentId: string): Promise<Match[]> => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('matches_data')
        .eq('id', tournamentId)
        .single();

      if (error) {
        throw new Error(`Erro ao recuperar partidas do JSONB: ${error.message}`);
      }

      if (!data?.matches_data) {
        return [];
      }

      // Converter de volta para objetos Match
      const matches: Match[] = data.matches_data.map((matchData: any) => ({
        id: matchData.id,
        tournamentId: matchData.tournamentId,
        eventId: matchData.eventId,
        round: matchData.round || 0,
        position: matchData.position || 0,
        team1: matchData.team1,
        team2: matchData.team2,
        score1: matchData.score1,
        score2: matchData.score2,
        winnerId: matchData.winnerId,
        completed: matchData.completed || false,
        courtId: matchData.courtId,
        scheduledTime: matchData.scheduledTime,
        stage: matchData.stage || 'GROUP',
        groupNumber: matchData.groupNumber,
        createdAt: matchData.createdAt,
        updatedAt: matchData.updatedAt
      }));

      console.log(`Retrieved ${matches.length} matches from JSONB`);
      return matches;
    } catch (error) {
      console.error('Error getting matches from JSONB:', error);
      return [];
    }
  },

  /**
   * Atualiza uma partida específica no JSONB
   */
  updateMatchInJsonb: async (tournamentId: string, matchId: string, matchUpdates: Partial<Match>): Promise<void> => {
    try {
      // Primeiro, recuperar todas as partidas
      const matches = await TournamentJsonbService.getMatchesFromJsonb(tournamentId);
      
      // Verificar se a partida existe
      const matchExists = matches.some(match => match.id === matchId);
      if (!matchExists) {
        throw new Error(`Match with ID ${matchId} not found in tournament ${tournamentId}`);
      }
      
      // Encontrar e atualizar a partida específica
      let updateCount = 0;
      const updatedMatches = matches.map(match => {
        if (match.id === matchId) {
          updateCount++;
          return {
            ...match,
            ...matchUpdates,
            updatedAt: new Date().toISOString()
          };
        }
        return match;
      });

      // Verificar se houve exatamente uma atualização
      if (updateCount !== 1) {
        console.warn(`⚠️ Expected to update 1 match, but updated ${updateCount} matches with ID ${matchId}`);
      }

      // Salvar de volta
      await TournamentJsonbService.saveMatchesToJsonb(tournamentId, updatedMatches);
      
      console.log(`Updated match ${matchId} in JSONB`);
    } catch (error) {
      console.error('Error updating match in JSONB:', error);
      throw error;
    }
  },

  /**
   * Sincroniza partidas entre tournament_matches e JSONB
   * Usa JSONB como fonte da verdade
   */
  syncFromJsonbToTable: async (tournamentId: string): Promise<void> => {
    try {
      const matches = await TournamentJsonbService.getMatchesFromJsonb(tournamentId);
      
      if (matches.length === 0) {
        console.log('No matches in JSONB to sync');
        return;
      }

      // Deletar partidas existentes na tabela para este torneio
      await supabase
        .from('tournament_matches')
        .delete()
        .eq('tournament_id', tournamentId);

      // Inserir partidas do JSONB na tabela
      const insertData = matches.map(match => ({
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
      }));

      const { error } = await supabase
        .from('tournament_matches')
        .insert(insertData);

      if (error) {
        console.warn('Could not sync all matches to table:', error);
        // Não falhar, pois JSONB é a fonte da verdade
      }

      console.log(`Synced ${matches.length} matches from JSONB to table`);
    } catch (error) {
      console.error('Error syncing from JSONB to table:', error);
      // Não relançar erro, pois JSONB é a fonte da verdade
    }
  },

  /**
   * Carrega torneio completo usando JSONB como fonte principal
   */
  fetchTournamentFromJsonb: async (tournamentId: string): Promise<Tournament | null> => {
    try {
      // Buscar dados principais do torneio
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (tournamentError || !tournamentData) {
        console.error('Tournament not found:', tournamentError);
        return null;
      }

      // Recuperar partidas do JSONB
      const matches = await TournamentJsonbService.getMatchesFromJsonb(tournamentId);

      // Construir objeto Tournament
      const tournament: Tournament = {
        id: tournamentData.id,
        eventId: tournamentData.event_id,
        format: tournamentData.format,
        status: tournamentData.status || 'CREATED',
        settings: tournamentData.settings || {},
        totalRounds: tournamentData.total_rounds,
        currentRound: tournamentData.current_round || 0,
        groupsCount: tournamentData.groups_count || 0,
        thirdPlaceMatch: tournamentData.third_place_match || false,
        autoAdvance: tournamentData.auto_advance || false,
        startedAt: tournamentData.started_at,
        completedAt: tournamentData.completed_at,
        createdAt: tournamentData.created_at,
        updatedAt: tournamentData.updated_at,
        matches: matches,
        // Campos JSONB adicionais
        matchesData: tournamentData.matches_data || [],
        teamsData: tournamentData.teams_data || [],
        standingsData: tournamentData.standings_data || {},
        eliminationBracket: tournamentData.elimination_bracket || {}
      };

      console.log(`Fetched tournament ${tournamentId} with ${matches.length} matches from JSONB`);
      return tournament;
    } catch (error) {
      console.error('Error fetching tournament from JSONB:', error);
      return null;
    }
  }
};
