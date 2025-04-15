import { supabase } from '../lib/supabase';
import { Court, CourtReservation } from '../types';

// Função para converter dados do Supabase para nosso tipo Court
const transformCourt = (data: any): Court => ({
  id: data.id,
  name: data.name,
  location: data.location,
  surface: data.surface,
  indoor: data.indoor,
  active: data.active,
  imageUrl: data.image_url,
  description: data.description,
  type: data.type,
  status: data.status,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
});

// Função para converter nosso tipo Court para o formato do Supabase
const toSupabaseCourt = (court: Partial<Court>) => ({
  name: court.name,
  location: court.location,
  surface: court.surface,
  indoor: court.indoor,
  active: court.active,
  image_url: court.imageUrl,
  description: court.description,
  type: court.type,
  status: court.status,
});

// Função para converter dados do Supabase para nosso tipo CourtReservation
const transformReservation = (data: any): CourtReservation => ({
  id: data.id,
  courtId: data.court_id,
  eventId: data.event_id,
  matchId: data.match_id,
  title: data.title,
  start: data.start_time,
  end: data.end_time,
  status: data.status,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
});

// Função para converter nosso tipo CourtReservation para o formato do Supabase
const toSupabaseReservation = (reservation: Partial<CourtReservation>) => ({
  court_id: reservation.courtId,
  event_id: reservation.eventId,
  match_id: reservation.matchId,
  title: reservation.title,
  start_time: reservation.start,
  end_time: reservation.end,
  status: reservation.status,
});

export const CourtService = {
  // Buscar todas as quadras
  async getAll(): Promise<Court[]> {
    try {
      const { data, error } = await supabase
        .from('courts')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data.map(transformCourt);
    } catch (error) {
      console.error('Error fetching courts:', error);
      throw error;
    }
  },

  // Buscar quadra por ID
  async getById(id: string): Promise<Court | null> {
    try {
      const { data, error } = await supabase
        .from('courts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows returned
        throw error;
      }
      
      return transformCourt(data);
    } catch (error) {
      console.error(`Error fetching court ${id}:`, error);
      throw error;
    }
  },

  // Criar uma nova quadra
  async create(court: Partial<Court>): Promise<Court> {
    try {
      const { data, error } = await supabase
        .from('courts')
        .insert(toSupabaseCourt(court))
        .select()
        .single();

      if (error) throw error;
      return transformCourt(data);
    } catch (error) {
      console.error('Error creating court:', error);
      throw error;
    }
  },

  // Atualizar uma quadra existente
  async update(id: string, court: Partial<Court>): Promise<Court> {
    try {
      const { data, error } = await supabase
        .from('courts')
        .update(toSupabaseCourt(court))
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return transformCourt(data);
    } catch (error) {
      console.error(`Error updating court ${id}:`, error);
      throw error;
    }
  },

  // Excluir uma quadra
  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('courts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error(`Error deleting court ${id}:`, error);
      throw error;
    }
  },
  
  // Reservas de quadra
  
  // Buscar reservas por quadra
  async getReservationsByCourt(courtId: string, startDate?: string, endDate?: string): Promise<CourtReservation[]> {
    try {
      let query = supabase
        .from('court_reservations')
        .select('*')
        .eq('court_id', courtId);
        
      if (startDate) {
        query = query.gte('start_time', startDate);
      }
      
      if (endDate) {
        query = query.lte('end_time', endDate);
      }
      
      const { data, error } = await query.order('start_time', { ascending: true });

      if (error) throw error;
      return data.map(transformReservation);
    } catch (error) {
      console.error(`Error fetching reservations for court ${courtId}:`, error);
      throw error;
    }
  },
  
  // Criar uma reserva de quadra
  async createReservation(reservation: Partial<CourtReservation>): Promise<CourtReservation> {
    try {
      // Verificar se já existe reserva para esta quadra neste período
      const { data: existingReservations, error: checkError } = await supabase
        .from('court_reservations')
        .select('*')
        .eq('court_id', reservation.courtId)
        .lte('start_time', reservation.end)
        .gte('end_time', reservation.start);
        
      if (checkError) throw checkError;
      
      if (existingReservations && existingReservations.length > 0) {
        throw new Error('Já existe uma reserva para esta quadra neste horário');
      }
        
      const { data, error } = await supabase
        .from('court_reservations')
        .insert(toSupabaseReservation(reservation))
        .select()
        .single();

      if (error) throw error;
      return transformReservation(data);
    } catch (error) {
      console.error('Error creating court reservation:', error);
      throw error;
    }
  },
  
  // Atualizar uma reserva de quadra
  async updateReservation(id: string, reservation: Partial<CourtReservation>): Promise<CourtReservation> {
    try {
      // Verificar se já existe outra reserva para esta quadra neste período
      const { data: existingReservations, error: checkError } = await supabase
        .from('court_reservations')
        .select('*')
        .eq('court_id', reservation.courtId)
        .neq('id', id)
        .lte('start_time', reservation.end)
        .gte('end_time', reservation.start);
        
      if (checkError) throw checkError;
      
      if (existingReservations && existingReservations.length > 0) {
        throw new Error('Já existe outra reserva para esta quadra neste horário');
      }
        
      const { data, error } = await supabase
        .from('court_reservations')
        .update(toSupabaseReservation(reservation))
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return transformReservation(data);
    } catch (error) {
      console.error(`Error updating court reservation ${id}:`, error);
      throw error;
    }
  },
  
  // Excluir uma reserva de quadra
  async deleteReservation(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('court_reservations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error(`Error deleting court reservation ${id}:`, error);
      throw error;
    }
  }
};

export default CourtService;
