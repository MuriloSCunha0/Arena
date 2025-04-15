import { create } from 'zustand';
import { Event } from '../types';
import { EventsService } from '../services';

interface EventsState {
  events: Event[];
  currentEvent: Event | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchEvents: () => Promise<void>;
  fetchEventById: (id: string) => Promise<void>;
  getByIdWithOrganizer: (id: string) => Promise<void>; // Add action signature
  createEvent: (event: Partial<Event>) => Promise<Event>;
  updateEvent: (id: string, event: Partial<Event>) => Promise<Event>;
  deleteEvent: (id: string) => Promise<void>;
  clearCurrent: () => void;
  clearError: () => void;
}

export const useEventsStore = create<EventsState>((set, get) => ({
  events: [],
  currentEvent: null,
  loading: false,
  error: null,

  fetchEvents: async () => {
    set({ loading: true, error: null });
    try {
      const events = await EventsService.getAll();
      set({ events, loading: false });
    } catch (error) {
      console.error('Error fetching events:', error);
      set({ error: 'Falha ao buscar eventos', loading: false });
    }
  },

  fetchEventById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const event = await EventsService.getById(id);
      set({ currentEvent: event, loading: false });
    } catch (error) {
      console.error(`Error fetching event ${id}:`, error);
      set({ error: 'Falha ao buscar detalhes do evento', loading: false });
    }
  },

  // Implement getByIdWithOrganizer
  getByIdWithOrganizer: async (id: string) => {
    set({ loading: true, error: null, currentEvent: null });
    try {
      const event = await EventsService.getByIdWithOrganizer(id);
      if (!event) {
        throw new Error('Evento não encontrado.');
      }
      set({ currentEvent: event, loading: false });
    } catch (error) {
      console.error(`Error fetching event ${id} with organizer:`, error);
      set({
        error: error instanceof Error ? error.message : 'Falha ao carregar evento com organizador',
        loading: false
      });
      throw error; // Re-throw for component handling
    }
  },

  createEvent: async (event: Partial<Event>) => {
    set({ loading: true, error: null });
    try {
      const newEvent = await EventsService.create(event);
      set(state => ({ 
        events: [...state.events, newEvent],
        currentEvent: newEvent,
        loading: false 
      }));
      return newEvent;
    } catch (error) {
      console.error('Error creating event:', error);
      set({ error: 'Falha ao criar o evento', loading: false });
      throw error;
    }
  },

  updateEvent: async (id: string, event: Partial<Event>) => {
    set({ loading: true, error: null });
    try {
      const updatedEvent = await EventsService.update(id, event);
      set(state => ({ 
        events: state.events.map(e => e.id === id ? updatedEvent : e),
        currentEvent: updatedEvent,
        loading: false 
      }));
      return updatedEvent;
    } catch (error) {
      console.error(`Error updating event ${id}:`, error);
      set({ error: 'Falha ao atualizar o evento', loading: false });
      throw error;
    }
  },

  deleteEvent: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await EventsService.delete(id);
      set(state => ({ 
        events: state.events.filter(e => e.id !== id),
        currentEvent: state.currentEvent?.id === id ? null : state.currentEvent,
        loading: false 
      }));
    } catch (error) {
      console.error(`Error deleting event ${id}:`, error);
      set({ error: 'Falha ao excluir o evento', loading: false });
      throw error;
    }
  },

  clearCurrent: () => set({ currentEvent: null }),
  clearError: () => set({ error: null })
}));
