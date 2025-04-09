import { supabase } from '../../lib/supabase';
import { Event } from '../../types';

// Transform function to convert Supabase data format to our application type
const transformEvent = (data: any): Event => ({
  id: data.id,
  type: data.type,
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
  teamFormation: data.team_formation,
  categories: data.categories,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
});

// Convert our application type to Supabase format
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
  categories: event.categories,
});

export const EventService = {
  // Get all events
  async getAll(): Promise<Event[]> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      return data.map(transformEvent);
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  },

  // Get event by ID
  async getById(id: string): Promise<Event | null> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No event found with this ID
        }
        throw error;
      }

      return transformEvent(data);
    } catch (error) {
      console.error(`Error fetching event ${id}:`, error);
      throw error;
    }
  },

  // Create new event
  async create(eventData: Partial<Event>): Promise<Event> {
    try {
      const { data, error } = await supabase
        .from('events')
        .insert(toSupabaseEvent(eventData))
        .select()
        .single();

      if (error) throw error;
      return transformEvent(data);
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  },

  // Update event
  async update(id: string, eventData: Partial<Event>): Promise<Event> {
    try {
      const { data, error } = await supabase
        .from('events')
        .update(toSupabaseEvent(eventData))
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return transformEvent(data);
    } catch (error) {
      console.error(`Error updating event ${id}:`, error);
      throw error;
    }
  },

  // Delete event
  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error(`Error deleting event ${id}:`, error);
      throw error;
    }
  }
};
