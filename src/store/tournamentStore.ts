import { create } from 'zustand';
import { Tournament, Match, TeamFormationType } from '../types';
import { TournamentService } from '../services/TournamentService'; // Use the updated service
import { traduzirErroSupabase } from '../lib/supabase';

interface TournamentState {
  tournament: Tournament | null;
  selectedMatch: Match | null;
  loading: boolean;
  error: string | null;
  isNewTournament?: boolean; // Flag to indicate if a new tournament was just created

  fetchTournament: (eventId: string) => Promise<void>;
  // Renamed actions
  generateFormedStructure: (
    eventId: string,
    teams: string[][],
    options?: { groupSize?: number; forceReset?: boolean }
  ) => Promise<void>;
  generateRandomStructure: (
    eventId: string,
    teams: Array<[string, string]>, // Pairs from randomizer
    options?: { groupSize?: number; forceReset?: boolean }
  ) => Promise<void>;
  // New action for elimination stage
  generateEliminationBracket: (tournamentId: string) => Promise<void>;
  updateMatchResults: (matchId: string, score1: number, score2: number) => Promise<void>;
  startTournament: (tournamentId: string) => Promise<void>;
  selectMatch: (match: Match | null) => void;
  updateMatchSchedule: (matchId: string, courtId: string | null, scheduledTime: string | null) => Promise<void>;
  clearError: () => void;
  resetTournamentState: () => void; // Added reset function
  generateFormedBracket: (eventId: string, teams: string[][], options?: { forceReset?: boolean }) => Promise<void>;
  generateRandomBracketAndGroups: (eventId: string, teams: string[][], options?: { forceReset?: boolean }) => Promise<void>;
}

