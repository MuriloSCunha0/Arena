import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { isDemoMode, getDemoEvents } from '../utils/demoMode';
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
      if (isDemoMode()) {
        // Usar dados de demonstração
        const demoEvents = getDemoEvents();
        
        // Completar com as propriedades faltantes para atender ao tipo Event
        const validatedEvents = demoEvents.map(event => {
          const completeEvent = {
            ...event,
            // Adicionar propriedades ausentes com valores padrão
            price: event.entryFee || 0,
            prize: `Prêmio para ${event.title}`, // Valor padrão direto
            rules: 'Regras padrão do evento',
            bannerImageUrl: null, // Valor direto sem tentar acessar
            teamFormationType: 'INDIVIDUAL',
            registrationsEndDate: event.date, // Usar a data do evento
            category: 'GERAL',
            // Propriedades adicionais necessárias
            teamFormation: [],
            categories: [],
            updatedAt: event.createdAt
          };
          
          // Converter para unknown primeiro e depois para Event
          return completeEvent as unknown as Event;
        });
        
        set({ events: validatedEvents, loading: false });
        return;
      }
      
      // Código original para ambiente de produção
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });
      
      if (error) throw error;
      
      set({ events: data || [], loading: false });
    } catch (error: any) {
      console.error('Error fetching events:', error);
      set({ error: error.message, loading: false });
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
