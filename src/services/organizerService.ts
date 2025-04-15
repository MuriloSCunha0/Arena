import { supabase } from '../lib/supabase';
import { User } from '../types';

export interface EventOrganizer {
  id: string;
  eventId: string;
  userId: string;
  role: 'ADMIN' | 'ORGANIZER' | 'ASSISTANT';
  permissions?: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
  user?: User; // Dados do usuário associado
}

export const OrganizerService = {
  /**
   * Lista os organizadores de um evento
   */
  async getEventOrganizers(eventId: string): Promise<EventOrganizer[]> {
    try {
      const { data, error } = await supabase
        .from('event_organizers')
        .select(`
          *,
          user:users(*)
        `)
        .eq('event_id', eventId)
        .order('role');

      if (error) throw error;

      // Transform data to match our interface
      return (data || []).map(item => ({
        id: item.id,
        eventId: item.event_id,
        userId: item.user_id,
        role: item.role,
        permissions: item.permissions,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        user: item.user
      }));
    } catch (error) {
      console.error('Error fetching event organizers:', error);
      throw error;
    }
  },

  /**
   * Adiciona um organizador ao evento
   */
  async addOrganizer(eventId: string, userId: string, role: EventOrganizer['role'] = 'ORGANIZER'): Promise<EventOrganizer> {
    try {
      // Verificar se o usuário já é organizador deste evento
      const { data: existingOrganizer } = await supabase
        .from('event_organizers')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .single();

      if (existingOrganizer) {
        throw new Error('Este usuário já é organizador deste evento');
      }

      const { data, error } = await supabase
        .from('event_organizers')
        .insert({
          event_id: eventId,
          user_id: userId,
          role: role
        })
        .select(`
          *,
          user:users(*)
        `)
        .single();

      if (error) throw error;

      // Transform to match our interface
      return {
        id: data.id,
        eventId: data.event_id,
        userId: data.user_id,
        role: data.role,
        permissions: data.permissions,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        user: data.user
      };
    } catch (error) {
      console.error('Error adding event organizer:', error);
      throw error;
    }
  },

  /**
   * Atualiza o papel de um organizador
   */
  async updateOrganizerRole(organizerId: string, role: EventOrganizer['role']): Promise<EventOrganizer> {
    try {
      const { data, error } = await supabase
        .from('event_organizers')
        .update({ role })
        .eq('id', organizerId)
        .select(`
          *,
          user:users(*)
        `)
        .single();

      if (error) throw error;

      // Transform to match our interface
      return {
        id: data.id,
        eventId: data.event_id,
        userId: data.user_id,
        role: data.role,
        permissions: data.permissions,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        user: data.user
      };
    } catch (error) {
      console.error('Error updating organizer role:', error);
      throw error;
    }
  },

  /**
   * Remove um organizador do evento
   */
  async removeOrganizer(organizerId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('event_organizers')
        .delete()
        .eq('id', organizerId);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing organizer:', error);
      throw error;
    }
  },

  /**
   * Verifica se o usuário é organizador do evento
   */
  async isUserEventOrganizer(eventId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('event_organizers')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking if user is organizer:', error);
      return false;
    }
  }
};

export default OrganizerService;
