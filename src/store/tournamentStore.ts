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
    options?: { 
      groupSize?: number; 
      forceReset?: boolean;
      maxTeamsPerGroup?: number;
      autoCalculateGroups?: boolean;
    },
    eventType?: string
  ) => Promise<void>;
  generateRandomStructure: (
    eventId: string,
    participants: any[], // Can be participants or pre-formed teams
    options?: { 
      groupSize?: number; 
      forceReset?: boolean;
      maxTeamsPerGroup?: number;
      autoCalculateGroups?: boolean;
    }
  ) => Promise<void>;
  // Updated action for elimination stage with Beach Tennis rules support
  generateEliminationBracket: (tournamentId: string, useBeachTennisRules?: boolean) => Promise<Tournament>;
  // Add the new action to the interface
  generateBilateralEliminationBracket: (tournamentId: string) => Promise<void>;
  updateMatchResults: (matchId: string, score1: number, score2: number) => Promise<void>;
  updateMatchTeams: (matchId: string, team1: string[] | null, team2: string[] | null) => Promise<void>;
  startTournament: (tournamentId: string) => Promise<void>;
  selectMatch: (match: Match | null) => void;
  updateMatchSchedule: (matchId: string, courtId: string | null, scheduledTime: string | null) => Promise<void>;
  clearError: () => void;
  resetTournamentState: () => void; // Added reset function
  // Adicionar função para forçar refresh completo dos dados
  forceRefreshTournament: (eventId: string) => Promise<void>;
  generateFormedBracket: (
    eventId: string,
    teams: string[][],
    options?: { 
      forceReset?: boolean;
      groupSize?: number;
      maxTeamsPerGroup?: number;
      autoCalculateGroups?: boolean;
    },
    eventType?: string
  ) => Promise<void>;
  generateRandomBracketAndGroups: (eventId: string, teams: string[][], options?: { 
    forceReset?: boolean;
    groupSize?: number;
    maxTeamsPerGroup?: number;
    autoCalculateGroups?: boolean;
  }) => Promise<void>;
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
    options?: { 
      groupSize?: number; 
      forceReset?: boolean;
      maxTeamsPerGroup?: number;
      autoCalculateGroups?: boolean;
    },
    eventType?: string
  ) => {
    try {
      set({ loading: true, error: null, isNewTournament: false });
      
      console.log(`Generating formed structure for event ${eventId} with ${teams.length} teams`);
      console.log('Group options:', options);
      

      // Se for SUPER8, força o format correto
      let teamFormationType = TeamFormationType.FORMED;
      const extraOptions: typeof options & { format?: string } = { ...options };
      if (eventType === 'SUPER8') {
        extraOptions.format = 'SUPER8';
      }

      const tournament = await TournamentService.generateTournamentStructure(
        eventId,
        teams,
        teamFormationType,
        extraOptions
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
    options?: { 
      groupSize?: number; 
      forceReset?: boolean;
      maxTeamsPerGroup?: number;
      autoCalculateGroups?: boolean;
    }
  ) => {
    set({ loading: true, error: null, isNewTournament: false });
    
    try {
      console.log(`Generating random structure for event ${eventId} with ${participants.length} participants/teams`);
      console.log('Group options:', options);
      
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
  generateEliminationBracket: async (tournamentId: string, useBeachTennisRules: boolean = true) => {
    try {
      set({ loading: true, error: null });
      
      const tournament = await TournamentService.generateEliminationBracket(tournamentId, useBeachTennisRules);
      
      set({ 
        tournament,
        loading: false 
      });
      
      return tournament;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate elimination bracket';
      set({ 
        error: errorMessage, 
        loading: false 
      });
      throw error;
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
    // ✅ Não mostrar loading para atualização de resultados
    set({ error: null });
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
      
      console.log('Match updated from service:', updatedMatch);
      
      // ✅ Atualizar estado localmente sem refresh completo que causa loading
      if (currentTournament && currentTournament.matches) {
        // Find and update the match in the array
        const updatedMatches = currentTournament.matches.map(match => {
          if (match.id === matchId) {
            const merged = { 
              ...match, 
              ...updatedMatch,
              // Ensure key fields are properly set
              score1: updatedMatch.score1 ?? score1,
              score2: updatedMatch.score2 ?? score2,
              winnerId: updatedMatch.winnerId,
              completed: updatedMatch.completed ?? true
            };
            console.log(`Updated match ${matchId} in state:`, merged);
            return merged;
          }
          return match;
        });
        
        console.log('Updated matches array length:', updatedMatches.length);
        console.log('Target match in updated array:', updatedMatches.find(m => m.id === matchId));
        
        // ✅ Atualizar estado do torneio com as partidas atualizadas
        const updatedTournament = {
          ...currentTournament,
          matches: updatedMatches
        };
        
        console.log('Setting updated tournament with matches:', updatedTournament.matches.length);
        
        // ✅ Atualização imediata do estado sem loading
        set({ 
          tournament: updatedTournament
        });
        
        // ✅ Verificar completion do torneio em background, sem afetar UI
        const completedMatch = updatedMatches.find(m => m.id === matchId);
        if (completedMatch?.completed) {
          // Executar verificações em background sem loading
          setTimeout(async () => {
            try {
              // Check if tournament should be completed
              await get().checkGroupStageCompletion();
            } catch (error) {
              console.warn('Could not check tournament completion:', error);
            }
          }, 100);
        }
      } else {
        console.warn('No current tournament or matches found in state');
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
      
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  // Função para atualizar as equipes de uma partida (para avanço automático)
  updateMatchTeams: async (matchId: string, team1: string[] | null, team2: string[] | null) => {
    set({ error: null });
    try {
      console.log(`🔄 [UPDATE TEAMS] Atualizando match ${matchId} teams no banco:`, { team1, team2 });
      
      const currentTournament = get().tournament;
      if (!currentTournament || !currentTournament.matches) {
        console.warn('No current tournament or matches found');
        return;
      }

      // 🔥 NOVA IMPLEMENTAÇÃO: Salvar no banco de dados via TournamentService
      try {
        const updatedMatch = await TournamentService.updateMatch(matchId, { team1, team2 });
        console.log(`✅ [UPDATE TEAMS] Match ${matchId} atualizada no banco:`, updatedMatch);
      } catch (dbError) {
        console.error(`🚨 [UPDATE TEAMS] Erro ao salvar no banco:`, dbError);
        // Continuar mesmo se houver erro no banco, para manter a funcionalidade local
      }

      // Atualizar a partida localmente também
      const updatedMatches = currentTournament.matches.map(match => {
        if (match.id === matchId) {
          const updatedMatch = {
            ...match,
            team1: team1,
            team2: team2
          };
          console.log(`✅ [UPDATE TEAMS] Match ${matchId} atualizada no estado local:`, updatedMatch);
          return updatedMatch;
        }
        return match;
      });

      // Atualizar o estado do torneio
      const updatedTournament = {
        ...currentTournament,
        matches: updatedMatches
      };

      set({ 
        tournament: updatedTournament
      });

      console.log(`✅ [UPDATE TEAMS] Match ${matchId} salva no banco e estado local`);
      console.log(`📊 [UPDATE TEAMS] Estado atualizado - Total de matches: ${updatedMatches.length}`);
      
      // Log das matches das semifinais para debug
      const semiMatches = updatedMatches.filter(m => m.round === 2);
      semiMatches.forEach(match => {
        console.log(`🏐 [UPDATE TEAMS] Semi R${match.round}_${match.position}: ${Array.isArray(match.team1) ? match.team1.join(' & ') : match.team1} vs ${Array.isArray(match.team2) ? match.team2.join(' & ') : match.team2}`);
      });

    } catch (error) {
      console.error('Error updating match teams for', matchId, ':', error);
      set({ error: 'Erro ao atualizar equipes da partida' });
      throw error;
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
  generateFormedBracket: async (
    eventId: string,
    teams: string[][],
    options?: { 
      forceReset?: boolean;
      groupSize?: number;
      maxTeamsPerGroup?: number;
      autoCalculateGroups?: boolean;
    },
    eventType?: string
  ) => {
    // Reutiliza a implementação existente
    return get().generateFormedStructure(eventId, teams, options, eventType);
  },
  // Alias para manter compatibilidade com código existente
  generateRandomBracketAndGroups: async (eventId: string, teams: string[][], options?: { 
    forceReset?: boolean;
    groupSize?: number;
    maxTeamsPerGroup?: number;
    autoCalculateGroups?: boolean;
  }) => {
    // Convert teams to the format expected by generateRandomStructure
    // Since generateRandomStructure now accepts both participants and teams, we can pass teams directly
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

  // Nova ação para forçar refresh completo dos dados do torneio
  forceRefreshTournament: async (eventId: string) => {
    console.log(`Force refreshing tournament data for event ${eventId}...`);
    set({ loading: true, error: null });
    try {
      // Limpa o estado atual para forçar um refresh completo
      set({ tournament: null });
      
      // Aguarda um pouco para garantir que o estado foi limpo
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Busca dados frescos do banco
      const tournament = await TournamentService.getByEventId(eventId);
      
      console.log('Force refresh completed, tournament loaded:', tournament?.id);
      console.log('Matches loaded:', tournament?.matches?.length || 0);
      
      set({ 
        tournament,
        loading: false 
      });
      
      // Verificar se a fase de grupos está completa após o refresh
      if (tournament) {
        setTimeout(() => {
          get().checkGroupStageCompletion();
        }, 100);
      }
      
    } catch (error) {
      console.error('Error forcing tournament refresh:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao forçar atualização do torneio';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },
}));
