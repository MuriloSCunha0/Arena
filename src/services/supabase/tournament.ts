import { supabase } from '../../lib/supabase';
import { Match, Tournament, Court } from '../../types';

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

// Add transformCourt function
const transformCourt = (data: any): Court => ({
  id: data.id,
  name: data.name,
  location: data.location,
  type: data.type, // Map from Supabase column
  status: data.status, // Map from Supabase column
  surface: data.surface,
  indoor: data.indoor,
  active: data.active,
  imageUrl: data.image_url,
  description: data.description,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
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
        .maybeSingle(); // Use maybeSingle() for robustness

      // Handle potential errors (excluding 'zero rows' which maybeSingle handles)
      if (tournamentError) {
         console.error(`Supabase error fetching tournament for event ${eventId}:`, tournamentError);
         // Rethrow unexpected errors
         throw new Error(`Failed to fetch tournament: ${tournamentError.message}`);
      }

      // If no data is returned, the tournament doesn't exist
      if (!tournamentData) {
        console.log(`No tournament found for event ${eventId}.`);
        return null;
      }

      // Fetch matches only if tournament exists
      const { data: matchesData, error: matchesError } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('event_id', eventId) // Use eventId for consistency, assuming matches also have event_id
        // .eq('tournament_id', tournamentData.id) // Alternatively, use tournament_id if event_id isn't on matches
        .order('round', { ascending: true })
        .order('position', { ascending: true });

      if (matchesError) {
        console.error(`Supabase error fetching matches for event ${eventId}:`, matchesError);
        throw new Error(`Failed to fetch matches: ${matchesError.message}`);
      }

      const matches = matchesData ? matchesData.map(transformMatch) : [];
      return transformTournament(tournamentData, matches);
      
    } catch (error) {
      // Catch and log any re-thrown or unexpected errors
      console.error(`General error in getByEventId for event ${eventId}:`, error);
      // Avoid re-throwing here unless necessary for upstream handling
      // Re-throwing might trigger generic error notifications in the UI
      // Consider returning null or a specific error state if needed
      return null; // Or throw error; depending on desired UI behavior
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
      // Ensure both team fields exist on nextMatch before accessing them
      if (nextMatch && nextMatch[teamField] && nextMatch[otherTeamField]) {
        const team1Empty = !nextMatch.team1 || nextMatch.team1.length === 0;
        const team2Empty = !nextMatch.team2 || nextMatch.team2.length === 0;
        
        if (team1Empty !== team2Empty) { // Um time presente e outro ausente = WO
          // Correctly type autoWinnerId
          const autoWinnerId: 'team1' | 'team2' = team1Empty ? 'team2' : 'team1';
          
          await supabase
            .from('tournament_matches')
            .update({ 
              completed: true, 
              winner_id: autoWinnerId,
              score1: autoWinnerId === 'team1' ? 1 : 0, // Simplified WO score
              score2: autoWinnerId === 'team2' ? 1 : 0 
            })
            .eq('id', nextMatch.id);
            
          // Recursivamente avança o vencedor automático
          const updatedNextMatch: Match = { // Ensure this conforms to Match type
            ...nextMatch,
            completed: true,
            winnerId: autoWinnerId, // Assign the correctly typed winnerId
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
  },

  /**
   * Gera o chaveamento do torneio com suporte a "bye" (pular duplas)
   * e distribuição automática nas quadras
   */
  async generateBracketWithCourts(
    eventId: string, 
    participantIds: string[],
    skipTeamIds: string[] = [], // IDs de times que recebem bye
    courts?: Court[], // Quadras disponíveis
    options?: { forceReset?: boolean } // Add options parameter with forceReset flag
  ): Promise<Tournament> {
    try {
      // Verifica se já existe um torneio para este evento
      const { data: existingTournament, error: fetchError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle(); // Use maybeSingle instead of single to avoid error when not found
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking for existing tournament:', fetchError);
        throw new Error(`Failed to check for existing tournament: ${fetchError.message}`);
      }
      
      // If tournament exists and not forcing reset, throw error
      if (existingTournament && !options?.forceReset) {
        throw new Error('Já existe um torneio criado para este evento');
      }
      
      // If we're forcing a reset, delete the existing tournament and its matches
      if (existingTournament && options?.forceReset) {
        console.log(`Force reset requested. Deleting existing tournament for event ${eventId}`);
        
        // First delete all matches
        const { error: deleteMatchesError } = await supabase
          .from('tournament_matches')
          .delete()
          .eq('event_id', eventId);
          
        if (deleteMatchesError) {
          console.error('Error deleting existing matches:', deleteMatchesError);
          throw new Error(`Failed to reset tournament: ${deleteMatchesError.message}`);
        }
        
        // Then delete the tournament
        const { error: deleteTournamentError } = await supabase
          .from('tournaments')
          .delete()
          .eq('id', existingTournament.id);
          
        if (deleteTournamentError) {
          console.error('Error deleting existing tournament:', deleteTournamentError);
          throw new Error(`Failed to reset tournament: ${deleteTournamentError.message}`);
        }
      }
      
      // Calcula o número de rodadas necessário para acomodar todos os participantes
      const numParticipants = participantIds.length;
      const numRounds = Math.ceil(Math.log2(numParticipants));
      const numMatches = Math.pow(2, numRounds) - 1;
      
      // Cria o torneio
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .insert({
          event_id: eventId,
          rounds: numRounds,
          status: 'CREATED'
        })
        .select()
        .single();
      
      if (tournamentError) throw tournamentError;
      
      // Organiza os participantes em times
      let teams = [...participantIds];
      
      // Adiciona "byes" (passes automáticos) para os times selecionados
      // e para completar o número ideal de participantes
      const totalSlots = Math.pow(2, numRounds);
      const byesNeeded = totalSlots - teams.length;
      
      // Organiza participantes em times e byes
      const matchParticipants = [];
      let remainingTeams = [...teams];
      
      // Primeiro, adiciona os times que devem receber "bye" (se houver)
      for (const skipTeamId of skipTeamIds) {
        // Encontra o time na lista de times
        const foundIndex = remainingTeams.findIndex(teamId => teamId === skipTeamId);
        if (foundIndex >= 0) {
          // Adiciona o time como participante único de uma partida
          matchParticipants.push([remainingTeams[foundIndex], null]);
          remainingTeams.splice(foundIndex, 1);
        }
      }
      
      // Distribui os times restantes em partidas
      while (remainingTeams.length > 0) {
        if (remainingTeams.length >= 2) {
          // Cria um match com dois times
          matchParticipants.push([remainingTeams[0], remainingTeams[1]]);
          remainingTeams.splice(0, 2);
        } else {
          // Último time recebe um "bye" automático
          matchParticipants.push([remainingTeams[0], null]);
          remainingTeams.splice(0, 1);
        }
      }
      
      // Adiciona "byes" adicionais se necessário para completar o chaveamento
      while (matchParticipants.length < totalSlots / 2) {
        matchParticipants.push([null, null]);
      }
      
      // Cria as partidas iniciais e planeja as partidas subsequentes
      const matches = [];
      let courtIndex = 0;
      
      // Função auxiliar para atribuir uma quadra
      const getNextCourt = () => {
        if (!courts || courts.length === 0) return null;
        const court = courts[courtIndex];
        courtIndex = (courtIndex + 1) % courts.length; // Rotaciona entre as quadras
        return court.id;
      };
      
      // Primeira rodada - com os participantes iniciais
      for (let i = 0; i < matchParticipants.length; i++) {
        const [team1, team2] = matchParticipants[i];
        const courtId = getNextCourt();
        
        // Marca como completo se for uma partida de "bye"
        const isByeMatch = (team1 === null || team2 === null) && !(team1 === null && team2 === null);
        const completed = isByeMatch;
        const winnerId = isByeMatch ? (team1 !== null ? team1 : team2) : null;
        
        matches.push({
          tournament_id: tournament.id,
          round: 1,
          position: i + 1,
          team1: team1 ? [team1] : [],
          team2: team2 ? [team2] : [],
          score1: completed ? 0 : null,
          score2: completed ? 0 : null,
          winner_id: winnerId,
          completed,
          court_id: courtId
        });
      }
      
      // Rounds seguintes - sem participantes ainda, apenas planejamento
      let matchPosition = 1;
      for (let round = 2; round <= numRounds; round++) {
        const matchesInRound = Math.pow(2, numRounds - round);
        
        for (let i = 0; i < matchesInRound; i++) {
          const courtId = getNextCourt();
          
          matches.push({
            tournament_id: tournament.id,
            round,
            position: i + 1,
            team1: [],
            team2: [],
            score1: null,
            score2: null,
            winner_id: null,
            completed: false,
            court_id: courtId
          });
          
          matchPosition++;
        }
      }
      
      // Insere todas as partidas no banco de dados
      const { error: matchesError } = await supabase
        .from('tournament_matches')
        .insert(matches);
      
      if (matchesError) throw matchesError;
      
      // Busca todas as partidas criadas para retornar com o torneio
      const { data: createdMatches, error: fetchMatchesError } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournament.id)
        .order('round')
        .order('position');
      
      if (fetchMatchesError) throw fetchMatchesError;
      
      return {
        id: tournament.id,
        eventId: tournament.event_id,
        rounds: tournament.rounds,
        matches: createdMatches.map(transformMatch),
        status: tournament.status
      };
    } catch (error) {
      console.error('Error generating tournament bracket:', error);
      throw error;
    }
  },
  
  /**
   * Atribui uma quadra a uma partida
   */
  async assignCourtToMatch(matchId: string, courtId: string, reservationId?: string): Promise<Match> {
    try {
      const { data, error } = await supabase
        .from('tournament_matches')
        .update({
          court_id: courtId,
          court_reservation_id: reservationId
        })
        .eq('id', matchId)
        .select()
        .single();
        
      if (error) throw error;
      return transformMatch(data);
    } catch (error) {
      console.error(`Error assigning court to match ${matchId}:`, error);
      throw error;
    }
  },
  
  /**
   * Atualiza o horário agendado de uma partida
   */
  async updateMatchSchedule(matchId: string, scheduledTime: string): Promise<Match> {
    try {
      const { data, error } = await supabase
        .from('tournament_matches')
        .update({
          scheduled_time: scheduledTime
        })
        .eq('id', matchId)
        .select()
        .single();
        
      if (error) throw error;
      return transformMatch(data);
    } catch (error) {
      console.error(`Error updating match schedule ${matchId}:`, error);
      throw error;
    }
  },
};

/**
 * Generate a tournament bracket with court assignments
 */
export const generateBracketWithCourts = async (
  eventId: string,
  participants: any[], // Consider using a more specific type if possible
  courtAssignments: Record<string, string[]>,
  options: { forceReset?: boolean } = {}
): Promise<any> => { // Consider returning a more specific type like Tournament
  try {
    // First check if a tournament already exists for this event
    const { data: existingTournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('event_id', eventId)
      .maybeSingle(); // Use maybeSingle instead of single() to avoid error when no record found
    
    if (tournamentError && tournamentError.code !== 'PGRST116') {
      console.error('Error checking for existing tournament:', tournamentError);
      throw new Error(`Failed to check for existing tournament: ${tournamentError.message}`);
    }
    
    // If tournament exists and not forcing reset, notify the user
    if (existingTournament && !options.forceReset) {
      throw new Error('Já existe um torneio criado para este evento');
    }
    
    // Tournament ID (existing or new)
    let tournamentId = existingTournament?.id;
    
    // If we're forcing a reset, delete existing tournament matches
    if (existingTournament && options.forceReset) {
      // Delete existing matches
      const { error: deleteError } = await supabase // Capture delete error
        .from('tournament_matches')
        .delete()
        .eq('tournament_id', tournamentId); // Use tournamentId if available

      // Handle potential delete error
      if (deleteError) {
         console.error('Error deleting existing matches:', deleteError);
         throw new Error(`Failed to reset tournament matches: ${deleteError.message}`);
      }
      // If not forcing reset, but tournament exists, we already threw an error above.
      // If tournament doesn't exist, we proceed to create it.
    }

    // If tournament doesn't exist OR we are resetting, create/recreate it
    if (!existingTournament || options.forceReset) {
        // If resetting an existing tournament, we might want to update it instead of creating a new one
        // For simplicity now, let's assume we always create if it doesn't exist or if reset is forced
        // (This might lead to orphaned tournaments if reset fails later)

        // Delete the old tournament record if resetting
        if (existingTournament && options.forceReset && tournamentId) {
             await supabase.from('tournaments').delete().eq('id', tournamentId);
             tournamentId = undefined; // Clear the old ID
        }


        // Calculate rounds based on participant pairs (matches)
        const numMatchesRound1 = participants.length; // participants here are match pairs
        const numRounds = Math.ceil(Math.log2(numMatchesRound1 * 2)); // Calculate rounds based on teams

        // Create the tournament record
        const { data: newTournamentData, error: createTournamentError } = await supabase
            .from('tournaments')
            .insert({
                event_id: eventId,
                rounds: numRounds,
                status: 'CREATED',
                bracket_generation_time: new Date().toISOString() // Add generation time
            })
            .select()
            .single();

        if (createTournamentError) {
            console.error('Error creating new tournament record:', createTournamentError);
            throw new Error(`Failed to create tournament: ${createTournamentError.message}`);
        }
        tournamentId = newTournamentData.id; // Get the new tournament ID
    }


    // --- Generate Matches ---
    const matchesToInsert: Partial<Match>[] = [];
    const numRounds = Math.ceil(Math.log2(participants.length * 2)); // Recalculate rounds if needed
    const totalSlots = Math.pow(2, numRounds);

    // Round 1 matches from the animation/participants input
    participants.forEach((matchPair, index) => {
        const team1Id = matchPair[0];
        const team2Id = matchPair[1];
        const matchKey = `${team1Id}|${team2Id}`; // Or however the key is formed
        const assignedCourtIds = courtAssignments[matchKey] || []; // Get assigned court(s)

        matchesToInsert.push({
            eventId: eventId,
            // tournament_id: tournamentId, // Add tournament_id if your table uses it
            round: 1,
            position: index + 1,
            team1: team1Id ? [team1Id] : null, // Assuming single participant ID per team for now
            team2: team2Id ? [team2Id] : null,
            completed: false,
            courtId: assignedCourtIds.length > 0 ? assignedCourtIds[0] : null, // Assign first court if any
            // scheduledTime: Calculate or set default time?
        });
    });

     // Create placeholder matches for subsequent rounds
    let previousRoundMatches = participants.length;
    for (let round = 2; round <= numRounds; round++) {
        const matchesInThisRound = previousRoundMatches / 2;
        for (let position = 1; position <= matchesInThisRound; position++) {
            matchesToInsert.push({
                eventId: eventId,
                // tournament_id: tournamentId,
                round: round,
                position: position,
                team1: null,
                team2: null,
                completed: false,
            });
        }
        previousRoundMatches = matchesInThisRound;
    }


    // Insert all matches
    const { data: insertedMatches, error: insertMatchesError } = await supabase
        .from('tournament_matches')
        .insert(matchesToInsert.map(m => ({ ...toSupabaseMatch(m), tournament_id: tournamentId }))) // Ensure tournament_id is included if needed
        .select();

    if (insertMatchesError) {
        console.error('Error inserting tournament matches:', insertMatchesError);
        // Consider cleanup if matches fail to insert after tournament creation/reset
        throw new Error(`Failed to insert matches: ${insertMatchesError.message}`);
    }

    // Fetch the complete tournament data to return
    const finalTournament = await TournamentService.getByEventId(eventId); // Use existing service method
    return finalTournament;


  } catch (error) {
    // Complete the catch block
    console.error('Error in generateBracketWithCourts:', error);
    // Re-throw the error or handle it appropriately
    throw error; // Re-throwing is often useful for upstream handling (e.g., showing notifications)
  }
};
