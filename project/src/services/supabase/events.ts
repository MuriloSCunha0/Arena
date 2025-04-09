import { supabase } from '../../lib/supabase';
import { Event, EventType, TeamFormationType } from '../../types';

// Função para converter dados do Supabase para nosso tipo Event
const transformEvent = (data: any): Event => ({
  id: data.id,
  type: data.type as EventType,
  title: data.title,
  description: data.description,
  location: data.location,
  date: data.date,
  time: data.time,
  price: data.price,
  maxParticipants: data.max_participants,
  prize: data.prize,
  rules: data.rules,
  bannerImageUrl: data.banner_image_url,
  teamFormation: data.team_formation as TeamFormationType,
  categories: data.categories || [],
  createdAt: data.created_at,
  updatedAt: data.updated_at,
});

// Função para converter nosso tipo Event para o formato do Supabase
const toSupabaseEvent = (event: Partial<Event>) => ({
  type: event.type,
  title: event.title,
  description: event.description,
  location: event.location,
  date: event.date,
  time: event.time,
  price: event.price,
  max_participants: event.maxParticipants,
  prize: event.prize,
  rules: event.rules,
  banner_image_url: event.bannerImageUrl,
  team_formation: event.teamFormation,
  categories: event.categories || [],
});

export const EventsService = {
  // Buscar todos os eventos
  async getAll(): Promise<Event[]> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error fetching events:', error);
        throw new Error(`Failed to fetch events: ${error.message}`);
      }
      
      return (data || []).map(transformEvent);
    } catch (error) {
      console.error('Error in getAll events:', error);
      throw error;
    }
  },

  // Buscar um evento por ID
  async getById(id: string): Promise<Event | null> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No rows returned
        }
        console.error(`Supabase error fetching event ${id}:`, error);
        throw new Error(`Failed to fetch event: ${error.message}`);
      }
      
      if (!data) return null;
      return transformEvent(data);
    } catch (error) {
      console.error(`Error in getById event ${id}:`, error);
      throw error;
    }
  },

  // Criar um novo evento
  async create(event: Partial<Event>): Promise<Event> {
    try {
      const { data, error } = await supabase
        .from('events')
        .insert(toSupabaseEvent(event))
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating event:', error);
        throw new Error(`Failed to create event: ${error.message}`);
      }
      
      return transformEvent(data);
    } catch (error) {
      console.error('Error in create event:', error);
      throw error;
    }
  },

  // Atualizar um evento existente
  async update(id: string, event: Partial<Event>): Promise<Event> {
    try {
      const { data, error } = await supabase
        .from('events')
        .update(toSupabaseEvent(event))
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`Supabase error updating event ${id}:`, error);
        throw new Error(`Failed to update event: ${error.message}`);
      }
      
      return transformEvent(data);
    } catch (error) {
      console.error(`Error in update event ${id}:`, error);
      throw error;
    }
  },

  // Excluir um evento
  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`Supabase error deleting event ${id}:`, error);
        throw new Error(`Failed to delete event: ${error.message}`);
      }
    } catch (error) {
      console.error(`Error in delete event ${id}:`, error);
      throw error;
    }
  },

  // Obter contagem de participantes por evento
  async getParticipantCount(eventId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('participants')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId);

      if (error) {
        console.error(`Supabase error getting participant count for event ${eventId}:`, error);
        throw new Error(`Failed to get participant count: ${error.message}`);
      }
      
      return count || 0;
    } catch (error) {
      console.error(`Error in getParticipantCount for event ${eventId}:`, error);
      throw error;
    }
  }
};
