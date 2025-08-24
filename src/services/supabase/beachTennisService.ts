import { BeachTennisScore } from '../../types/tournament';
import { Match } from '../../types';
import { TournamentService } from './tournament';
import { useTournamentStore } from '../../store/tournamentStore';

/**
 * Serviço para gerenciar partidas do Beach Tennis
 */
export const BeachTennisService = {
  /**
   * Converte BeachTennisScore para formato score1/score2 simples
   * Para Beach Tennis em 1 set, usa os games diretamente
   * NOVA REGRA: Em caso de tiebreak (6-6), o vencedor recebe +1 no placar final
   */
  convertBeachTennisScoreToSimpleScore: (beachScore: BeachTennisScore): { score1: number; score2: number } => {
    // Para o Beach Tennis em formato de 1 set, mostrar os games diretamente
    if (beachScore.sets.length > 0) {
      const firstSet = beachScore.sets[0];
      
      // NOVA LÓGICA: Se houve tiebreak (6-6), o vencedor ganha +1 no placar
      if (firstSet.tiebreak && firstSet.team1Games === 6 && firstSet.team2Games === 6) {
        if (firstSet.tiebreak.team1Points > firstSet.tiebreak.team2Points) {
          // Team 1 ganhou o tiebreak: 7-6
          return { score1: 7, score2: 6 };
        } else {
          // Team 2 ganhou o tiebreak: 6-7
          return { score1: 6, score2: 7 };
        }
      }
      
      // Caso normal (sem tiebreak ou não foi 6-6): usar games diretamente
      return { 
        score1: firstSet.team1Games, 
        score2: firstSet.team2Games 
      };
    }

    // Fallback para múltiplos sets (contagem de sets ganhos)
    let team1Sets = 0;
    let team2Sets = 0;

    beachScore.sets.forEach(set => {
      if (set.tiebreak && set.team1Games === 6 && set.team2Games === 6) {
        // NOVA LÓGICA: Tiebreak em 6-6 - vencedor ganha o set
        if (set.tiebreak.team1Points > set.tiebreak.team2Points) {
          team1Sets++;
        } else if (set.tiebreak.team2Points > set.tiebreak.team1Points) {
          team2Sets++;
        }
      } else {
        // Set normal - quem ganhou mais games (mínimo 4 games para validar)
        if (set.team1Games > set.team2Games && set.team1Games >= 4) {
          team1Sets++;
        } else if (set.team2Games > set.team1Games && set.team2Games >= 4) {
          team2Sets++;
        }
      }
    });

    return { score1: team1Sets, score2: team2Sets };
  },

  /**
   * Salva resultado de partida do Beach Tennis
   */
  saveMatchResult: async (matchId: string, beachTennisScore: BeachTennisScore, walkover?: boolean): Promise<void> => {
    try {
      console.log(`🏐 [BeachTennisService] Salvando resultado da partida ${matchId}`, beachTennisScore);

      // Converter BeachTennisScore para score simples
      const { score1, score2 } = BeachTennisService.convertBeachTennisScoreToSimpleScore(beachTennisScore);
      
      console.log(`🏐 [BeachTennisService] Score convertido: ${score1}x${score2}`);

      // Obter o torneio atual
      const currentTournament = useTournamentStore.getState().tournament;
      if (!currentTournament) {
        throw new Error('Torneio não encontrado');
      }

      // Encontrar a partida
      const match = currentTournament.matches?.find(m => m.id === matchId);
      if (!match) {
        throw new Error('Partida não encontrada');
      }

      // Atualizar a partida com os dados completos do Beach Tennis
      const updatedMatch: Match = {
        ...match,
        score1,
        score2,
        winnerId: beachTennisScore.winnerId,
        completed: beachTennisScore.completed,
        walkover: walkover || false,
        beachTennisScore, // Salvar o score completo do Beach Tennis
        updatedAt: new Date().toISOString()
      };

      // Salvar usando o serviço padrão
      await TournamentService.updateMatchResults(matchId, score1, score2);

      // Atualizar o estado local com os dados completos do Beach Tennis
      const updatedMatches = currentTournament.matches?.map(m => 
        m.id === matchId ? updatedMatch : m
      ) || [];

      const updatedTournament = {
        ...currentTournament,
        matches: updatedMatches
      };

      // Atualizar estado imediatamente
      useTournamentStore.setState({ tournament: updatedTournament });

      console.log(`✅ [BeachTennisService] Resultado salvo com sucesso - ${score1}x${score2}`);

    } catch (error) {
      console.error('❌ [BeachTennisService] Erro ao salvar resultado:', error);
      throw error;
    }
  }
};
