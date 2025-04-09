import { create } from 'zustand';
import { Tournament, Match } from '../types';
import { TournamentService } from '../services';

interface TournamentState {
  tournament: Tournament | null;
  selectedMatch: Match | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchTournament: (eventId: string) => Promise<void>;
  generateTournament: (eventId: string, participants: string[]) => Promise<void>;
  updateMatchResults: (matchId: string, score1: number, score2: number) => Promise<void>;
  startTournament: (tournamentId: string) => Promise<void>;
  finishTournament: (tournamentId: string) => Promise<void>;
  selectMatch: (match: Match | null) => void;
  clearTournament: () => void;
  clearError: () => void;
}

export const useTournamentStore = create<TournamentState>((set, get) => ({
  tournament: null,
  selectedMatch: null,
  loading: false,
  error: null,
  
  fetchTournament: async (eventId: string) => {
    set({ loading: true, error: null });
    try {
      const tournament = await TournamentService.getByEventId(eventId);
      set({ tournament, loading: false });
    } catch (error) {
      console.error(`Error fetching tournament for event ${eventId}:`, error);
      set({ 
        error: error instanceof Error ? error.message : 'Falha ao buscar o torneio', 
        loading: false 
      });
      throw error;
    }
  },
  
  generateTournament: async (eventId: string, participants: string[]) => {
    set({ loading: true, error: null });
    try {
      const tournament = await TournamentService.create(eventId, participants);
      set({ tournament, loading: false });
    } catch (error) {
      console.error(`Error generating tournament for event ${eventId}:`, error);
      set({ 
        error: error instanceof Error ? error.message : 'Falha ao gerar chaveamento', 
        loading: false 
      });
      throw error;
    }
  },
  
  updateMatchResults: async (matchId: string, score1: number, score2: number) => {
    set({ loading: true, error: null });
    try {
      const updatedMatch = await TournamentService.updateMatch(matchId, score1, score2);
      
      const tournament = get().tournament;
      if (tournament) {
        const updatedMatches = tournament.matches.map(match => 
          match.id === matchId ? updatedMatch : match
        );
        
        set({ 
          tournament: { ...tournament, matches: updatedMatches },
          selectedMatch: get().selectedMatch?.id === matchId ? updatedMatch : get().selectedMatch,
          loading: false 
        });
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
    set({ loading: true, error: null });
    try {
      const tournament = await TournamentService.updateStatus(tournamentId, 'STARTED');
      set({ tournament, loading: false });
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
    set({ loading: true, error: null });
    try {
      const tournament = await TournamentService.updateStatus(tournamentId, 'FINISHED');
      set({ tournament, loading: false });
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
  
  clearError: () => set({ error: null })
}));
