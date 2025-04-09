import { create } from 'zustand';
import { Participant } from '../types';
import { ParticipantsService } from '../services';

interface CreateParticipantDTO {
  eventId: string;
  name: string;
  email: string;
  phone: string;
  partnerId?: string;
}

interface ParticipantsState {
  eventParticipants: Participant[];
  allParticipants: Participant[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchParticipantsByEvent: (eventId: string) => Promise<void>;
  fetchAllParticipants: () => Promise<void>;
  createParticipant: (data: CreateParticipantDTO) => Promise<Participant>; // Updated return type to match implementation
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
      set({ eventParticipants: participants, loading: false });
    } catch (error) {
      console.error(`Error fetching participants for event ${eventId}:`, error);
      set({ 
        error: error instanceof Error ? error.message : 'Falha ao buscar participantes', 
        loading: false 
      });
    }
  },
  
  fetchAllParticipants: async () => {
    set({ loading: true, error: null });
    try {
      const participants = await ParticipantsService.getAll();
      set({ allParticipants: participants, loading: false });
    } catch (error) {
      console.error('Error fetching all participants:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Falha ao buscar todos os participantes', 
        loading: false 
      });
    }
  },
  
  createParticipant: async (data: CreateParticipantDTO) => {
    set({ loading: true, error: null });
    try {
      const newParticipant = await ParticipantsService.create(data);
      
      // Atualiza a lista de participantes do evento
      const eventParticipants = [...get().eventParticipants, newParticipant];
      set({ eventParticipants, loading: false });
      
      return newParticipant;
    } catch (error) {
      console.error('Error creating participant:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Falha ao criar participante', 
        loading: false 
      });
      throw error;
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
      
      set({ eventParticipants, loading: false });
    } catch (error) {
      console.error(`Error updating participant payment ${id}:`, error);
      set({ 
        error: error instanceof Error ? error.message : 'Falha ao atualizar status de pagamento', 
        loading: false 
      });
      throw error;
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
      
      set({ eventParticipants, loading: false });
    } catch (error) {
      console.error(`Error deleting participant ${id}:`, error);
      set({ 
        error: error instanceof Error ? error.message : 'Falha ao excluir participante', 
        loading: false 
      });
      throw error;
    }
  },
  
  clearError: () => set({ error: null })
}));
