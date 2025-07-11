import { create } from 'zustand';
// Import the shared CreateParticipantDTO
import { Participant, CreateParticipantDTO } from '../types';
import { ParticipantsService } from '../services';
import { traduzirErroSupabase } from '../lib/supabase';
import { withCacheRetry, isCacheError } from '../utils/cacheUtils';

interface ParticipantsState {
  eventParticipants: Participant[];
  allParticipants: Participant[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchParticipantsByEvent: (eventId: string) => Promise<void>;
  fetchAllParticipants: () => Promise<void>;
  // Use the imported CreateParticipantDTO
  createParticipant: (data: CreateParticipantDTO) => Promise<Participant>;
  updateParticipantPayment: (id: string, status: 'PENDING' | 'CONFIRMED') => Promise<void>;
  deleteParticipant: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useParticipantsStore = create<ParticipantsState>((set, get) => ({
  eventParticipants: [],
  allParticipants: [],
  loading: false,
  error: null,

  fetchParticipantsByEvent: async (eventId: string) => {
    set({ loading: true, error: null });
    try {
      const participants = await ParticipantsService.getByEventId(eventId);
      set({ eventParticipants: participants, loading: false });    } catch (error) {      
      console.error(`Erro ao buscar participantes para o evento ${eventId}:`, error);
      set({
        error: traduzirErroSupabase(error) || 'Falha ao buscar participantes',
        loading: false
      });
    }
  },

  fetchAllParticipants: async () => {
    set({ loading: true, error: null });
    try {
      const participants = await ParticipantsService.getAll();
      set({ allParticipants: participants, loading: false });    } catch (error) {      
      console.error('Erro ao buscar todos os participantes:', error);
      set({
        error: traduzirErroSupabase(error) || 'Falha ao buscar todos os participantes',
        loading: false
      });
    }
  },

  // Update createParticipant to use the imported DTO
  createParticipant: async (data: CreateParticipantDTO) => {
    set({ loading: true, error: null });
    try {
      const newParticipant = await ParticipantsService.create(data);
      
      const currentEventParticipants = get().eventParticipants;
      // Add only if the new participant belongs to the currently viewed event (if applicable)
      if (currentEventParticipants.length > 0 && currentEventParticipants[0].eventId === data.eventId) {
         set(state => ({ eventParticipants: [...state.eventParticipants, newParticipant], loading: false }));
      } else {
         // If eventParticipants is empty or for a different event, just set loading false
         set({ loading: false });
      }

      // Optionally update allParticipants list if it's already populated
      if (get().allParticipants.length > 0) {
        set(state => ({ allParticipants: [...state.allParticipants, newParticipant] }));
      }

      return newParticipant;
    } catch (error) {      
      console.error('Erro ao criar participante:', error);
      let mensagemErro = 'Falha ao criar participante';
      
      // Verificar se é erro 406 especificamente
      if (error instanceof Error && error.message.includes('406')) {
        mensagemErro = 'Erro de permissão. Verifique se você tem acesso para criar participantes.';
      } else {
        mensagemErro = traduzirErroSupabase(error) || mensagemErro;
      }
      
      set({
        error: mensagemErro,
        loading: false
      });
      
      // Lançar um erro com a mensagem traduzida
      const erroTraduzido = new Error(mensagemErro);
      throw erroTraduzido; // Re-throw error to be caught by the form
    }
  },

  updateParticipantPayment: async (id: string, status: 'PENDING' | 'CONFIRMED') => {
    set({ loading: true, error: null });
    try {
      // Usar withCacheRetry para operação robusta
      const updatedParticipant = await withCacheRetry(
        () => ParticipantsService.updatePaymentStatus(id, status),
        2,
        'atualizar pagamento do participante'
      );

      // Atualiza o participante na lista
      const eventParticipants = get().eventParticipants.map(participant =>
        participant.id === id ? updatedParticipant : participant
      );

      set({ eventParticipants, loading: false });
    } catch (error) {      
      console.error(`Erro ao atualizar pagamento do participante ${id}:`, error);
      
      // Usar detecção inteligente de erro de cache
      const cacheInfo = isCacheError(error);
      let mensagemErro = 'Falha ao atualizar status de pagamento';
      
      if (cacheInfo.isSchemaCache) {
        if (cacheInfo.missingColumn) {
          mensagemErro = `Erro de configuração: coluna '${cacheInfo.missingColumn}' não encontrada. Contate o administrador.`;
        } else {
          mensagemErro = 'Erro de cache do banco de dados. Tente novamente em alguns instantes.';
        }
      } else if (error instanceof Error && error.message.includes('406')) {
        mensagemErro = 'Erro de permissão. Verifique se você tem acesso para atualizar participantes.';
      } else {
        mensagemErro = traduzirErroSupabase(error) || mensagemErro;
      }
      
      set({
        error: mensagemErro,
        loading: false
      });
      
      throw new Error(mensagemErro);
    }
  },

  deleteParticipant: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await ParticipantsService.delete(id);

      // Remove o participante da lista
      const eventParticipants = get().eventParticipants.filter(
        participant => participant.id !== id
      );

      set({ eventParticipants, loading: false });    } catch (error) {      
      console.error(`Erro ao excluir participante ${id}:`, error);
      const mensagemErro = traduzirErroSupabase(error) || 'Falha ao excluir participante';
      set({
        error: mensagemErro,
        loading: false
      });
      
      // Lançar um erro com a mensagem traduzida
      const erroTraduzido = new Error(mensagemErro);
      throw erroTraduzido;
    }
  },

  clearError: () => set({ error: null })
}));
