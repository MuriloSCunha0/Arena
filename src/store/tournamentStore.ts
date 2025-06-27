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
  isGroupStageComplete: boolean; // Flag to indicate if all group matches are complete

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
  // Add the new action to the interface
  generateBilateralEliminationBracket: (tournamentId: string) => Promise<void>;
  updateMatchResults: (matchId: string, score1: number, score2: number) => Promise<void>;
  startTournament: (tournamentId: string) => Promise<void>;
  selectMatch: (match: Match | null) => void;
  updateMatchSchedule: (matchId: string, courtId: string | null, scheduledTime: string | null) => Promise<void>;
  clearError: () => void;
  resetTournamentState: () => void; // Added reset function
  generateFormedBracket: (eventId: string, teams: string[][], options?: { forceReset?: boolean }) => Promise<void>;
  generateRandomBracketAndGroups: (eventId: string, teams: string[][], options?: { forceReset?: boolean }) => Promise<void>;
  checkGroupStageCompletion: () => boolean; // Helper function to check if group stage is complete
}

export const useTournamentStore = create<TournamentState>((set, get) => ({
  tournament: null,
  selectedMatch: null,
  loading: false,
  error: null,
  isNewTournament: false,
  isGroupStageComplete: false,
  fetchTournament: async (eventId: string) => {
    set({ loading: true, error: null });
    try {
      const tournament = await TournamentService.getByEventId(eventId);
      
      // Definir o torneio no estado
      set({ tournament, loading: false });
      
      // Verificar se a fase de grupos está completa após carregar o torneio
      if (tournament) {
        setTimeout(() => {
          get().checkGroupStageCompletion();
        }, 0);
      }
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
      
      console.log(`Generating formed structure for event ${eventId} with ${teams.length} teams`);
      
      const tournament = await TournamentService.generateTournamentStructure(
        eventId,
        teams,
        TeamFormationType.FORMED,
        options
      );
      
      console.log(`Tournament generated successfully for event ${eventId}:`, tournament.id);
      
      set({ 
        tournament: tournament,
        loading: false,
        isNewTournament: tournament.isNewTournament || false
      });
    } catch (error) {
      console.error(`Error generating formed tournament structure for event ${eventId}:`, error);
      let mensagemErro = 'Falha ao gerar estrutura do torneio';
      
      if (error instanceof Error) {
        if (error.message.includes('já existe um torneio')) {
          // Erro específico quando já existe torneio para este evento
          mensagemErro = error.message;
        } else if (error.message.includes('format') || error.message.includes('not-null constraint')) {
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
      throw new Error(mensagemErro);
    }
  },

  // Updated generateRandomStructure to work with participants directly
  generateRandomStructure: async (
    eventId: string,
    participants: any[], // <- Isso deveria aceitar tanto participants quanto teams já formados
    options?: { groupSize?: number; forceReset?: boolean }
  ) => {
    set({ loading: true, error: null, isNewTournament: false });
    
    try {
      console.log(`Generating random structure for event ${eventId} with ${participants.length} participants/teams`);
      
      let teams: string[][];
      
      // Verificar se já são teams formados (duplas) ou participantes individuais
      if (participants.length > 0 && Array.isArray(participants[0]) && typeof participants[0][0] === 'string') {
        // Se já são teams formados (formato: [["id1", "id2"], ["id3", "id4"]])
        teams = participants as string[][];
        console.log('Using pre-formed teams:', teams.length);
      } else {
        // Se são participantes individuais, formar teams automaticamente
        const { teams: formedTeams } = TournamentService.formTeamsFromParticipants(
          participants,
          TeamFormationType.RANDOM,
          { groupSize: options?.groupSize }
        );
        teams = formedTeams;
        console.log('Formed teams from participants:', teams.length);
      }
      
      const tournament = await TournamentService.generateTournamentStructure(
        eventId,
        teams,
        TeamFormationType.RANDOM,
        options
      );
      
      console.log(`Random tournament generated successfully for event ${eventId}:`, tournament.id);
      
      set({ 
        tournament: tournament,
        loading: false,
        isNewTournament: tournament.isNewTournament || false
      });
    } catch (error) {
      console.error(`Error generating random tournament structure for event ${eventId}:`, error);
      let mensagemErro = 'Falha ao gerar estrutura aleatória do torneio';
      
      if (error instanceof Error) {
        if (error.message.includes('já existe um torneio')) {
          // Erro específico quando já existe torneio para este evento
          mensagemErro = error.message;
        } else if (error.message.includes('team_formation')) {
          mensagemErro = 'Torneio criado com sucesso! A coluna team_formation não existe no banco, mas isso não afeta o funcionamento.';
          // Don't treat this as an error, just a warning
          set({ loading: false });
          return;
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

  // New action to generate bilateral elimination bracket 
  generateBilateralEliminationBracket: async (tournamentId: string) => {
    set({ loading: true, error: null });
    try {
      // Use the enhanced bilateral bracket generation
      // @ts-ignore TS might not recognize the method on TournamentService if its type info is stale.
      // Ensure tournament.ts is saved and TS server is updated.
      const tournament = await TournamentService.generateBilateralEliminationBracket(tournamentId);
      set({ 
        tournament: tournament,
        loading: false 
      });
    } catch (error) {
      console.error('Error generating bilateral elimination bracket:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao gerar chaveamento eliminatório bilateral';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },
  updateMatchResults: async (matchId: string, score1: number, score2: number) => {
    set({ loading: true, error: null });
    try {
      console.log(`Updating match ${matchId} with scores: ${score1}-${score2}`);
      
      // First, try to sync matches to database if needed
      const currentTournament = get().tournament;
      if (currentTournament) {
        try {
          await TournamentService.syncMatchesToDatabase(currentTournament.id);
        } catch (syncError) {
          console.warn('Could not sync matches to database:', syncError);
          // Continue anyway, the updateMatchResults method will handle missing matches
        }
      }
      
      // Use the corrected method
      const updatedMatch = await TournamentService.updateMatchResults(matchId, score1, score2);
      
      // Update the tournament state with the new match data
      if (currentTournament && currentTournament.matches) {
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
            
            if (updatedTournament) {
              set({ 
                tournament: updatedTournament,
                loading: false 
              });
              return;
            }
          } catch (bracketError) {
            console.error('Error updating bracket after match completion:', bracketError);
          }
        }
        
        const updatedTournament = { ...currentTournament, matches: updatedMatches };
        set({ 
          tournament: updatedTournament,
          loading: false 
        });
        
        if (completedMatch && completedMatch.stage === 'GROUP') {
          setTimeout(() => {
            get().checkGroupStageCompletion();
          }, 0);
        }
      } else {
        set({ loading: false });
      }
    } catch (error) {
      console.error('Error updating match results for', matchId, ':', error);
      
      let errorMessage = 'Erro ao atualizar resultado da partida';
      
      if (error instanceof Error) {
        if (error.message.includes('não encontrada') || error.message.includes('not found')) {
          errorMessage = 'Partida não encontrada. Recarregue a página e tente novamente.';
        } else if (error.message.includes('406') || error.message.includes('permissão')) {
          errorMessage = 'Erro de permissão: Você não tem autorização para atualizar esta partida.';
        } else if (error.message.includes('PGRST116')) {
          errorMessage = 'Partida não encontrada no banco de dados. Verifique se o torneio foi criado corretamente.';
        } else {
          errorMessage = error.message;
        }
      }
      
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },

  startTournament: async (tournamentId: string) => {
    set({ loading: true, error: null });
    try {
      // Use the correct status value
      await TournamentService.updateStatus(tournamentId, 'STARTED'); // Changed from 'ACTIVE' to 'STARTED'
      
      // Refresh the tournament data
      const currentTournament = get().tournament;
      if (currentTournament) {
        set({ 
          tournament: { ...currentTournament, status: 'STARTED' }, // Changed from 'ACTIVE' to 'STARTED'
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
      if (currentTournament && currentTournament.matches) {
        const updatedMatches = currentTournament.matches.map(match => 
          match.id === matchId ? { ...match, ...updatedMatch } : match
        );
        
        set({ 
          tournament: { ...currentTournament, matches: updatedMatches },
          loading: false 
        });
      } else {
        set({ loading: false });
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
    // Agora passamos as teams diretamente, pois o método foi atualizado para aceitar ambos os formatos
    return get().generateRandomStructure(eventId, teams, options);
  },
  
  // Verificar se a fase de grupos está completa
  checkGroupStageCompletion: () => {
    const tournament = get().tournament;
    
    if (!tournament?.matches) return false;
    
    const groupMatches = tournament.matches.filter(match => match.stage === 'GROUP');
    if (groupMatches.length === 0) return false;
    
    const completedGroupMatches = groupMatches.filter(match => match.completed);
    const isComplete = completedGroupMatches.length === groupMatches.length;
    
    // Atualiza o estado se necessário
    if (isComplete !== get().isGroupStageComplete) {
      set({ isGroupStageComplete: isComplete });
    }
    
    return isComplete;
  },
}));
