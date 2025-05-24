import { create } from 'zustand';
import { Court, CourtReservation } from '../types';
import { CourtService } from '../services/courtService';

interface CourtsState {
  courts: Court[];
  currentCourt: Court | null;
  reservations: CourtReservation[];
  loading: boolean;
  error: string | null;
  
  fetchCourts: () => Promise<void>;
  fetchCourtById: (id: string) => Promise<Court | null>;
  createCourt: (court: Partial<Court>) => Promise<Court>;
  updateCourt: (id: string, court: Partial<Court>) => Promise<Court>;
  deleteCourt: (id: string) => Promise<void>;
  
  fetchReservationsByCourt: (courtId: string, startDate?: string, endDate?: string) => Promise<void>;
  createReservation: (reservation: Partial<CourtReservation>) => Promise<CourtReservation>;
  updateReservation: (id: string, reservation: Partial<CourtReservation>) => Promise<CourtReservation>;
  deleteReservation: (id: string) => Promise<void>;
  
  clearCurrent: () => void;
  clearError: () => void;
}

export const useCourtsStore = create<CourtsState>((set, get) => ({
  courts: [],
  currentCourt: null,
  reservations: [],
  loading: false,
  error: null,
  
  fetchCourts: async () => {
    set({ loading: true, error: null });
    try {
      const courts = await CourtService.getAll();
      set({ courts, loading: false });
    } catch (error) {      console.error('Erro ao buscar quadras:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Falha ao buscar quadras', 
        loading: false 
      });
    }
  },
  
  fetchCourtById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const court = await CourtService.getById(id);
      set({ currentCourt: court, loading: false });
      return court;
    } catch (error) {      console.error(`Erro ao buscar quadra ${id}:`, error);
      set({ 
        error: error instanceof Error ? error.message : 'Falha ao buscar detalhes da quadra', 
        loading: false 
      });
      return null;
    }
  },
  
  createCourt: async (court: Partial<Court>) => {
    set({ loading: true, error: null });
    try {
      const newCourt = await CourtService.create(court);
      set(state => ({ 
        courts: [...state.courts, newCourt],
        currentCourt: newCourt,
        loading: false 
      }));
      return newCourt;
    } catch (error) {      console.error('Erro ao criar quadra:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Falha ao criar quadra', 
        loading: false 
      });
      throw error;
    }
  },
  
  updateCourt: async (id: string, court: Partial<Court>) => {
    set({ loading: true, error: null });
    try {
      const updatedCourt = await CourtService.update(id, court);
      set(state => ({ 
        courts: state.courts.map(c => c.id === id ? updatedCourt : c),
        currentCourt: updatedCourt,
        loading: false 
      }));
      return updatedCourt;
    } catch (error) {      console.error(`Erro ao atualizar quadra ${id}:`, error);
      set({ 
        error: error instanceof Error ? error.message : 'Falha ao atualizar quadra', 
        loading: false 
      });
      throw error;
    }
  },
  
  deleteCourt: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await CourtService.delete(id);
      set(state => ({ 
        courts: state.courts.filter(c => c.id !== id),
        currentCourt: state.currentCourt?.id === id ? null : state.currentCourt,
        loading: false 
      }));
    } catch (error) {      console.error(`Erro ao excluir quadra ${id}:`, error);
      set({ 
        error: error instanceof Error ? error.message : 'Falha ao excluir quadra', 
        loading: false 
      });
      throw error;
    }
  },
  
  fetchReservationsByCourt: async (courtId: string, startDate?: string, endDate?: string) => {
    set({ loading: true, error: null });
    try {
      const reservations = await CourtService.getReservationsByCourt(courtId, startDate, endDate);
      set({ reservations, loading: false });
    } catch (error) {      console.error(`Erro ao buscar reservas para a quadra ${courtId}:`, error);
      set({ 
        error: error instanceof Error ? error.message : 'Falha ao buscar reservas da quadra', 
        loading: false 
      });
    }
  },
  
  createReservation: async (reservation: Partial<CourtReservation>) => {
    set({ loading: true, error: null });
    try {
      const newReservation = await CourtService.createReservation(reservation);
      set(state => ({ 
        reservations: [...state.reservations, newReservation],
        loading: false 
      }));
      return newReservation;
    } catch (error) {      console.error('Erro ao criar reserva:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Falha ao criar reserva', 
        loading: false 
      });
      throw error;
    }
  },
  
  updateReservation: async (id: string, reservation: Partial<CourtReservation>) => {
    set({ loading: true, error: null });
    try {
      const updatedReservation = await CourtService.updateReservation(id, reservation);
      set(state => ({ 
        reservations: state.reservations.map(r => r.id === id ? updatedReservation : r),
        loading: false 
      }));
      return updatedReservation;
    } catch (error) {      console.error(`Erro ao atualizar reserva ${id}:`, error);
      set({ 
        error: error instanceof Error ? error.message : 'Falha ao atualizar reserva', 
        loading: false 
      });
      throw error;
    }
  },
  
  deleteReservation: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await CourtService.deleteReservation(id);
      set(state => ({ 
        reservations: state.reservations.filter(r => r.id !== id),
        loading: false 
      }));
    } catch (error) {      console.error(`Erro ao excluir reserva ${id}:`, error);
      set({ 
        error: error instanceof Error ? error.message : 'Falha ao excluir reserva', 
        loading: false 
      });
      throw error;
    }
  },
  
  clearCurrent: () => set({ currentCourt: null }),
  clearError: () => set({ error: null })
}));
