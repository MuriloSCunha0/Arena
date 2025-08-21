import { create } from 'zustand';
import { Event } from '../types';
import { EventsService } from '../services/supabase/events';
import { withCacheRetry, isCacheError } from '../utils/cacheUtils';
import { withRequestCache, createCacheKey } from '../utils/requestCache';

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
      console.log('🔍 [EventsStore] Iniciando busca de eventos...');
      
      // Usar withCacheRetry para operação robusta
      const events = await withCacheRetry(
        () => EventsService.getAll(),
        2,
        'buscar eventos'
      );
      
      console.log(`✅ [EventsStore] Eventos carregados:`, {
        total: events.length,
        primeiros3: events.slice(0, 3).map(e => ({
          id: e.id,
          title: e.title,
          date: e.date,
          status: e.status
        }))
      });
      
      set({ events, loading: false });
    } catch (error) {
      console.error('Error fetching events:', error);
      
      // Usar detecção inteligente de erro de cache
      const cacheInfo = isCacheError(error);
      let errorMessage = 'Falha ao buscar eventos';
      
      if (cacheInfo.isSchemaCache) {
        if (cacheInfo.missingColumn) {
          errorMessage = `Erro de configuração: coluna '${cacheInfo.missingColumn}' não encontrada na tabela ${cacheInfo.tableName}. Contate o administrador.`;
        } else {
          errorMessage = 'Erro de cache do banco de dados. Tente novamente em alguns instantes.';
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      set({ error: errorMessage, loading: false });
    }
  },

  fetchEventById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      // Usar withCacheRetry para operação robusta
      const event = await withCacheRetry(
        () => EventsService.getById(id),
        2,
        'buscar detalhes do evento'
      );
      set({ currentEvent: event, loading: false });
    } catch (error) {
      console.error(`Error fetching event ${id}:`, error);
      
      // Usar detecção inteligente de erro de cache
      const cacheInfo = isCacheError(error);
      let errorMessage = 'Falha ao buscar detalhes do evento';
      
      if (cacheInfo.isSchemaCache) {
        if (cacheInfo.missingColumn) {
          errorMessage = `Erro de configuração: coluna '${cacheInfo.missingColumn}' não encontrada na tabela ${cacheInfo.tableName}. Contate o administrador.`;
        } else {
          errorMessage = 'Erro de cache do banco de dados. Tente novamente em alguns instantes.';
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      set({ error: errorMessage, loading: false });
    }
  },

  // Implement getByIdWithOrganizer with duplicate call prevention and request cache
  getByIdWithOrganizer: async (id: string) => {
    const cacheKey = createCacheKey('event-with-organizer', id);
    
    // Usar cache de requisição para prevenir múltiplas chamadas simultâneas
    return withRequestCache(cacheKey, async () => {
      const currentState = get();
      
      // Verificar se já temos este evento carregado e não há erro
      if (currentState.currentEvent?.id === id && !currentState.error) {
        console.log(`[EventsStore] Event ${id} already loaded, returning cached data`);
        return;
      }
      
      set({ loading: true, error: null });
      
      try {
        console.log(`[EventsStore] Fetching event ${id} with organizer`);
        
        // Usar withCacheRetry para operação robusta
        const event = await withCacheRetry(
          () => EventsService.getByIdWithOrganizer(id),
          2,
          'buscar evento com organizador'
        );
        
        if (!event) {
          throw new Error('Evento não encontrado.');
        }
        
        console.log(`[EventsStore] Successfully loaded event ${id}`);
        set({ currentEvent: event, loading: false });
        
      } catch (error) {
        console.error(`[EventsStore] Error fetching event ${id} with organizer:`, error);
        
        // Usar detecção inteligente de erro de cache
        const cacheInfo = isCacheError(error);
        let errorMessage = 'Falha ao carregar evento com organizador';
        
        if (cacheInfo.isSchemaCache) {
          if (cacheInfo.missingColumn) {
            errorMessage = `Erro de configuração: coluna '${cacheInfo.missingColumn}' não encontrada na tabela ${cacheInfo.tableName}. Contate o administrador.`;
          } else {
            errorMessage = 'Erro de cache do banco de dados. Tente novamente em alguns instantes.';
          }
        } else if (error instanceof Error) {
          if (error.message.includes('Failed to fetch') || error.message.includes('Network error')) {
            errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
          } else {
            errorMessage = error.message;
          }
        }
        
        set({
          error: errorMessage,
          loading: false
        });
        
        // Não re-throw o erro para evitar propagação desnecessária
        console.log(`[EventsStore] Error handled for event ${id}: ${errorMessage}`);
      }
    });
  },

  createEvent: async (event: Partial<Event>) => {
    set({ loading: true, error: null });
    try {
      // Usar withCacheRetry para operação robusta
      const newEvent = await withCacheRetry(
        () => EventsService.create(event),
        2,
        'criar evento'
      );
      
      set(state => ({ 
        events: [...state.events, newEvent],
        currentEvent: newEvent,
        loading: false 
      }));
      return newEvent;
    } catch (error) {
      console.error('Error creating event:', error);
      
      // Usar detecção inteligente de erro de cache
      const cacheInfo = isCacheError(error);
      let errorMessage = 'Erro ao criar evento';
      
      if (cacheInfo.isSchemaCache) {
        if (cacheInfo.missingColumn) {
          errorMessage = `Erro de configuração: coluna '${cacheInfo.missingColumn}' não encontrada na tabela ${cacheInfo.tableName}. Contate o administrador.`;
        } else {
          errorMessage = 'Erro de cache do banco de dados. Tente novamente em alguns instantes.';
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      set({ 
        loading: false, 
        error: errorMessage
      });
      throw new Error(errorMessage);
    }
  },

  updateEvent: async (id: string, event: Partial<Event>) => {
    set({ loading: true, error: null });
    try {
      // Usar withCacheRetry para operação robusta
      const updatedEvent = await withCacheRetry(
        () => EventsService.update(id, event),
        2,
        'atualizar evento'
      );
      
      set(state => ({ 
        events: state.events.map(e => e.id === id ? updatedEvent : e),
        currentEvent: updatedEvent,
        loading: false 
      }));
      return updatedEvent;
    } catch (error) {
      console.error(`Error updating event ${id}:`, error);
      
      // Usar detecção inteligente de erro de cache
      const cacheInfo = isCacheError(error);
      let errorMessage = 'Falha ao atualizar o evento';
      
      if (cacheInfo.isSchemaCache) {
        if (cacheInfo.missingColumn) {
          errorMessage = `Erro de configuração: coluna '${cacheInfo.missingColumn}' não encontrada na tabela ${cacheInfo.tableName}. Contate o administrador.`;
        } else {
          errorMessage = 'Erro de cache do banco de dados. Tente novamente em alguns instantes.';
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },

  deleteEvent: async (id: string) => {
    set({ loading: true, error: null });
    try {
      // Usar withCacheRetry para operação robusta
      await withCacheRetry(
        () => EventsService.delete(id),
        2,
        'excluir evento'
      );
      
      set(state => ({ 
        events: state.events.filter(e => e.id !== id),
        currentEvent: state.currentEvent?.id === id ? null : state.currentEvent,
        loading: false 
      }));
    } catch (error) {
      console.error(`Error deleting event ${id}:`, error);
      
      // Usar detecção inteligente de erro de cache
      const cacheInfo = isCacheError(error);
      let errorMessage = 'Falha ao excluir o evento';
      
      if (cacheInfo.isSchemaCache) {
        if (cacheInfo.missingColumn) {
          errorMessage = `Erro de configuração: coluna '${cacheInfo.missingColumn}' não encontrada na tabela ${cacheInfo.tableName}. Contate o administrador.`;
        } else {
          errorMessage = 'Erro de cache do banco de dados. Tente novamente em alguns instantes.';
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },

  clearCurrent: () => set({ currentEvent: null }),
  clearError: () => set({ error: null })
}));
