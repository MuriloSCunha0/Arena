import { create } from 'zustand';
import { Tournament, Match, Court, Participant } from '../types'; // Import Participant
import { TournamentService, generateBracketWithCourts as generateBracketService } from '../services/supabase/tournament'; // Import the service function directly

interface TournamentState {
  tournament: Tournament | null;
  selectedMatch: Match | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchTournament: (eventId: string) => Promise<void>;
  // createTournament is for 'FORMED' teams or manual generation
  createTournament: (eventId: string, participantIds: string[], skipTeamIds?: string[], courts?: Court[], options?: { forceReset?: boolean }) => Promise<void>;
  // generateBracket is specifically for the output of the 'RANDOM' animation
  generateBracket: (
      eventId: string,
      matches: Array<[string, string]>, // Array of participant ID pairs
      courtAssignments: Record<string, string[]>, // Map of matchKey ('pId1|pId2') to courtId array
      options?: { forceReset?: boolean }
  ) => Promise<any>;
  updateMatchResults: (matchId: string, score1: number, score2: number) => Promise<void>;
  startTournament: (tournamentId: string) => Promise<void>;
  finishTournament: (tournamentId: string) => Promise<void>; // Assuming this exists or is needed
  selectMatch: (match: Match | null) => void;
  clearTournament: () => void;
  clearError: () => void;
  updateMatchSchedule: (matchId: string, courtId: string, scheduledTime: string) => Promise<void>;
}

