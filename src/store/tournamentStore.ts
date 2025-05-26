import { create } from 'zustand';
import { Tournament, Match, TeamFormationType } from '../types';
import { TournamentService } from '../services/supabase/tournament'; // Add this import if missing
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
      set({ tournament, loading: false });
    } catch (error) {
      console.error(`Error fetching tournament for event ${eventId}:`, error);
      // Don't set error for missing tournaments, just log it
      if (error instanceof Error && error.message.includes('does not exist')) {
        console.warn('Tournament or related tables do not exist, this is expected for new setups');
        set({ tournament: null, loading: false, error: null });
      } else {
        set({ error: traduzirErroSupabase(error) || 'Falha ao buscar torneio', loading: false });
      }
    }
  },

  // Renamed from createTournament
  generateFormedStructure: async (
    eventId: string,
    teams: string[][],
    options?: { groupSize?: number; forceReset?: boolean }
  ) => {
    try {
      set({ loading: true, error: null, isNewTournament: false });
      
      const tournament = await TournamentService.generateTournamentStructure(
        eventId,
        teams,
        TeamFormationType.FORMED,
        options
      );
      
      set({ 
        tournament: tournament,
        loading: false,
        isNewTournament: tournament.isNewTournament || false
      });
    } catch (error) {
      console.error('Error generating formed tournament structure:', error);
      let mensagemErro = 'Falha ao gerar estrutura do torneio';
      
      if (error instanceof Error) {
        if (error.message.includes('format') || error.message.includes('not-null constraint')) {
          mensagemErro = 'Erro na estrutura do banco de dados: campo formato é obrigatório. Verifique a configuração da tabela tournaments.';
        } else if (error.message.includes('matches') || error.message.includes('schema cache')) {
          mensagemErro = 'Torneio criado com funcionalidade limitada. A tabela de partidas não está disponível no banco de dados.';
        } else if (error.message.includes('team_formation')) {
          mensagemErro = 'Estrutura do banco de dados não suporta formação de times. Continuando sem essa funcionalidade.';
        } else if (error.message.includes('tournament_matches')) {
          mensagemErro = 'Tabela de partidas não encontrada. Verifique a configuração do banco de dados.';
        } else {
          mensagemErro = error.message;
        }
      }
      
      set({ error: mensagemErro, loading: false });
      // Don't throw here to allow the UI to show the error message
      // throw new Error(mensagemErro);
    }
  },

  // Updated generateRandomStructure to work with participants directly
  generateRandomStructure: async (
    eventId: string,
    participants: any[],
    options?: { groupSize?: number; forceReset?: boolean }
  ) => {
    set({ loading: true, error: null, isNewTournament: false });
    
    try {
      // Use the service to form teams from participants automatically
      const { teams } = TournamentService.formTeamsFromParticipants(
        participants,
        TeamFormationType.RANDOM,
        { groupSize: options?.groupSize }
      );
      
      const tournament = await TournamentService.generateTournamentStructure(
        eventId,
        teams,
        TeamFormationType.RANDOM,
        options
      );
      
      set({ 
        tournament: tournament,
        loading: false,
        isNewTournament: tournament.isNewTournament || false
      });
    } catch (error) {
      console.error('Error generating random tournament structure:', error);
      let mensagemErro = 'Falha ao gerar estrutura aleatória do torneio';
      
      if (error instanceof Error) {
        if (error.message.includes('format') || error.message.includes('not-null constraint')) {
          mensagemErro = 'Erro na estrutura do banco de dados: campo formato é obrigatório. Verifique a configuração da tabela tournaments.';
        } else if (error.message.includes('matches') || error.message.includes('schema cache')) {
          mensagemErro = 'Torneio criado com funcionalidade limitada. A tabela de partidas não está disponível no banco de dados.';
        } else {
          mensagemErro = error.message;
        }
      }
      
      set({ error: mensagemErro, loading: false });
      throw new Error(mensagemErro);
    }
  },

  // New action implementation
  generateEliminationBracket: async (tournamentId: string) => {
    set({ loading: true, error: null });
    try {
      const tournament = await TournamentService.generateEliminationBracket(tournamentId);
      set({ 
        tournament: tournament,
        loading: false 
      });
    } catch (error) {
      console.error('Error generating elimination bracket:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao gerar chaveamento eliminatório';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },

  updateMatchResults: async (matchId: string, score1: number, score2: number) => {
    set({ loading: true, error: null });
    try {
      // Use the correct method name
      const updatedMatch = await TournamentService.updateMatchResults(matchId, score1, score2);
      
      // Update the tournament state with the new match data
      const currentTournament = get().tournament;
      if (currentTournament) {
        const updatedMatches = currentTournament.matches.map(match => 
          match.id === matchId ? { ...match, ...updatedMatch } : match
        );
        
        // If this is an elimination match, update the bracket
        const completedMatch = updatedMatches.find(m => m.id === matchId);
        if (completedMatch && completedMatch.stage === 'ELIMINATION' && completedMatch.completed) {
          try {
            const updatedTournament = await TournamentService.updateEliminationBracket(
              currentTournament.id, 
              matchId
            );
            set({ 
              tournament: updatedTournament,
              loading: false 
            });
            return;
          } catch (bracketError) {
            console.warn('Could not update elimination bracket:', bracketError);
          }
        }
        
        set({ 
          tournament: { ...currentTournament, matches: updatedMatches },
          loading: false 
        });
      }
    } catch (error) {
      console.error('Error updating match results for', matchId, ':', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar resultado da partida';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },

  startTournament: async (tournamentId: string) => {
    set({ loading: true, error: null });
    try {
      // Use the correct method name
      await TournamentService.updateStatus(tournamentId, 'ACTIVE');
      
      // Refresh the tournament data
      const currentTournament = get().tournament;
      if (currentTournament) {
        set({ 
          tournament: { ...currentTournament, status: 'ACTIVE' },
          loading: false 
        });
      }
    } catch (error) {
      console.error('Error starting tournament:', tournamentId, error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao iniciar torneio';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  selectMatch: (match: Match | null) => {
    set({ selectedMatch: match });
  },

  updateMatchSchedule: async (matchId: string, courtId: string | null, scheduledTime: string | null) => {
    set({ loading: true, error: null });
    try {
      // Use the new method
      const updatedMatch = await TournamentService.updateMatchSchedule(matchId, courtId, scheduledTime);
      
      // Update the tournament state with the new match data
      const currentTournament = get().tournament;
      if (currentTournament) {
        const updatedMatches = currentTournament.matches.map(match => 
          match.id === matchId ? { ...match, ...updatedMatch } : match
        );
        
        set({ 
          tournament: { ...currentTournament, matches: updatedMatches },
          loading: false 
        });
      }
    } catch (error) {
      console.error('Error updating match schedule for', matchId, ':', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao agendar partida';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
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
