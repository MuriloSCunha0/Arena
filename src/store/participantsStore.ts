import { create } from 'zustand';
// Import the shared CreateParticipantDTO
import { Participant, CreateParticipantDTO } from '../types';
import { ParticipantsService } from '../services';
import { traduzirErroSupabase } from '../lib/supabase';

// Remove the local definition of CreateParticipantDTO
// interface CreateParticipantDTO {
//   eventId: string;
//   name: string;
//   email: string;
//   phone: string;
//   partnerId?: string;
// }

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
      // Pass the full data object to the service
      const newParticipant = await ParticipantsService.create(data);

      // Update the list of event participants
      const currentEventParticipants = get().eventParticipants;
      // Add only if the new participant belongs to the currently viewed event (if applicable)
      // Or simply refetch if simpler
      if (currentEventParticipants.length > 0 && currentEventParticipants[0].eventId === data.eventId) {
         set(state => ({ eventParticipants: [...state.eventParticipants, newParticipant], loading: false }));
      } else {
         // If eventParticipants is empty or for a different event, just set loading false
         set({ loading: false });
         // Optionally refetch if necessary: await get().fetchParticipantsByEvent(data.eventId);
      }


      // Optionally update allParticipants list if it's already populated
      if (get().allParticipants.length > 0) {
        set(state => ({ allParticipants: [...state.allParticipants, newParticipant] }));
      }


      return newParticipant;    } catch (error) {      
      console.error('Erro ao criar participante:', error);
      const mensagemErro = traduzirErroSupabase(error) || 'Falha ao criar participante';
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
      const updatedParticipant = await ParticipantsService.updatePaymentStatus(id, status);

      // Atualiza o participante na lista
      const eventParticipants = get().eventParticipants.map(participant =>
        participant.id === id ? updatedParticipant : participant
      );

      set({ eventParticipants, loading: false });    } catch (error) {      
      console.error(`Erro ao atualizar pagamento do participante ${id}:`, error);
      const mensagemErro = traduzirErroSupabase(error) || 'Falha ao atualizar status de pagamento';
      set({
        error: mensagemErro,
        loading: false
      });
      
      // Lançar um erro com a mensagem traduzida
      const erroTraduzido = new Error(mensagemErro);
      throw erroTraduzido;
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