export const useTournamentStore = create<TournamentState>((set, get) => ({
  tournament: null,
  selectedMatch: null,
  loading: false,
  error: null,

  fetchTournament: async (eventId: string) => {
    // ... (fetchTournament implementation remains the same) ...
     set({ loading: true, error: null });
    try {
      const tournament = await TournamentService.getByEventId(eventId);
      set({ tournament, loading: false });
    } catch (error) {
      console.error(`Error fetching tournament for event ${eventId}:`, error);
      // Avoid setting error if it's just 'Not Found' or similar non-critical errors during initial load
      if (error instanceof Error && !error.message.includes('Failed to fetch') && !error.message.includes('Not Found')) {
         set({
            error: error.message,
            loading: false
         });
      } else {
         set({ loading: false }); // Still set loading false
      }
      // Don't re-throw here unless necessary upstream
      // throw error;
    }
  },

  // createTournament: Used for 'FORMED' teams or manual generation
  createTournament: async (eventId: string, participantIds: string[], skipTeamIds = [], courts = [], options = { forceReset: false }) => {
    set({ loading: true, error: null });
    try {
      if (participantIds.length < 2) {
        throw new Error('É necessário pelo menos 2 participantes para gerar o chaveamento');
      }
      
      // Pass the options with forceReset flag to the service function
      await TournamentService.generateBracketWithCourts(eventId, participantIds, skipTeamIds, courts, options);

      // After generating, fetch the updated tournament data
      await get().fetchTournament(eventId);
    } catch (error) {
      console.error('Error generating tournament (createTournament):', error);
      const errorMsg = error instanceof Error ? error.message : 'Erro ao gerar chaveamento do torneio';
      set({ error: errorMsg, loading: false });
      throw new Error(errorMsg); // Re-throw for component handling
    } finally {
      // set({ loading: false }); // fetchTournament will set loading false
    }
  },

  // generateBracket: Used specifically after the RANDOM animation
  generateBracket: async (
    eventId: string,
    matches: Array<[string, string]>, // Participant ID pairs from animation
    courtAssignments: Record<string, string[]>, // MatchKey to CourtID array from animation
    options: { forceReset?: boolean } = {}
  ): Promise<any> => {
    set({ loading: true, error: null });
    try {
      // Adapt the data from animation to what generateBracketService expects
      // The service might need adjustment or we adapt the data here.
      // For now, let's assume generateBracketService can handle this structure
      // or needs to be called differently.
      // Let's call the dedicated service function:
      const result = await generateBracketService(
          eventId,
          matches, // Pass the pairs directly
          courtAssignments, // Pass court assignments
          options
      );

      // Fetch the tournament data to update the store
      await get().fetchTournament(eventId);

      // set({ loading: false }); // fetchTournament handles loading state
      return result;
    } catch (error) {
      console.error('Error generating tournament bracket (generateBracket):', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to generate tournament bracket';
      set({ error: errorMsg, loading: false });
      throw new Error(errorMsg); // Re-throw for component handling
    }
  },


  updateMatchResults: async (matchId: string, score1: number, score2: number) => {
    // ... (updateMatchResults implementation remains the same) ...
     set({ loading: true, error: null });
    try {
      const updatedMatch = await TournamentService.updateMatch(matchId, score1, score2);

      const tournament = get().tournament;
      if (tournament) {
        // Find the next match to potentially update its teams
        const currentMatch = tournament.matches.find(m => m.id === matchId);
        let nextMatchPotentiallyUpdated = false;
        let updatedMatches = tournament.matches.map(match =>
          match.id === matchId ? updatedMatch : match
        );

        // Logic to find and update the *next* match in the bracket
        if (currentMatch && updatedMatch.winnerId) {
            const nextRound = currentMatch.round + 1;
            const nextPosition = Math.ceil(currentMatch.position / 2);
            const isOddPosition = currentMatch.position % 2 === 1;
            const teamField = isOddPosition ? 'team1' : 'team2';
            const winningTeam = updatedMatch.winnerId === 'team1' ? updatedMatch.team1 : updatedMatch.team2;

            updatedMatches = updatedMatches.map(match => {
                if (match.round === nextRound && match.position === nextPosition) {
                    nextMatchPotentiallyUpdated = true;
                    return { ...match, [teamField]: winningTeam };
                }
                return match;
            });
        }


        set({
          tournament: { ...tournament, matches: updatedMatches },
          selectedMatch: get().selectedMatch?.id === matchId ? updatedMatch : get().selectedMatch,
          loading: false
        });

        // Optional: If a next match was updated, refetch to ensure consistency,
        // especially if auto-advancement (WO) logic exists in the backend/service.
        // if (nextMatchPotentiallyUpdated) {
        //    await get().fetchTournament(eventId);
        // }

      } else {
        set({ loading: false });
      }
    } catch (error) {
      console.error(`Error updating match ${matchId}:`, error);
      set({
        error: error instanceof Error ? error.message : 'Falha ao atualizar resultado',
        loading: false
      });
      throw error;
    }
  },

  startTournament: async (tournamentId: string) => {
    // ... (startTournament implementation remains the same) ...
     set({ loading: true, error: null });
    try {
      // Assuming updateStatus returns the updated Tournament object
      const updatedTournament = await TournamentService.updateStatus(tournamentId, 'STARTED');
      set({ tournament: updatedTournament, loading: false });
    } catch (error) {
      console.error(`Error starting tournament ${tournamentId}:`, error);
      set({
        error: error instanceof Error ? error.message : 'Falha ao iniciar o torneio',
        loading: false
      });
      throw error;
    }
  },

  finishTournament: async (tournamentId: string) => {
    // ... (finishTournament implementation remains the same) ...
     set({ loading: true, error: null });
    try {
      // Assuming updateStatus returns the updated Tournament object
      const updatedTournament = await TournamentService.updateStatus(tournamentId, 'FINISHED');
      set({ tournament: updatedTournament, loading: false });
    } catch (error) {
      console.error(`Error finishing tournament ${tournamentId}:`, error);
      set({
        error: error instanceof Error ? error.message : 'Falha ao finalizar o torneio',
        loading: false
      });
      throw error;
    }
  },

  selectMatch: (match: Match | null) => set({ selectedMatch: match }),

  clearTournament: () => set({ tournament: null, selectedMatch: null }),

  clearError: () => set({ error: null }),

  updateMatchSchedule: async (matchId: string, courtId: string, scheduledTime: string) => {
    // ... (updateMatchSchedule implementation remains the same) ...
     set({ loading: true, error: null });
    try {
      // Service might handle both court and time update, or call separately
      // Assuming TournamentService.updateMatchSchedule handles both or we adjust
      // Let's assume updateMatchSchedule can take courtId too, or we call assignCourt first
      await TournamentService.assignCourtToMatch(matchId, courtId); // Assign court first
      const updatedMatch = await TournamentService.updateMatchSchedule(matchId, scheduledTime); // Then update time

      // Update the match in the store's tournament state
      set(state => ({
        tournament: state.tournament ? {
          ...state.tournament,
          matches: state.tournament.matches.map(match =>
            match.id === matchId ? updatedMatch : match
          )
        } : null,
        selectedMatch: state.selectedMatch?.id === matchId ? updatedMatch : state.selectedMatch, // Update selected match too
        loading: false
      }));
    } catch (error) {
      console.error('Error scheduling match:', error);
      set({ error: error instanceof Error ? error.message : 'Erro ao agendar partida', loading: false });
      throw error;
    } finally {
      // set({ loading: false }); // Handled within try/catch
    }
  },

}));
