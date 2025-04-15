import { create } from 'zustand';
import { Organizer } from '../types';
import { OrganizersService } from '../services/supabase/organizers';

interface OrganizersState {
  organizers: Organizer[];
  currentOrganizer: Organizer | null;
  loading: boolean;
  error: string | null;
  
  fetchOrganizers: () => Promise<void>;
  fetchOrganizerById: (id: string) => Promise<void>;
  createOrganizer: (organizer: Partial<Organizer>) => Promise<void>;
  updateOrganizer: (id: string, organizer: Partial<Organizer>) => Promise<void>;
  deleteOrganizer: (id: string) => Promise<void>;
  clearCurrentOrganizer: () => void;
  calculateCommissions: (organizerId: string, startDate?: string, endDate?: string) => Promise<any>;
}

export const useOrganizersStore = create<OrganizersState>((set, get) => ({
  organizers: [],
  currentOrganizer: null,
  loading: false,
  error: null,
  
  fetchOrganizers: async () => {
    set({ loading: true, error: null });
    try {
      const organizers = await OrganizersService.getAll();
      set({ organizers, loading: false });
    } catch (error) {
      console.error('Error fetching organizers:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Erro ao carregar organizadores', 
        loading: false 
      });
    }
  },
  
  fetchOrganizerById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const organizer = await OrganizersService.getById(id);
      set({ currentOrganizer: organizer, loading: false });
    } catch (error) {
      console.error(`Error fetching organizer ${id}:`, error);
      set({ 
        error: error instanceof Error ? error.message : 'Erro ao carregar organizador', 
        loading: false 
      });
    }
  },
  
  createOrganizer: async (organizer: Partial<Organizer>) => {
    set({ loading: true, error: null });
    try {
      const newOrganizer = await OrganizersService.create(organizer);
      set(state => ({ 
        organizers: [...state.organizers, newOrganizer],
        currentOrganizer: newOrganizer,
        loading: false 
      }));
    } catch (error) {
      console.error('Error creating organizer:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Erro ao criar organizador', 
        loading: false 
      });
      throw error;
    }
  },
  
  updateOrganizer: async (id: string, organizer: Partial<Organizer>) => {
    set({ loading: true, error: null });
    try {
      const updatedOrganizer = await OrganizersService.update(id, organizer);
      set(state => ({ 
        organizers: state.organizers.map(o => o.id === id ? updatedOrganizer : o),
        currentOrganizer: updatedOrganizer,
        loading: false 
      }));
    } catch (error) {
      console.error(`Error updating organizer ${id}:`, error);
      set({ 
        error: error instanceof Error ? error.message : 'Erro ao atualizar organizador', 
        loading: false 
      });
      throw error;
    }
  },
  
  deleteOrganizer: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await OrganizersService.delete(id);
      set(state => ({ 
        organizers: state.organizers.filter(o => o.id !== id),
        loading: false 
      }));
    } catch (error) {
      console.error(`Error deleting organizer ${id}:`, error);
      set({ 
        error: error instanceof Error ? error.message : 'Erro ao excluir organizador', 
        loading: false 
      });
      throw error;
    }
  },
  
  clearCurrentOrganizer: () => set({ currentOrganizer: null }),
  
  calculateCommissions: async (organizerId: string, startDate?: string, endDate?: string) => {
    set({ loading: true, error: null });
    try {
      const commissions = await OrganizersService.calculateCommissions(organizerId, startDate, endDate);
      set({ loading: false });
      return commissions;
    } catch (error) {
      console.error(`Error calculating commissions for organizer ${organizerId}:`, error);
      set({ 
        error: error instanceof Error ? error.message : 'Erro ao calcular comissões', 
        loading: false 
      });
      throw error;
    }
  }
}));
