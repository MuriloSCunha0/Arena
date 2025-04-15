import { supabase } from '../lib/supabase';
import { Event } from '../types';

export const EventsService = {
  // ...existing methods...

  async createEvent(eventData: Partial<Event>): Promise<Event> {
    try {
      // Extract courtIds from eventData
      const courtIds = eventData.courtIds || [];
      
      // Remove courtIds from data to insert into events table
      const { courtIds: _, ...eventDataToInsert } = eventData;

      const { data, error } = await supabase
        .from('events')
        .insert([eventDataToInsert])
        .select()
        .single();

      if (error) throw error;
      
      // If court IDs were provided, associate them with the event
      if (courtIds.length > 0) {
        const courtRelations = courtIds.map(courtId => ({
          event_id: data.id,
          court_id: courtId
        }));
        
        const { error: courtRelationsError } = await supabase
          .from('event_courts')
          .insert(courtRelations);
          
        if (courtRelationsError) throw courtRelationsError;
      }

      // Return complete Event object with all required properties
      return {
        id: data.id,
        title: data.title,
        date: data.date,
        time: data.time,
        location: data.location,
        maxParticipants: data.max_participants,
        type: data.type,
        description: data.description,
        price: data.price || 0,
        prize: data.prize || '',
        rules: data.rules || '',
        bannerImageUrl: data.banner_image_url || '',
        teamFormation: data.team_formation || 'RANDOM',
        categories: data.categories || [],
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  },

  async updateEvent(id: string, eventData: Partial<Event>): Promise<Event> {
    try {
      // Extract courtIds from eventData
      const courtIds = eventData.courtIds || [];
      
      // Remove courtIds from data to update in events table
      const { courtIds: _, ...eventDataToUpdate } = eventData;
      
      const { data, error } = await supabase
        .from('events')
        .update(eventDataToUpdate)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Update court associations
      if (courtIds.length >= 0) { // Intentional, handle empty array too
        // First delete all existing associations
        const { error: deleteError } = await supabase
          .from('event_courts')
          .delete()
          .eq('event_id', id);
        
        if (deleteError) throw deleteError;
        
        // Then insert new associations if there are any
        if (courtIds.length > 0) {
          const courtRelations = courtIds.map(courtId => ({
            event_id: id,
            court_id: courtId
          }));
          
          const { error: insertError } = await supabase
            .from('event_courts')
            .insert(courtRelations);
          
          if (insertError) throw insertError;
        }
      }

      // Return complete Event object with all required properties
      return {
        id: data.id,
        title: data.title,
        date: data.date,
        time: data.time,
        location: data.location,
        maxParticipants: data.max_participants,
        type: data.type,
        description: data.description,
        price: data.price || 0,
        prize: data.prize || '',
        rules: data.rules || '',
        bannerImageUrl: data.banner_image_url || '',
        teamFormation: data.team_formation || 'RANDOM',
        categories: data.categories || [],
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error(`Error updating event ${id}:`, error);
      throw error;
    }
  },

  // ...existing methods...
};