import { supabase } from '../../lib/supabase';
import { Match, Tournament } from '../../types';

// Função para converter dados do Supabase para nossos tipos
const transformMatch = (data: any): Match => ({
  id: data.id,
  eventId: data.event_id,
  round: data.round,
  position: data.position,
  team1: data.team1,
  team2: data.team2,
  score1: data.score1,
  score2: data.score2,
  winnerId: data.winner_id,
  completed: data.completed,
  scheduledTime: data.scheduled_time,
});

const transformTournament = (data: any, matches: Match[]): Tournament => ({
  id: data.id,
  eventId: data.event_id,
  rounds: data.rounds,
  matches: matches,
  status: data.status,
});

// Funções para converter nossos tipos para o formato do Supabase
const toSupabaseMatch = (match: Partial<Match>) => ({
  event_id: match.eventId,
  round: match.round,
  position: match.position,
  team1: match.team1,
  team2: match.team2,
  score1: match.score1,
  score2: match.score2,
  winner_id: match.winnerId,
  completed: match.completed,
  scheduled_time: match.scheduledTime,
});

const toSupabaseTournament = (tournament: Partial<Tournament>) => ({
  event_id: tournament.eventId,
  rounds: tournament.rounds,
  status: tournament.status,
});

export const TournamentService = {
  // Buscar torneio por evento
  async getByEventId(eventId: string): Promise<Tournament | null> {
    try {
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('event_id', eventId)
        .single();

      if (tournamentError) {
        if (tournamentError.code === 'PGRST116') {
          return null; // No rows returned
        }
        throw tournamentError;
      }

      if (!tournamentData) return null;

      const { data: matchesData, error: matchesError } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('event_id', eventId)
        .order('round', { ascending: true })
        .order('position', { ascending: true });

      if (matchesError) throw matchesError;

      const matches = matchesData.map(transformMatch);
      return transformTournament(tournamentData, matches);
    } catch (error) {
      console.error(`Error fetching tournament for event ${eventId}:`, error);
      throw error;
    }
  },

  // Criar um novo torneio
  async create(eventId: string, participants: string[]): Promise<Tournament> {
    try {
      // Verificar se já existe um torneio para este evento
      const existingTournament = await this.getByEventId(eventId);
      if (existingTournament) {
        throw new Error('Já existe um chaveamento criado para este evento.');
      }

      if (participants.length < 2) {
        throw new Error('É necessário pelo menos 2 participantes para criar um torneio.');
      }

      // Calcular número ideal de rounds baseado no número de participantes
      // Ex: 5-8 participantes -> 3 rounds, 9-16 participantes -> 4 rounds
      const totalParticipants = participants.length;
      const rounds = Math.ceil(Math.log2(totalParticipants));

      console.log(`Criando torneio com ${totalParticipants} participantes e ${rounds} rodadas`);

      // Criar o torneio
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .insert({
          event_id: eventId,
          rounds: rounds,
          status: 'CREATED',
        })
        .select()
        .single();

      if (tournamentError) throw tournamentError;

      // Embaralhar participantes para sorteio aleatório
      let shuffledParticipants = [...participants];
      shuffledParticipants = this.shuffleArray(shuffledParticipants);

      // Calcular o número total de partidas necessárias
      // A potência de 2 mais próxima que acomode todos os participantes
      const totalSlots = Math.pow(2, rounds);
      const numByes = totalSlots - totalParticipants; // Número de "byes" necessários
      
      console.log(`Total de slots: ${totalSlots}, Byes: ${numByes}`);
      
      // Preparar as partidas do torneio
      const matches: Partial<Match>[] = [];
      
      // Primera rodada: algumas equipes podem ter "bye" (passagem automática)
      const firstRoundMatches = totalSlots / 2;
      
      // Distribuir os byes de forma equilibrada (preferencialmente nas posições iniciais)
      let participantIndex = 0;
      for (let i = 0; i < firstRoundMatches; i++) {
        const position = i + 1;
        
        // Define os times da partida
        let team1 = null;
        let team2 = null;
        
        // Se ainda houver participantes, atribuir ao time 1
        if (participantIndex < shuffledParticipants.length) {
          team1 = [shuffledParticipants[participantIndex++]];
        }
        
        // Se ainda houver participantes, atribuir ao time 2
        if (participantIndex < shuffledParticipants.length) {
          team2 = [shuffledParticipants[participantIndex++]];
        }
        
        // Se um dos times for null, significa que é um "bye" - verificamos se é necessário
        if ((team1 === null || team2 === null) && numByes > 0) {
          // Marcar como completed e definir o vencedor se houver apenas um time
          const completed = (team1 === null || team2 === null) && !(team1 === null && team2 === null);
          const winnerId = team1 ? 'team1' : team2 ? 'team2' : null;
          
          matches.push({
            eventId,
            round: 1,
            position,
            team1,
            team2,
            completed,
            winnerId,
          });
        } else {
          // Partida normal com dois times ou vazia
          matches.push({
            eventId,
            round: 1,
            position,
            team1,
            team2,
            completed: false,
          });
        }
      }

      // Criar partidas para as demais rodadas (vazias inicialmente)
      let previousRoundMatches = firstRoundMatches;

      for (let round = 2; round <= rounds; round++) {
        const matchesInThisRound = previousRoundMatches / 2;
        
        for (let position = 1; position <= matchesInThisRound; position++) {
          matches.push({
            eventId,
            round,
            position,
            team1: null,
            team2: null,
            completed: false,
          });
        }
        
        previousRoundMatches = matchesInThisRound;
      }

      // Inserir todas as partidas
      const { data: matchesData, error: matchesError } = await supabase
        .from('tournament_matches')
        .insert(matches.map(toSupabaseMatch))
        .select();

      if (matchesError) throw matchesError;

      // Processa automaticamente os "byes" para avançar times para a próxima rodada
      await this.processAdvancementsAfterCreation(eventId, matchesData.map(transformMatch));

      // Busca os dados atualizados após o processamento dos "byes"
      const { data: updatedMatches, error: updatedError } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('event_id', eventId)
        .order('round', { ascending: true })
        .order('position', { ascending: true });
        
      if (updatedError) throw updatedError;

      const transformedMatches = updatedMatches.map(transformMatch);
      return transformTournament(tournamentData, transformedMatches);
    } catch (error) {
      console.error(`Error creating tournament for event ${eventId}:`, error);
      throw error;
    }
  },

  // Processa automaticamente os avanços para times com "bye"
  async processAdvancementsAfterCreation(eventId: string, matches: Match[]): Promise<void> {
    try {
      // Pegar todas as partidas da primeira rodada com vencedor definido (byes)
      const firstRoundMatches = matches.filter(m => m.round === 1 && m.winnerId);
      
      // Para cada partida com vencedor já definido, avançar o time para próxima rodada
      for (const match of firstRoundMatches) {
        const nextRound = match.round + 1;
        const nextPosition = Math.ceil(match.position / 2);

        // Determinar qual time (1 ou 2) avança
        const isOddPosition = match.position % 2 === 1;
        const teamField = isOddPosition ? 'team1' : 'team2';
        const winningTeam = match.winnerId === 'team1' ? match.team1 : match.team2;

        // Identificar partida da próxima rodada
        const nextMatchIndex = matches.findIndex(
          m => m.round === nextRound && m.position === nextPosition
        );

        if (nextMatchIndex !== -1) {
          // Atualizar a partida da próxima rodada com o vencedor
          const { error } = await supabase
            .from('tournament_matches')
            .update({ [teamField]: winningTeam })
            .eq('event_id', eventId)
            .eq('round', nextRound)
            .eq('position', nextPosition);

          if (error) throw error;
        }
      }
    } catch (error) {
      console.error('Error processing automatic advancements:', error);
      throw error;
    }
  },

  // Função para embaralhar array (algoritmo de Fisher-Yates)
  shuffleArray(array: any[]) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  },

  // Atualizar uma partida
  async updateMatch(matchId: string, score1: number, score2: number): Promise<Match> {
    try {
      // Determinar o vencedor
      let winnerId = null;
      if (score1 > score2) winnerId = 'team1';
      else if (score2 > score1) winnerId = 'team2';
      else throw new Error('Não é permitido empate. Um time deve ter pontuação maior.');

      const { data, error } = await supabase
        .from('tournament_matches')
        .update({
          score1,
          score2,
          winner_id: winnerId,
          completed: true,
        })
        .eq('id', matchId)
        .select()
        .single();

      if (error) throw error;
      
      // Buscar a partida atualizada
      const updatedMatch = transformMatch(data);

      // Avançar o time vencedor para a próxima rodada
      await this.advanceWinnerToNextRound(updatedMatch);

      return updatedMatch;
    } catch (error) {
      console.error(`Error updating match ${matchId}:`, error);
      throw error;
    }
  },

  // Avançar o vencedor para a próxima rodada
  async advanceWinnerToNextRound(match: Match): Promise<void> {
    try {
      if (!match.winnerId) return;

      const nextRound = match.round + 1;
      const nextPosition = Math.ceil(match.position / 2);

      // Determinar qual time (1 ou 2) avança
      const isOddPosition = match.position % 2 === 1;
      const teamField = isOddPosition ? 'team1' : 'team2';
      const winningTeam = match.winnerId === 'team1' ? match.team1 : match.team2;

      // Buscar a partida da próxima rodada
      const { data, error } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('event_id', match.eventId)
        .eq('round', nextRound)
        .eq('position', nextPosition)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') throw error; // Ignora se não encontrar (final do torneio)
        return;
      }

      // Atualizar a próxima partida com o time vencedor
      const { error: updateError } = await supabase
        .from('tournament_matches')
        .update({ [teamField]: winningTeam })
        .eq('id', data.id);

      if (updateError) throw updateError;

      // Verificar se ambos os times da próxima partida já estão definidos
      const nextMatch = transformMatch(data);
      const otherTeamField = isOddPosition ? 'team2' : 'team1';
      
      // Se a próxima partida já tiver ambos os times e um deles for vencedor por WO,
      // avançar automaticamente o vencedor
      if (nextMatch[teamField] && nextMatch[otherTeamField]) {
        const team1Empty = !nextMatch.team1 || nextMatch.team1.length === 0;
        const team2Empty = !nextMatch.team2 || nextMatch.team2.length === 0;
        
        if (team1Empty !== team2Empty) { // Um time presente e outro ausente = WO
          const autoWinnerId = team1Empty ? 'team2' : 'team1';
          
          await supabase
            .from('tournament_matches')
            .update({ 
              completed: true, 
              winner_id: autoWinnerId,
              score1: autoWinnerId === 'team1' ? 1 : 0,
              score2: autoWinnerId === 'team2' ? 1 : 0 
            })
            .eq('id', nextMatch.id);
            
          // Recursivamente avança o vencedor automático
          const updatedNextMatch = {
            ...nextMatch,
            completed: true,
            winnerId: autoWinnerId,
            score1: autoWinnerId === 'team1' ? 1 : 0,
            score2: autoWinnerId === 'team2' ? 1 : 0
          };
          
          await this.advanceWinnerToNextRound(updatedNextMatch);
        }
      }
    } catch (error) {
      console.error(`Error advancing winner to next round:`, error);
      throw error;
    }
  },

  // Atualizar status do torneio
  async updateStatus(tournamentId: string, status: 'CREATED' | 'STARTED' | 'FINISHED'): Promise<Tournament> {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .update({ status })
        .eq('id', tournamentId)
        .select()
        .single();

      if (error) throw error;

      // Buscar as partidas do torneio
      const { data: matchesData, error: matchesError } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('event_id', data.event_id)
        .order('round', { ascending: true })
        .order('position', { ascending: true });

      if (matchesError) throw matchesError;

      const matches = matchesData.map(transformMatch);
      return transformTournament(data, matches);
    } catch (error) {
      console.error(`Error updating tournament status ${tournamentId}:`, error);
      throw error;
    }
  }
};
