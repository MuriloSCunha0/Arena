import { supabase } from '../lib/supabase';

export interface ParticipanteProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  cpf?: string;
  birth_date?: string;
  photo_url?: string;
  tournaments_history?: any[];
  created_at?: string;
  updated_at?: string;
}

export interface ParticipanteProfileWithStats extends ParticipanteProfile {
  totalParticipations?: number;
  upcomingEvents?: Array<{
    id: string;
    title: string;
    date: string;
    location: string;
    price: number;
    imageUrl?: string;
  }>;
  pastEvents?: Array<{
    id: string;
    title: string;
    date: string;
    location: string;
    placement?: string | number;
    teamPartner?: string;
  }>;
}

export interface ParticipanteProfileUpdateDTO {
  full_name?: string;
  phone?: string;
  cpf?: string;
  birth_date?: string;
  photo_url?: string;
}

export const ParticipanteService = {
  // Get participante profile by ID
  async getById(userId: string): Promise<ParticipanteProfile | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Participante não encontrado
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching participante profile:', error);
      throw error;
    }
  },

  // Get comprehensive profile with statistics
  async getProfileWithStats(userId: string): Promise<ParticipanteProfileWithStats | null> {
    try {
      // Buscar perfil básico
      const profile = await this.getById(userId);
      if (!profile) return null;

      // Inicializar perfil aprimorado
      const enhancedProfile: ParticipanteProfileWithStats = {
        ...profile,
        totalParticipations: 0,
        upcomingEvents: [],
        pastEvents: []
      };

      // Buscar participações em torneios passados
      const { data: pastParticipations, error: pastError } = await supabase
        .from('participants')
        .select(`
          id,
          events:event_id (
            id,
            title,
            date,
            location
          ),
          partner_name,
          placement
        `)
        .eq('user_id', userId)
        .lt('events.date', new Date().toISOString())
        .order('events.date', { ascending: false });

      if (pastError) throw pastError;
      
      if (pastParticipations && pastParticipations.length > 0) {
        enhancedProfile.totalParticipations = pastParticipations.length;
        enhancedProfile.pastEvents = pastParticipations
          .filter(p => p && p.events) // Make sure 'p' and 'p.events' are not null
          .map((p: any) => ({
            id: p.events.id,
            title: p.events.title,
            date: p.events.date,
            location: p.events.location,
            placement: p.placement || 'Participou',
            teamPartner: p.partner_name || undefined
          }));
      }

      // Buscar próximos eventos disponíveis
      const { data: upcomingEvents, error: upcomingError } = await supabase
        .from('events')
        .select('id, title, date, location, price, banner_image_url')
        .gt('date', new Date().toISOString())
        .order('date', { ascending: true })
        .limit(5);

      if (upcomingError) throw upcomingError;

      if (upcomingEvents && upcomingEvents.length > 0) {
        enhancedProfile.upcomingEvents = upcomingEvents.map(e => ({
          id: e.id,
          title: e.title,
          date: e.date,
          location: e.location,
          price: e.price,
          imageUrl: e.banner_image_url
        }));
      }

      return enhancedProfile;
    } catch (error) {
      console.error('Error fetching participante profile with stats:', error);
      throw error;
    }
  },

  // Update participante profile
  async updateProfile(userId: string, profileData: ParticipanteProfileUpdateDTO): Promise<ParticipanteProfile> {
    try {
      const updateData = {
        ...profileData,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error updating participante profile:', error);
      throw error;
    }
  },
  
  // Upload profile photo
  async uploadProfilePhoto(userId: string, file: File): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `profile-photos/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('user-uploads')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      // Get public URL for the uploaded file
      const { data } = supabase.storage
        .from('user-uploads')
        .getPublicUrl(filePath);
      
      const publicUrl = data.publicUrl;
      
      // Atualizar perfil do participante
      await this.updateProfile(userId, { photo_url: publicUrl });
      
      return publicUrl;
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      throw error;
    }
  },
  
  // Get participant tournaments (both past and upcoming)
  async getTorneiasParticipante(userId: string): Promise<{
    upcomingTournaments: Array<{
      id: string;
      title: string;
      date: string;
      location: string;
      partner_name?: string | null;
      placement?: string | number | null;
      upcoming: boolean;
    }>;
    pastTournaments: Array<{
      id: string;
      title: string;
      date: string;
      location: string;
      partner_name?: string | null;
      placement?: string | number | null;
      upcoming: boolean;
    }>;
  }> {
    try {
      // Define our tournament type for better type safety
      type Tournament = {
        id: string;
        title: string;
        date: string;
        location: string;
        partner_name?: string | null;
        placement?: string | number | null;
        upcoming: boolean;
      };
      
      const { data, error } = await supabase
        .from('participants')
        .select(`
          id,
          events:event_id (
            id,
            title,
            date,
            location
          ),
          partner_name,
          placement
        `)
        .eq('user_id', userId)
        .order('events.date', { ascending: false });
        
      if (error) throw error;
      
      const now = new Date();
      const upcomingTournaments: Tournament[] = [];
      const pastTournaments: Tournament[] = [];
      
      // Process each record and sort into appropriate array
      if (data) {
        for (const p of data) {
          if (p && p.events) {
            // Check if events is an array or a single object
            const event = Array.isArray(p.events) ? p.events[0] : p.events;
            
            if (!event) {
              console.warn('Event data is empty for participation:', p.id);
              continue;
            }
            
            const tournament: Tournament = {
              id: event.id,
              title: event.title,
              date: event.date,
              location: event.location,
              partner_name: p.partner_name,
              placement: p.placement,
              upcoming: new Date(event.date) > now
            };
            
            // Sort into appropriate array
            if (tournament.upcoming) {
              upcomingTournaments.push(tournament);
            } else {
              pastTournaments.push(tournament);
            }
          } else {
            console.warn('Evento não encontrado para a participação:', p?.id);
          }
        }
      }
      
      return {
        upcomingTournaments,
        pastTournaments
      };
    } catch (error) {
      console.error('Error fetching participant tournaments:', error);
      throw error;
    }
  },
  
  // Get available events for registration
  async getEventosDisponiveis(): Promise<Array<{
    id: string;
    title: string;
    date: string;
    location: string;
    price: number;
    banner_image_url?: string;
    description?: string;
  }>> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gt('date', new Date().toISOString())
        .order('date', { ascending: true });
        
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching available events:', error);
      throw error;
    }
  }
};
