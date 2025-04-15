import { supabase } from '../lib/supabase';
import { Tournament, Match, Court } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Helper function to handle Supabase errors with more details
const handleSupabaseError = (error: any, context: string) => {
  console.error(`Error in ${context}:`, error);
  
  // Create a more informative error message
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
  
  // Return a new error with the improved message
  throw new Error(message);
};

export const TournamentService = {
  getByEventId: async (eventId: string): Promise<Tournament> => {
    try {
      const { data: tournament, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('event_id', eventId)
        .single();
      
      if (error) throw error;
      
      // Now fetch matches with more robust error handling
      const { data: matches, error: matchesError } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournament.id)
        .order('round', { ascending: true })
        .order('position', { ascending: true });
      
      if (matchesError) throw matchesError;
      
      // Validar e corrigir dados das partidas
      const validatedMatches = matches
        .filter(match => match !== null) // Filtrar matches nulos
        .map(match => ({
          id: match.id,
          eventId: match.event_id,
          round: match.round || 1, // Garantir que round não seja nulo
          position: match.position || 0, // Garantir que position não seja nula
          team1: match.team1,
          team2: match.team2,
          score1: match.score1,
          score2: match.score2,
          winnerId: match.winner_id,
          completed: match.completed || false,
          courtId: match.court_id,
          scheduledTime: match.scheduled_time
        }));
      
      // Return tournament with validated matches
      return {
        ...tournament,
        matches: validatedMatches
      };
    } catch (error) {
      handleSupabaseError(error, 'getByEventId');
      throw error; // This will be caught by the calling code
    }
  },
  
  generateBracketWithCourts: async (
    eventId: string, 
    participantIds: string[],
    skipTeamIds: string[] = [],
    courts: Court[] = []
  ): Promise<Tournament> => {
    try {
      // Validate input
      if (!eventId || !participantIds || participantIds.length < 2) {
        throw new Error("É necessário pelo menos 2 participantes para gerar o chaveamento");
      }

      // Log what we're trying to do for debugging
      console.log(`Generating bracket for event ${eventId} with ${participantIds.length} participants`);
      console.log(`Skip team IDs: ${skipTeamIds.length > 0 ? skipTeamIds.join(', ') : 'none'}`);
      console.log(`Courts available: ${courts.length}`);

      // Calculate number of rounds needed
      const totalParticipants = participantIds.length;
      const numRounds = Math.ceil(Math.log2(totalParticipants));

      // Create tournament record with correct rounds count
      const tournamentId = uuidv4();
      const timestamp = new Date().toISOString();
      
      // Use a transaction to ensure data consistency
      const { data: tournament, error: txError } = await supabase
        .rpc('create_tournament_with_matches', {
          p_tournament_id: tournamentId,
          p_event_id: eventId,
          p_rounds: numRounds,
          p_created_at: timestamp,
          p_updated_at: timestamp
        });
        
      if (txError) {
        console.error("Failed to create tournament:", txError);
        throw new Error(`Falha ao criar torneio: ${txError.message || 'Erro desconhecido'}`);
      }
      
      // Generate bracket structure
      const matches = generateBracketMatches(tournamentId, participantIds, skipTeamIds, courts);
      
      // Insert all matches with proper error handling
      const { error: matchesError } = await supabase
        .from('tournament_matches')
        .insert(matches.map(match => ({
          id: match.id, // Include the UUID we generated
          tournament_id: tournamentId, // Use tournamentId for database field
          event_id: eventId, // Match eventId with tournament eventId
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
          created_at: timestamp,
          updated_at: timestamp
        })));
      
      if (matchesError) {
        // If match insertion fails, clean up the tournament
        await supabase.from('tournaments').delete().eq('id', tournamentId);
        throw new Error(`Falha ao criar partidas: ${matchesError.message || 'Erro desconhecido'}`);
      }
      
      // Fetch the newly created tournament with matches to return
      return await TournamentService.getByEventId(eventId);
    } catch (error) {
      console.error('Error generating tournament bracket:', error);
      throw new Error(error instanceof Error ? error.message : 'Erro ao gerar chaveamento do torneio');
    }
  },

  updateMatch: async (matchId: string, score1: number, score2: number): Promise<Match> => {
    try {
      // Determine the winner based on scores
      let winnerId: string | null = null;
      
      if (score1 > score2) {
        winnerId = 'team1';
      } else if (score2 > score1) {
        winnerId = 'team2';
      }
      
      // Update the match
      const { data, error } = await supabase
        .from('tournament_matches')
        .update({
          score1,
          score2,
          winner_id: winnerId,
          completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', matchId)
        .select('*')
        .single();
      
      if (error) throw error;
      
      if (!data) {
        throw new Error(`Match with ID ${matchId} not found`);
      }
      
      // Update next round match
      await TournamentService.advanceWinner(data);
      
      // Map to our Match type
      return {
        id: data.id,
        eventId: data.event_id, // Use eventId property instead of tournamentId
        round: data.round,
        position: data.position,
        team1: data.team1,
        team2: data.team2,
        score1: data.score1,
        score2: data.score2,
        winnerId: data.winner_id,
        completed: data.completed,
        courtId: data.court_id,
        scheduledTime: data.scheduled_time
      };
    } catch (error) {
      handleSupabaseError(error, 'updateMatch');
      throw error;
    }
  },

  advanceWinner: async (match: any): Promise<void> => {
    try {
      // Validate input
      if (!match.completed || !match.winner_id) {
        return; // Match not completed or no winner, nothing to advance
      }
      
      // Get tournament details to determine max rounds
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .select('rounds')
        .eq('id', match.tournament_id)
        .single();
      
      if (tournamentError) throw tournamentError;
      
      // Skip if already at the final round
      if (match.round >= tournament.rounds) {
        await TournamentService.checkTournamentCompletion(match.tournament_id);
        return;
      }
      
      // Find the next round match
      const nextRound = match.round + 1;
      const nextPosition = Math.floor(match.position / 2);
      
      const { data: nextMatch, error: nextMatchError } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', match.tournament_id)
        .eq('round', nextRound)
        .eq('position', nextPosition)
        .single();
      
      if (nextMatchError) throw nextMatchError;
      
      // Get the winning team
      const winningTeam = match.winner_id === 'team1' ? match.team1 : match.team2;
      
      // Determine if this team should go to team1 or team2 in the next match
      const isEvenPosition = match.position % 2 === 0; // Corrected logic: even position fills team1 slot of next match
      const updateField = isEvenPosition ? 'team1' : 'team2'; // Corrected logic
      
      // Update the next match with the winning team
      const updateData: any = {};
      updateData[updateField] = winningTeam;
      
      const { error: updateError } = await supabase
        .from('tournament_matches')
        .update(updateData)
        .eq('id', nextMatch.id);
      
      if (updateError) throw updateError;
      
      // Check if the next match is now complete due to a WO (Walk Over)
      const { data: updatedNextMatchData, error: fetchUpdatedError } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('id', nextMatch.id)
        .single();
      
      if (fetchUpdatedError) throw fetchUpdatedError;
      
      const updatedNextMatch = transformMatch(updatedNextMatchData); // Use transformMatch
      
      if (updatedNextMatch.team1 && updatedNextMatch.team2) {
         // Both teams are set, check for auto-advancement if one came from a bye/WO
         // This logic might need refinement based on exact WO rules
         // For now, just check completion
         await TournamentService.checkTournamentCompletion(match.tournament_id);
      }
      
    } catch (error) {
      handleSupabaseError(error, 'advanceWinner');
    }
  },

  checkTournamentCompletion: async (tournamentId: string): Promise<void> => {
    try {
      // Check if all matches are completed
      const { data, error } = await supabase
        .from('tournament_matches')
        .select('completed')
        .eq('tournament_id', tournamentId);
      
      if (error) throw error;
      
      const allCompleted = data.every(match => match.completed);
      
      if (allCompleted) {
        // Update tournament status to FINISHED
        const { error: updateError } = await supabase
          .from('tournaments')
          .update({ status: 'FINISHED', updated_at: new Date().toISOString() })
          .eq('id', tournamentId);
        
        if (updateError) throw updateError;
      }
    } catch (error) {
      handleSupabaseError(error, 'checkTournamentCompletion');
    }
  },

  updateStatus: async (tournamentId: string, status: 'CREATED' | 'STARTED' | 'FINISHED'): Promise<Tournament> => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', tournamentId)
        .select('*')
        .single();
      
      if (error) throw error;
      
      // Fetch matches for this tournament
      const { data: matches, error: matchesError } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('round', { ascending: true })
        .order('position', { ascending: true });
      
      if (matchesError) throw matchesError;
      
      // Return tournament with matches
      return {
        ...data,
        matches: matches.map(match => ({
          id: match.id,
          tournamentId: match.tournament_id,
          eventId: match.event_id,
          round: match.round,
          position: match.position,
          team1: match.team1,
          team2: match.team2,
          score1: match.score1,
          score2: match.score2,
          winnerId: match.winner_id,
          completed: match.completed,
          courtId: match.court_id,
          scheduledTime: match.scheduled_time
        }))
      };
    } catch (error) {
      handleSupabaseError(error, 'updateStatus');
      throw error;
    }
  },

  assignCourtToMatch: async (matchId: string, courtId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('tournament_matches')
        .update({ 
          court_id: courtId,
          updated_at: new Date().toISOString()
        })
        .eq('id', matchId);
      
      if (error) throw error;
    } catch (error) {
      handleSupabaseError(error, 'assignCourtToMatch');
    }
  },

  updateMatchSchedule: async (matchId: string, courtId: string, scheduledTime: string): Promise<Match> => {
    try {
      const { data, error } = await supabase
        .from('tournament_matches')
        .update({ 
          court_id: courtId,
          scheduled_time: scheduledTime,
          updated_at: new Date().toISOString()
        })
        .eq('id', matchId)
        .select('*')
        .single();
      
      if (error) throw error;
      
      return {
        id: data.id,
        eventId: data.event_id, // Use eventId property instead of tournamentId
        round: data.round,
        position: data.position,
        team1: data.team1,
        team2: data.team2,
        score1: data.score1,
        score2: data.score2,
        winnerId: data.winner_id,
        completed: data.completed,
        courtId: data.court_id,
        scheduledTime: data.scheduled_time
      };
    } catch (error) {
      handleSupabaseError(error, 'updateMatchSchedule');
      throw error;
    }
  },
};

