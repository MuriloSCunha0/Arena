import { supabase } from '../../lib/supabase';
import { Tournament, Match, Team } from '../../types';

export interface TournamentHistoryEntry {
  id: string;
  eventId: string;
  tournamentId: string;
  name: string;
  format: string;
  status: string;
  position?: number;
  isWinner?: boolean;
  completedAt?: string;
  matchesWon?: number;
  matchesLost?: number;
  totalMatches?: number;
  teams?: Team[];
  partnersNames?: string[];
  createdAt: string;
}

export interface UserTournamentStats {
  totalTournaments: number;
  tournamentsWon: number;
  matchesWon: number;
  matchesLost: number;
  winRate: number;
  averagePosition: number;
  lastUpdate: string;
}

export const TournamentHistoryService = {
  /**
   * Salva o histórico de um torneio para todos os participantes
   */
  async saveTournamentHistory(
    tournament: Tournament,
    matches: Match[],
    teams: Team[]
  ): Promise<void> {
    try {
      console.log(`🏆 Saving tournament history for ${teams.length} teams`);
      
      // Preparar dados do torneio
      const tournamentData = {
        id: tournament.id,
        eventId: tournament.eventId,
        tournamentId: tournament.id,
        name: `Torneio ${tournament.id}`,
        format: tournament.format,
        status: tournament.status,
        completedAt: tournament.completedAt,
        createdAt: tournament.createdAt
      };
      
      // Processar cada equipe
      for (const team of teams) {
        const teamMatches = matches.filter(match => 
          match.team1 === team.participants || match.team2 === team.participants
        );
        
        const matchesWon = teamMatches.filter(match => 
          match.completed && 
          ((match.team1 === team.participants && match.winnerId === 'team1') ||
           (match.team2 === team.participants && match.winnerId === 'team2'))
        ).length;
        
        const matchesLost = teamMatches.filter(match => 
          match.completed && 
          ((match.team1 === team.participants && match.winnerId === 'team2') ||
           (match.team2 === team.participants && match.winnerId === 'team1'))
        ).length;
        
        // Determinar posição e se é vencedor
        const position = this.calculateTeamPosition(team, teams, matches);
        const isWinner = position === 1;
        
        const historyEntry: TournamentHistoryEntry = {
          ...tournamentData,
          position,
          isWinner,
          matchesWon,
          matchesLost,
          totalMatches: teamMatches.length,
          teams: [team],
          partnersNames: team.participants,
          createdAt: new Date().toISOString()
        };
        
        // Salvar histórico para cada participante da equipe
        for (const participantName of team.participants) {
          await this.saveUserTournamentHistory(participantName, historyEntry);
        }
      }
      
      console.log('✅ Tournament history saved successfully');
      
    } catch (error) {
      console.error('Error saving tournament history:', error);
      throw error;
    }
  },

  /**
   * Salva o histórico de torneio para um usuário específico
   */
  async saveUserTournamentHistory(
    participantName: string,
    historyEntry: TournamentHistoryEntry
  ): Promise<void> {
    try {
      console.log(`📊 Saving tournament history for ${participantName}`);
      
      // Buscar ou criar usuário
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('name', participantName)
        .maybeSingle();
      
      if (userError && userError.code !== 'PGRST116') {
        console.error('Error fetching user:', userError);
        return;
      }
      
      let userId: string;
      let existingTournamentHistory: TournamentHistoryEntry[] = [];
      
      if (user) {
        userId = user.id;
        existingTournamentHistory = user.tournaments_history || [];
      } else {
        // Criar novo usuário
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            name: participantName,
            tournaments_history: [],
            statistics: null
          })
          .select()
          .single();
        
        if (createError) {
          console.error('Error creating user:', createError);
          return;
        }
        
        userId = newUser.id;
      }
      
      // Verificar se já existe histórico para este torneio
      const existingEntryIndex = existingTournamentHistory.findIndex(
        entry => entry.tournamentId === historyEntry.tournamentId
      );
      
      if (existingEntryIndex !== -1) {
        // Atualizar entrada existente
        existingTournamentHistory[existingEntryIndex] = historyEntry;
      } else {
        // Adicionar nova entrada
        existingTournamentHistory.push(historyEntry);
      }
      
      // Calcular estatísticas atualizadas
      const newStats = this.calculateUserStats(existingTournamentHistory);
      
      // Atualizar usuário
      const { error: updateError } = await supabase
        .from('users')
        .update({
          tournaments_history: existingTournamentHistory,
          statistics: newStats
        })
        .eq('id', userId);
      
      if (updateError) {
        console.error('Error updating user tournament history:', updateError);
        return;
      }
      
      console.log(`✅ Tournament history saved for ${participantName}`);
      
    } catch (error) {
      console.error('Error saving user tournament history:', error);
    }
  },

  /**
   * Calcula estatísticas do usuário baseado no histórico de torneios
   */
  calculateUserStats(history: TournamentHistoryEntry[]): UserTournamentStats {
    const completedTournaments = history.filter(entry => entry.status === 'FINISHED');
    
    const totalTournaments = completedTournaments.length;
    const tournamentsWon = completedTournaments.filter(entry => entry.isWinner).length;
    const matchesWon = completedTournaments.reduce((sum, entry) => sum + (entry.matchesWon || 0), 0);
    const matchesLost = completedTournaments.reduce((sum, entry) => sum + (entry.matchesLost || 0), 0);
    const totalMatches = matchesWon + matchesLost;
    const winRate = totalMatches > 0 ? (matchesWon / totalMatches) * 100 : 0;
    
    const positions = completedTournaments
      .filter(entry => entry.position !== undefined)
      .map(entry => entry.position!);
    
    const averagePosition = positions.length > 0 
      ? positions.reduce((sum, pos) => sum + pos, 0) / positions.length 
      : 0;
    
    return {
      totalTournaments,
      tournamentsWon,
      matchesWon,
      matchesLost,
      winRate: Math.round(winRate * 100) / 100,
      averagePosition: Math.round(averagePosition * 100) / 100,
      lastUpdate: new Date().toISOString()
    };
  },

  /**
   * Calcula a posição de uma equipe no torneio
   */
  calculateTeamPosition(team: Team, allTeams: Team[], matches: Match[]): number {
    // Ordenar equipes por vitórias (implementação simplificada)
    const teamStats = allTeams.map(t => {
      const tMatches = matches.filter(m => m.team1 === t.participants || m.team2 === t.participants);
      const tWins = tMatches.filter(m => 
        m.completed && 
        ((m.team1 === t.participants && m.winnerId === 'team1') ||
         (m.team2 === t.participants && m.winnerId === 'team2'))
      ).length;
      return { team: t, wins: tWins };
    });
    
    teamStats.sort((a, b) => b.wins - a.wins);
    
    const position = teamStats.findIndex(t => t.team === team) + 1;
    return position;
  },

  /**
   * Busca o histórico de torneios de um usuário
   */
  async getUserTournamentHistory(participantName: string): Promise<{
    history: TournamentHistoryEntry[];
    stats: UserTournamentStats | null;
  }> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('tournaments_history, statistics')
        .eq('name', participantName)
        .maybeSingle();
      
      if (error || !user) {
        return { history: [], stats: null };
      }
      
      return {
        history: user.tournaments_history || [],
        stats: user.statistics || null
      };
      
    } catch (error) {
      console.error('Error fetching user tournament history:', error);
      return { history: [], stats: null };
    }
  }
};