export const useTournamentStore = create<TournamentState>((set, get) => ({
  tournament: null,
  selectedMatch: null,
  loading: false,
  error: null,
  isNewTournament: false,

  fetchTournament: async (eventId: string) => {
    set({ loading: true, error: null });
    try {
      const tournament = await TournamentService.getByEventId(eventId);
      set({ tournament, loading: false });    } catch (error) {
      console.error(`Error fetching tournament for event ${eventId}:`, error);
      set({ error: traduzirErroSupabase(error) || 'Falha ao buscar torneio', loading: false });
    }
  },

  // Renamed from createTournament
  generateFormedStructure: async (
    eventId: string,
    teams: string[][],
    options?: { groupSize?: number; forceReset?: boolean }
  ) => {
    set({ loading: true, error: null, isNewTournament: false });
    try {
      // Use the updated service method
      const resultTournament = await TournamentService.generateTournamentStructure(
        eventId,
        teams,
        TeamFormationType.FORMED, // Specify formation type
        options
      );
      set({
        tournament: resultTournament,
        loading: false,
        isNewTournament: resultTournament.isNewTournament // Set flag from result
      });    } catch (error) {
      console.error('Error generating formed tournament structure:', error);
      const mensagemErro = traduzirErroSupabase(error) || 'Falha ao gerar estrutura do torneio';
      set({ error: mensagemErro, loading: false });
      throw new Error(mensagemErro); // Re-throw for component handling
    }
  },

  // Renamed from generateBracket
  generateRandomStructure: async (
    eventId: string,
    teams: Array<[string, string]>, // Pairs from randomizer
    options?: { groupSize?: number; forceReset?: boolean }
  ) => {
    set({ loading: true, error: null, isNewTournament: false });
    try {
      // Convert pairs [string, string] to teams string[][]
      const teamArray: string[][] = teams.map(pair => [pair[0], pair[1]]);

      // Use the updated service method
      const resultTournament = await TournamentService.generateTournamentStructure(
        eventId,
        teamArray,
        TeamFormationType.RANDOM, // Specify formation type
        options
      );
      set({
        tournament: resultTournament,
        loading: false,
        isNewTournament: resultTournament.isNewTournament // Set flag from result
      });    } catch (error) {
      console.error('Error generating random tournament structure:', error);
      const mensagemErro = traduzirErroSupabase(error) || 'Falha ao gerar estrutura aleatória do torneio';
      set({ error: mensagemErro, loading: false });
      throw new Error(mensagemErro); // Re-throw for component handling
    }
  },

  // New action implementation
  generateEliminationBracket: async (tournamentId: string) => {
     set({ loading: true, error: null });
     try {
        const updatedTournament = await TournamentService.generateEliminationBracket(tournamentId);
        set({ tournament: updatedTournament, loading: false });     } catch (error) {
        console.error('Error generating elimination bracket:', error);
        const mensagemErro = traduzirErroSupabase(error) || 'Falha ao gerar fase eliminatória';
        set({ error: mensagemErro, loading: false });
        throw new Error(mensagemErro); // Re-throw for component handling
     }
  },

  updateMatchResults: async (matchId: string, score1: number, score2: number) => {
    set({ loading: true, error: null });
    try {
      // Call the updated service method which now handles advancement internally
      // This service function returns the updated match data, including eventId
      const updatedMatch = await TournamentService.updateMatch(matchId, score1, score2);

      // Refetch the tournament using the eventId from the updated match
      if (updatedMatch && updatedMatch.eventId) { // Check if updatedMatch and eventId exist
        const updatedTournament = await TournamentService.getByEventId(updatedMatch.eventId); // Use eventId from updatedMatch
        set({ tournament: updatedTournament, loading: false, selectedMatch: null }); // Deselect match after update
      } else {
         console.error("Could not get eventId from updated match data.");
         set({ loading: false, error: "Falha ao obter ID do evento após atualização." }); // Handle missing eventId
      }    } catch (error) {
      console.error(`Error updating match results for ${matchId}:`, error);
      const mensagemErro = traduzirErroSupabase(error) || 'Falha ao atualizar resultado da partida';
      set({ error: mensagemErro, loading: false });
      throw new Error(mensagemErro); // Re-throw for component handling
    }
  },

  startTournament: async (tournamentId: string) => {
    set({ loading: true, error: null });
    try {
      const updatedTournament = await TournamentService.updateStatus(tournamentId, 'STARTED');
      set(state => ({
        tournament: state.tournament ? { ...state.tournament, status: 'STARTED' } : updatedTournament,
        loading: false
      }));    } catch (error) {
      console.error(`Error starting tournament ${tournamentId}:`, error);
      const mensagemErro = traduzirErroSupabase(error) || 'Falha ao iniciar torneio';
      set({ error: mensagemErro, loading: false });
      throw new Error(mensagemErro); // Re-throw for component handling
    }
  },

  selectMatch: (match: Match | null) => {
    set({ selectedMatch: match });
  },

  updateMatchSchedule: async (matchId: string, courtId: string | null, scheduledTime: string | null) => {
    set({ loading: true, error: null });
    try {
      const updatedMatch = await TournamentService.updateMatchSchedule(matchId, courtId, scheduledTime);
      set(state => ({
        tournament: state.tournament ? {
          ...state.tournament,
          matches: state.tournament.matches.map(m => m.id === matchId ? updatedMatch : m)
        } : null,
        selectedMatch: state.selectedMatch?.id === matchId ? updatedMatch : state.selectedMatch,
        loading: false
      }));    } catch (error) {
      console.error(`Error updating schedule for match ${matchId}:`, error);
      const mensagemErro = traduzirErroSupabase(error) || 'Falha ao atualizar agendamento da partida';
      set({ error: mensagemErro, loading: false });
      throw new Error(mensagemErro); // Re-throw for component handling
    }
  },

  clearError: () => set({ error: null }),

  resetTournamentState: () => set({ // Reset function
     tournament: null,
     selectedMatch: null,
     loading: false,
     error: null,
     isNewTournament: false,
  }),

  // Alias para manter compatibilidade com código existente
  generateFormedBracket: async (eventId: string, teams: string[][], options?: { forceReset?: boolean }) => {
    // Reutiliza a implementação existente
    return get().generateFormedStructure(eventId, teams, {
      ...options,
      groupSize: options?.forceReset ? 4 : undefined // Use um valor padrão ou mantenha undefined
    });
  },

  // Alias para manter compatibilidade com código existente
  generateRandomBracketAndGroups: async (eventId: string, teams: string[][], options?: { forceReset?: boolean }) => {
    // Converta teams: string[][] para Array<[string, string]> esperado por generateRandomStructure
    const teamPairs = teams
      .filter(team => team.length === 2)
      .map(team => [team[0], team[1]] as [string, string]);
    
    return get().generateRandomStructure(eventId, teamPairs, {
      ...options,
      groupSize: options?.forceReset ? 4 : undefined // Use um valor padrão ou mantenha undefined
    });
  },
}));