// Local helper function to generate bracket
function generateBracketMatches(
  tournamentId: string, 
  participantIds: string[], 
  skipTeamIds: string[] = [],
  courts: Court[] = []
): Match[] {
  // Calculate number of rounds needed
  const totalParticipants = participantIds.length;
  const numRounds = Math.ceil(Math.log2(totalParticipants));
  const numFirstRoundMatches = Math.pow(2, numRounds - 1);
  const matches: Match[] = [];
  
  // Generate first round matches
  let position = 0;
  let matchCount = 0;
  
  // Create a copy of participants to work with
  let participants = [...participantIds];
  
  // Process skip teams first (give them byes)
  const remainingParticipants: string[] = [];
  const advancedParticipants: string[] = [];
  
  // Filter participants into skip teams and regular participants
  participants.forEach(p => {
    if (skipTeamIds.includes(p)) {
      advancedParticipants.push(p);
    } else {
      remainingParticipants.push(p);
    }
  });
  
  // First, create bye matches for teams that should skip first round
  for (const participant of advancedParticipants) {
    const match: Match = {
      id: uuidv4(),
      eventId: "", // This will be filled in during insertrnamentId
      round: 1,
      position: position++,
      team1: [participant],
      team2: null, // Use null instead of undefined
      score1: 1,
      score2: 0,
      winnerId: 'team1',
      completed: true,
      courtId: null, // Use null instead of undefined
      scheduledTime: null // Use null instead of undefined
    };
    matches.push(match);
    matchCount++;
  }
  
  // Then pair up the remaining participants
  for (let i = 0; i < remainingParticipants.length; i += 2) {
    if (i + 1 < remainingParticipants.length) {
      // Complete match with two teams
      const courtId = courts.length > 0 ? courts[matchCount % courts.length].id : null; // Use null
      
      const match: Match = {
        id: uuidv4(),
        eventId: "", // This will be filled in during insertrnamentId
        round: 1,
        position: position++,
        team1: [remainingParticipants[i]],
        team2: [remainingParticipants[i + 1]],
        score1: null, // Use null instead of undefined
        score2: null, // Use null instead of undefined
        winnerId: null, // Use null instead of undefined
        completed: false,
        courtId,
        scheduledTime: null // Use null instead of undefined
      };
      matches.push(match);
    } else {
      // Bye match for odd number of teams
      const match: Match = {
        id: uuidv4(),
        eventId: "", // This will be filled in during insertrnamentId
        round: 1,
        position: position++,
        team1: [remainingParticipants[i]],
        team2: null, // Use null instead of undefined
        score1: 1,
        score2: 0,
        winnerId: 'team1',
        completed: true,
        courtId: null, // Use null instead of undefined
        scheduledTime: null // Use null instead of undefined
      };
      matches.push(match);
    }
    matchCount++;
  }
  
  // Fill in any needed empty slots to complete the bracket
  while (matchCount < numFirstRoundMatches) {
    const match: Match = {
      id: uuidv4(),
      eventId: "", // This will be filled in during insertrnamentId
      round: 1,
      position: position++,
      team1: null, // Use null instead of undefined
      team2: null, // Use null instead of undefined
      score1: null, // Use null instead of undefined
      score2: null, // Use null instead of undefined
      winnerId: null, // Use null instead of undefined
      completed: false, // Should be false for empty slots
      courtId: null, // Use null instead of undefined
      scheduledTime: null // Use null instead of undefined
    };
    matches.push(match);
    matchCount++;
  }
  
  // Generate placeholder matches for subsequent rounds
  for (let round = 2; round <= numRounds; round++) {
    const matchesInRound = Math.pow(2, numRounds - round);
    position = 0;
    
    for (let i = 0; i < matchesInRound; i++) {
      const match: Match = {
        id: uuidv4(),
        eventId: "", // This will be filled in during insertrnamentId
        round,
        position: position++,
        team1: null, // Use null instead of undefined
        team2: null, // Use null instead of undefined
        score1: null, // Use null instead of undefined
        score2: null, // Use null instead of undefined
        winnerId: null, // Use null instead of undefined
        completed: false,
        courtId: null, // Use null instead of undefined
        scheduledTime: null // Use null instead of undefined
      };
      matches.push(match);
    }
  }
  
  return matches;
}

// Helper function to transform Supabase match data (ensure it exists and is used)
const transformMatch = (data: any): Match => ({
  id: data.id,
  eventId: data.event_id,
  round: data.round,
  position: data.position,
  team1: data.team1,
  team2: data.team2,
  score1: data.score1,
  score2: data.score2,
  winnerId: data.winner_id, // This comes directly from DB, should be 'team1', 'team2', or null
  completed: data.completed,
  scheduledTime: data.scheduled_time,
  courtId: data.court_id,
  courtReservationId: data.court_reservation_id,
});
