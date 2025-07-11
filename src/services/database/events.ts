/**
 * Serviço para Eventos - Aderente ao DDL PostgreSQL
 * Arquivo: services/database/events.ts
 * 
 * Este serviço usa os nomes de campos corretos conforme o DDL real
 */

import { supabase } from '../../lib/supabase';
import { 
  DatabaseEvent, 
  DatabaseResponse, 
  DatabaseArrayResponse,
  EventType,
  EventStatus,
  TournamentFormat,
  TeamFormationType 
} from '../../types/database';

export class EventsService {
  
  /**
   * Cria um novo evento usando os campos corretos do DDL
   */
  static async createEvent(eventData: Partial<DatabaseEvent>): Promise<DatabaseResponse<DatabaseEvent>> {
    try {
      const { data, error } = await supabase
        .from('events')
        .insert({
          title: eventData.title, // ✅ Corrigido: usar 'title' não 'name'
          description: eventData.description,
          type: eventData.type || 'TOURNAMENT',
          tournament_format: eventData.tournament_format || 'GROUP_STAGE_ELIMINATION',
          team_formation: eventData.team_formation || 'FORMED',
          max_participants: eventData.max_participants,
          min_participants: eventData.min_participants || 4,
          location: eventData.location,
          date: eventData.date,
          time: eventData.time,
          end_date: eventData.end_date,
          end_time: eventData.end_time,
          entry_fee: eventData.entry_fee || 0, // ✅ Corrigido: usar 'entry_fee' não 'price'
          prize_pool: eventData.prize_pool,
          prize_distribution: eventData.prize_distribution,
          organizer_id: eventData.organizer_id,
          organizer_commission_rate: eventData.organizer_commission_rate,
          court_ids: eventData.court_ids,
          rules: eventData.rules,
          additional_info: eventData.additional_info,
          banner_image_url: eventData.banner_image_url,
          images: eventData.images,
          settings: eventData.settings,
          categories: eventData.categories,
          age_restrictions: eventData.age_restrictions,
          skill_level: eventData.skill_level
        })
        .select()
        .single();

      return { data, error };
    } catch (err) {
      console.error('Error creating event:', err);
      return { 
        data: null, 
        error: { message: 'Failed to create event', details: String(err) } 
      };
    }
  }

  /**
   * Busca eventos com filtros
   */
  static async getEvents(filters?: {
    type?: EventType;
    status?: EventStatus;
    location?: string;
    dateFrom?: string;
    dateTo?: string;
    organizerId?: string;
  }): Promise<DatabaseArrayResponse<DatabaseEvent>> {
    try {
      let query = supabase
        .from('events')
        .select(`
          *,
          organizers (
            id,
            name,
            phone,
            email
          )
        `);

      // Aplicar filtros
      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      
      if (filters?.location) {
        query = query.ilike('location', `%${filters.location}%`);
      }
      
      if (filters?.dateFrom) {
        query = query.gte('date', filters.dateFrom);
      }
      
      if (filters?.dateTo) {
        query = query.lte('date', filters.dateTo);
      }
      
      if (filters?.organizerId) {
        query = query.eq('organizer_id', filters.organizerId);
      }

      // Ordenar por data
      query = query.order('date', { ascending: true });

      const { data, error } = await query;

      return { data, error };
    } catch (err) {
      console.error('Error getting events:', err);
      return { 
        data: null, 
        error: { message: 'Failed to get events', details: String(err) } 
      };
    }
  }

