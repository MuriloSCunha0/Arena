import { supabase } from '../../lib/supabase';
import { Event, EventType, TeamFormationType, Organizer } from '../../types'; // Import Organizer

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
  organizerId: data.organizer_id, // Added
  organizerCommissionRate: data.organizer_commission_rate, // Added
  courtIds: data.court_ids || [], // Added, assuming 'court_ids' is the column name (adjust if different)
  // Organizer data might be joined separately, handle in getByIdWithOrganizer
  organizer: data.organizers ? { // Assuming 'organizers' is the alias used in join
      id: data.organizers.id,
      name: data.organizers.name,
      phone: data.organizers.phone,
      email: data.organizers.email,
      pixKey: data.organizers.pix_key,
      defaultCommissionRate: data.organizers.default_commission_rate,
      active: data.organizers.active,
      createdAt: data.organizers.created_at,
      updatedAt: data.organizers.updated_at,
  } : undefined, // Return undefined instead of null
  status: data.status, // Assuming status might come from a related tournament or event table itself
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
  organizer_id: event.organizerId, // Added
  organizer_commission_rate: event.organizerCommissionRate, // Added
  court_ids: event.courtIds || [], // Added, assuming 'court_ids' is the column name
  // Don't include 'organizer' object when sending to Supabase
});

export const EventsService = {
  // Buscar todos os eventos
  async getAll(): Promise<Event[]> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });      if (error) {
        console.error('Supabase error fetching events:', error);
        throw new Error(`Falha ao buscar eventos: ${error.message}`);
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
      const supabaseData = toSupabaseEvent(event);
      console.log("Creating event with data:", supabaseData); // Log data being sent
      const { data, error } = await supabase
        .from('events')
        .insert(supabaseData)
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
      const supabaseData = toSupabaseEvent(event);
      console.log(`Updating event ${id} with data:`, supabaseData); // Log data being sent
      const { data, error } = await supabase
        .from('events')
        .update(supabaseData)
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
        .eq('id', id);      if (error) {
        console.error(`Supabase error deleting event ${id}:`, error);
        throw new Error(`Falha ao excluir evento: ${error.message}`);
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
  },

  // Get event with organizer
  async getByIdWithOrganizer(id: string): Promise<Event | null> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          organizers:organizer_id(*)
        `) // Ensure the foreign table name is correct ('organizers' or similar)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No rows returned
        }
        console.error(`Supabase error fetching event ${id} with organizer:`, error);
        throw new Error(`Failed to fetch event with organizer: ${error.message}`);
      }

      if (!data) return null;

      // Transform the event data and include organizer if available
      return transformEvent(data); // transformEvent now handles the joined organizer data

    } catch (error) {
      console.error(`Error in getByIdWithOrganizer event ${id}:`, error);
      throw error;
    }
  },
  
  // Generate registration form link
  async generateRegistrationLink(eventId: string): Promise<string> {
    // In a production app, this might involve creating a unique token or signature
    // For now, we'll just return a formatted URL with the event ID
    const baseUrl = 'https://arena-conexao.com.br/inscricao';
    return `${baseUrl}/${eventId}`;
  },

  /**
   * Register a participant for an event
   * @param eventId ID of the event
   * @param participant Participant data
   */
  async registerParticipant(eventId: string, participant: {
    name: string;
    birthDate?: string;
    phone: string;
    email: string;
    partnerName?: string;
    paymentMethod: string;
    paymentStatus: string;
  }): Promise<any> {
    try {
      // Convert to the format expected by Supabase
      const participantData = {
        event_id: eventId,
        name: participant.name,
        birth_date: participant.birthDate,
        phone: participant.phone,
        email: participant.email,
        partner_name: participant.partnerName,
        payment_method: participant.paymentMethod,
        payment_status: participant.paymentStatus,
        registered_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('participants')
        .insert(participantData)
        .select()
        .single();

      if (error) {
        console.error('Error registering participant:', error);
        throw new Error(`Failed to register participant: ${error.message}`);
      }

      // Transform the Supabase response to match our frontend types
      return {
        id: data.id,
        eventId: data.event_id,
        name: data.name,
        birthDate: data.birth_date,
        phone: data.phone,
        email: data.email,
        partnerName: data.partner_name,
        paymentStatus: data.payment_status,
        paymentMethod: data.payment_method,
        registeredAt: data.registered_at
      };
    } catch (error) {
      console.error('Error in registerParticipant:', error);
      throw error;
    }
  },
};