  /**
   * Busca um evento por ID
   */
  static async getEventById(id: string): Promise<DatabaseResponse<DatabaseEvent>> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          organizers (
            id,
            name,
            phone,
            email,
            pix_key
          ),
          tournaments (
            id,
            format,
            status,
            settings,
            current_round,
            groups_count,
            matches_data,
            teams_data,
            standings_data,
            elimination_bracket,
            started_at,
            completed_at
          )
        `)
        .eq('id', id)
        .single();

      return { data, error };
    } catch (err) {
      console.error('Error getting event by ID:', err);
      return { 
        data: null, 
        error: { message: 'Failed to get event', details: String(err) } 
      };
    }
  }

  /**
   * Atualiza um evento
   */
  static async updateEvent(
    id: string, 
    updates: Partial<DatabaseEvent>
  ): Promise<DatabaseResponse<DatabaseEvent>> {
    try {
      const { data, error } = await supabase
        .from('events')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    } catch (err) {
      console.error('Error updating event:', err);
      return { 
        data: null, 
        error: { message: 'Failed to update event', details: String(err) } 
      };
    }
  }

  /**
   * Atualiza contador de participantes (usado pelo trigger)
   */
  static async updateParticipantCount(eventId: string): Promise<void> {
    try {
      // Este método é executado automaticamente pelo trigger
      // Mas pode ser chamado manualmente se necessário
      const { data: participantCount } = await supabase
        .from('participants') // ✅ Usar 'participants' não 'event_participants'
        .select('id', { count: 'exact' })
        .eq('event_id', eventId);

      if (participantCount !== null) {
        await supabase
          .from('events')
          .update({ 
            current_participants: participantCount,
            updated_at: new Date().toISOString()
          })
          .eq('id', eventId);
      }
    } catch (err) {
      console.error('Error updating participant count:', err);
    }
  }

  /**
   * Busca eventos por título (usando índice de texto)
   */
  static async searchEventsByTitle(searchTerm: string): Promise<DatabaseArrayResponse<DatabaseEvent>> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .textSearch('title', searchTerm)
        .order('date', { ascending: true });

      return { data, error };
    } catch (err) {
      console.error('Error searching events:', err);
      return { 
        data: null, 
        error: { message: 'Failed to search events', details: String(err) } 
      };
    }
  }

  /**
   * Verifica se um evento pode aceitar mais participantes
   */
  static async canAcceptParticipants(eventId: string): Promise<boolean> {
    try {
      const { data: event } = await supabase
        .from('events')
        .select('max_participants, current_participants')
        .eq('id', eventId)
        .single();

      if (!event) return false;

      return event.current_participants < event.max_participants;
    } catch (err) {
      console.error('Error checking participant capacity:', err);
      return false;
    }
  }

  /**
   * Busca eventos próximos (nos próximos 7 dias)
   */
  static async getUpcomingEvents(): Promise<DatabaseArrayResponse<DatabaseEvent>> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          organizers (
            id,
            name,
            phone
          )
        `)
        .gte('date', today)
        .lte('date', nextWeekStr)
        .in('type', ['TOURNAMENT', 'CHAMPIONSHIP'])
        .order('date', { ascending: true });

      return { data, error };
    } catch (err) {
      console.error('Error getting upcoming events:', err);
      return { 
        data: null, 
        error: { message: 'Failed to get upcoming events', details: String(err) } 
      };
    }
  }

  /**
   * Busca estatísticas de eventos por organizador
   */
  static async getOrganizerEventStats(organizerId: string): Promise<{
    totalEvents: number;
    activeEvents: number;
    completedEvents: number;
    totalParticipants: number;
    totalRevenue: number;
  } | null> {
    try {
      const { data: events } = await supabase
        .from('events')
        .select('id, type, current_participants, entry_fee')
        .eq('organizer_id', organizerId);

      if (!events) return null;

      const stats = {
        totalEvents: events.length,
        activeEvents: events.filter(e => e.type === 'TOURNAMENT').length,
        completedEvents: 0, // TODO: calcular baseado no status
        totalParticipants: events.reduce((sum, e) => sum + (e.current_participants || 0), 0),
        totalRevenue: events.reduce((sum, e) => 
          sum + ((e.current_participants || 0) * (e.entry_fee || 0)), 0
        )
      };

      return stats;
    } catch (err) {
      console.error('Error getting organizer stats:', err);
      return null;
    }
  }
}

export default EventsService;
