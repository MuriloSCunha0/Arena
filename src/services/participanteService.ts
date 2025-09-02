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
      // Em vez de buscar na tabela 'users' que pode ter RLS restritivo,
      // busque na tabela 'participants' que tem os dados necessários
      const { data, error } = await supabase
        .from('participants')
        .select(`
          *,
          events(title, date)
        `)
        .eq('user_id', userId)
        .maybeSingle(); // Use maybeSingle() para evitar erro 406

      if (error) {
        console.error('Erro ao buscar perfil do participante:', error);
        throw error;
      }

      // Se não encontrar na tabela participants, tente na tabela users
      if (!data) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (userError) {
          console.error('Erro ao buscar usuário:', userError);
          throw userError;
        }

        return userData;
      }

      return data;
    } catch (error) {
      console.error('Erro ao buscar perfil do participante:', error);
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
      };      // Buscar participações em torneios passados
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
          placement        `)
        .eq('user_id', userId)
        // Using proper foreign key reference format
        .lt('events(date)', new Date().toISOString())
        // Fix the order syntax for foreign key column
        .order('events(date)', { ascending: false });

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
        // Fix the order syntax for foreign key column
        .order('events(date)', { ascending: false });
        
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
  
  // Get available events for registration (only future events without started tournaments)
  async getEventosDisponiveis(): Promise<Array<{
    id: string;
    title: string;
    date: string;
    location: string;
    price: number;
    entry_fee?: number;
    banner_image_url?: string;
    description?: string;
  }>> {
    try {
      console.log('🔍 [getEventosDisponiveis] Buscando eventos disponíveis para inscrição...');
      
      // Buscar eventos ABERTOS para inscrição (incluindo eventos futuros e alguns atuais)
      const { data, error } = await supabase
        .from('events')
        .select(`
          id, 
          title, 
          description, 
          location, 
          date, 
          time, 
          entry_fee, 
          banner_image_url, 
          status,
          current_participants,
          max_participants,
          type,
          tournaments(id, status)
        `)
        .eq('status', 'OPEN') // Apenas eventos abertos
        .order('date', { ascending: true });
        
      if (error) throw error;
      
      if (!data || data.length === 0) {
        console.log('🔍 [getEventosDisponiveis] Nenhum evento OPEN encontrado');
        return [];
      }

      // Filtrar eventos que ainda estão disponíveis para inscrição (sem torneio STARTED)
      const availableEvents = data.filter(event => {
        const tournament = event.tournaments?.[0];
        
        // Se não há torneio, está disponível para inscrição
        if (!tournament) {
          console.log(`✅ [getEventosDisponiveis] Evento ${event.title}: Sem torneio - DISPONÍVEL`);
          return true;
        }
        
        // Se o torneio não foi iniciado (status diferente de STARTED), está disponível
        const isAvailable = tournament.status !== 'STARTED';
        
        console.log(`🔍 [getEventosDisponiveis] Evento ${event.title}:`, {
          tournamentStatus: tournament.status,
          isAvailable
        });
        
        return isAvailable;
      });
      
      console.log(`🔍 [getEventosDisponiveis] Encontrados ${availableEvents.length} eventos disponíveis de ${data.length} eventos OPEN`);
      
      return availableEvents.map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        date: event.date,
        time: event.time,
        price: event.entry_fee || 0,
        entry_fee: event.entry_fee || 0,
        banner_image_url: event.banner_image_url,
        current_participants: event.current_participants || 0,
        max_participants: event.max_participants || 0,
        type: event.type
      }));
    } catch (error) {
      console.error('Error fetching available events:', error);
      throw error;
    }
  },

  // Get tournaments that are currently in progress (based on tournament status = STARTED)
  async getTorneiosEmAndamento(): Promise<any[]> {
    try {
      console.log('🔍 [getTorneiosEmAndamento] Buscando torneios com status STARTED...');
      
      // Buscar torneios com status STARTED e juntar com dados do evento e participantes
      const { data, error } = await supabase
        .from('tournaments')
        .select(`
          id,
          event_id,
          status,
          stage,
          standings_data,
          groups_data,
          brackets_data,
          matches_data,
          teams_data,
          current_round,
          total_rounds,
          groups_count,
          elimination_bracket,
          events(
            id,
            title,
            description,
            location,
            date,
            time,
            entry_fee,
            banner_image_url,
            status,
            current_participants,
            type
          )
        `)
        .eq('status', 'STARTED')
        .order('events(date)', { ascending: true });

      if (error) {
        console.error('🔍 [getTorneiosEmAndamento] Erro na query:', error);
        throw error;
      }
      
      console.log(`🔍 [getTorneiosEmAndamento] Encontrados ${data?.length || 0} torneios com status STARTED`);
      
      if (!data || data.length === 0) {
        console.log('🔍 [getTorneiosEmAndamento] Nenhum torneio STARTED encontrado');
        return [];
      }
      
      // Mapear os dados para o formato esperado pelo componente
      const ongoingTournaments = data
        .filter(tournament => tournament.events) // Garantir que o evento existe
        .map(tournament => {
          const event = Array.isArray(tournament.events) ? tournament.events[0] : tournament.events;
          
          console.log(`🔍 [getTorneiosEmAndamento] Processando torneio ${tournament.id} do evento ${event?.title}:`, {
            tournamentStatus: tournament.status,
            hasMatches: tournament.matches_data?.length || 0,
            hasStandings: tournament.standings_data ? Object.keys(tournament.standings_data).length : 0,
            hasTeams: tournament.teams_data ? Object.keys(tournament.teams_data).length : 0
          });
          
          return {
            id: event?.id,
            title: event?.title,
            description: event?.description,
            location: event?.location,
            date: event?.date,
            time: event?.time,
            price: event?.entry_fee || 0,
            entry_fee: event?.entry_fee || 0,
            banner_image_url: event?.banner_image_url,
            status: event?.status,
            participantsCount: event?.current_participants || 0,
            type: event?.type,
            tournament: {
              id: tournament.id,
              status: tournament.status,
              stage: tournament.stage,
              current_round: tournament.current_round,
              total_rounds: tournament.total_rounds,
              groups_count: tournament.groups_count,
              standings_data: tournament.standings_data,
              groups_data: tournament.groups_data,
              brackets_data: tournament.brackets_data,
              matches_data: tournament.matches_data,
              teams_data: tournament.teams_data,
              elimination_bracket: tournament.elimination_bracket
            }
          };
        });
      
      console.log(`🔍 [getTorneiosEmAndamento] Retornando ${ongoingTournaments.length} torneios em andamento`);
      
      return ongoingTournaments;
    } catch (error) {
      console.error('Error fetching ongoing tournaments:', error);
      throw error;
    }
  },

  // Get participant names by IDs with improved structure
  async getParticipantNames(participantIds: string[]): Promise<Record<string, string>> {
    try {
      if (!participantIds || participantIds.length === 0) {
        return {};
      }

      console.log('🔍 [getParticipantNames] Buscando nomes para IDs:', participantIds);

      // Usar a nova view participant_users se disponível, senão fallback para join manual
      let query = supabase
        .from('participants')
        .select('id, name, user_id, users(full_name)')
        .in('id', participantIds);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching participant names:', error);
        return {};
      }

      console.log('🔍 [getParticipantNames] Dados retornados do Supabase:', data);

      const nameMap: Record<string, string> = {};
      const missingNames: { id: string, user_id: string }[] = [];
      
      if (data) {
        data.forEach(participant => {
          console.log('🔍 [getParticipantNames] Processando participante:', participant);
          
          // Prioridade 1: Nome do participant (direto da tabela)
          if (participant.name) {
            nameMap[participant.id] = participant.name;
            console.log(`✅ Nome encontrado direto para ${participant.id}: ${participant.name}`);
            return;
          }
          
          // Prioridade 2: Nome do user relacionado
          const userData = Array.isArray(participant.users) ? participant.users[0] : participant.users;
          if (userData && userData.full_name) {
            nameMap[participant.id] = userData.full_name;
            console.log(`✅ Nome encontrado via user para ${participant.id}: ${userData.full_name}`);
            return;
          }
          
          // Fallback: tentar busca direta se user_id existir
          if (participant.user_id) {
            console.log(`⚠️ Nome não encontrado na relação para ${participant.id}, user_id: ${participant.user_id}`);
            missingNames.push({ id: participant.id, user_id: participant.user_id });
          } else {
            console.log(`❌ Participante ${participant.id} sem user_id e sem nome`);
            nameMap[participant.id] = `Participante ${participant.id.substring(0, 8)}...`;
          }
        });
      }

      // Buscar nomes faltantes diretamente na tabela users (fallback)
      if (missingNames.length > 0) {
        console.log('🔍 [getParticipantNames] Buscando nomes faltantes diretamente na tabela users:', missingNames);
        
        const userIds = missingNames.map(item => item.user_id);
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, full_name')
          .in('id', userIds);

        if (usersError) {
          console.error('Error fetching users data:', usersError);
        } else if (usersData) {
          const userMap = new Map(usersData.map(user => [user.id, user.full_name]));
          
          missingNames.forEach(item => {
            const fullName = userMap.get(item.user_id);
            if (fullName) {
              nameMap[item.id] = fullName;
              console.log(`✅ Nome encontrado via lookup direto para ${item.id}: ${fullName}`);
            } else {
              nameMap[item.id] = `Participante ${item.id.substring(0, 8)}...`;
              console.log(`❌ Nome não encontrado para ${item.id}, usando fallback`);
            }
          });
        }
      }

      // Para IDs que não foram encontrados na tabela participants
      participantIds.forEach(id => {
        if (!nameMap[id]) {
          if (id.startsWith('WINNER_') || id.startsWith('LOSER_')) {
            nameMap[id] = id; // Manter placeholder como está
          } else {
            nameMap[id] = `Participante ${id.substring(0, 8)}...`;
          }
        }
      });

      console.log('🔍 [getParticipantNames] Mapa de nomes final:', nameMap);
      return nameMap;
    } catch (error) {
      console.error('Error in getParticipantNames:', error);
      return {};
    }
  },

  // Get detailed tournament information for spectators
  async getTournamentDetails(eventId: string): Promise<any> {
    try {
      console.log(`[getTournamentDetails] Fetching data for event: ${eventId}`);
      
      // Buscar dados do evento
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select(`
          id,
          title,
          description,
          type,
          tournament_format,
          team_formation,
          location,
          date,
          time,
          end_date,
          end_time,
          entry_fee,
          prize_pool,
          prize_distribution,
          banner_image_url,
          status,
          current_participants,
          max_participants,
          min_participants,
          categories,
          age_restrictions,
          skill_level,
          rules,
          additional_info,
          organizer_id,
          organizer_commission_rate,
          court_ids,
          created_at,
          updated_at
        `)
        .eq('id', eventId)
        .single();

      if (eventError) {
        console.error('Error fetching event:', eventError);
        throw eventError;
      }
      if (!eventData) {
        console.log('Event not found');
        return null;
      }

      console.log(`[getTournamentDetails] Event found: ${eventData.title}`);

      // Buscar tournament associado com todos os campos JSONB
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select(`
          id,
          event_id,
          format,
          settings,
          status,
          total_rounds,
          current_round,
          groups_count,
          groups_data,
          brackets_data,
          third_place_match,
          auto_advance,
          started_at,
          completed_at,
          team_formation,
          matches_data,
          teams_data,
          standings_data,
          elimination_bracket,
          stage,
          created_at,
          updated_at
        `)
        .eq('event_id', eventId)
        .single();

      if (tournamentError && tournamentError.code !== 'PGRST116') {
        console.error('Error fetching tournament:', tournamentError);
      }

      if (tournamentData) {
        console.log(`[getTournamentDetails] Tournament found: ${tournamentData.id}, status: ${tournamentData.status}, stage: ${tournamentData.stage}`);
        console.log(`[getTournamentDetails] Tournament data - groups: ${tournamentData.groups_count}, rounds: ${tournamentData.current_round}/${tournamentData.total_rounds}`);
        console.log(`[getTournamentDetails] JSONB data sizes - matches: ${Array.isArray(tournamentData.matches_data) ? tournamentData.matches_data.length : 0}, teams: ${Array.isArray(tournamentData.teams_data) ? tournamentData.teams_data.length : 0}`);
      } else {
        console.log(`[getTournamentDetails] No tournament found for event ${eventId}`);
      }

      // Buscar participantes do evento
      const { data: participantsData, error: participantsError } = await supabase
        .from('participants')
        .select(`
          id,
          event_id,
          user_id,
          name,
          email,
          phone,
          cpf,
          birth_date,
          partner_id,
          partner_name,
          team_name,
          seed_number,
          category,
          skill_level,
          payment_id,
          payment_date,
          payment_amount,
          payment_status,
          payment_method,
          final_position,
          eliminated_in_round,
          points_scored,
          points_against,
          matches_played,
          matches_won,
          matches_lost,
          sets_won,
          sets_lost,
          registration_notes,
          medical_notes,
          metadata,
          registered_at,
          updated_at
        `)
        .eq('event_id', eventId)
        .order('seed_number', { ascending: true, nullsFirst: false });

      if (participantsError) {
        console.error('Error fetching participants:', participantsError);
      }

      console.log(`[getTournamentDetails] Found ${participantsData?.length || 0} participants`);

      const result = {
        ...eventData,
        price: eventData.entry_fee || 0,
        tournament: tournamentError && tournamentError.code === 'PGRST116' ? null : tournamentData,
        participants: participantsData || []
      };

      console.log('[getTournamentDetails] Complete result assembled');
      return result;
    } catch (error) {
      console.error('Error fetching tournament details:', error);
      throw error;
    }
  },

  // Get a specific event by ID
  async getEventById(eventId: string): Promise<{ 
    data?: {
      id: string;
      title: string;
      date: string;
      location: string;
      price: number;
      banner_image_url?: string;
      description?: string;
      isTeamEvent?: boolean;
      max_participants?: number;
      registration_deadline?: string;
    } | null;
    error?: Error;
  }> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
        
      if (error) throw error;
      
      // Assume that events with 'doubles' or 'duplas' in the title are team events
      let isTeamEvent = false;
      if (data?.title) {
        const title = data.title.toLowerCase();
        isTeamEvent = title.includes('duplas') || title.includes('doubles') || title.includes('equipe');
      }

      // Get additional event configs from categories if available
      const { data: categoryData } = await supabase
        .from('event_categories')
        .select('is_team_event')
        .eq('event_id', eventId)
        .maybeSingle();
      
      if (categoryData?.is_team_event !== undefined) {
        isTeamEvent = categoryData.is_team_event;
      }
        
      return { 
        data: data ? {...data, isTeamEvent } : null
      };
    } catch (error) {
      console.error('Error fetching event details:', error);
      return { error: error as Error };
    }
  },

  // Get event with tournament and participants by ID - robust version inspired by admin getByIdWithOrganizer
  async getEventWithTournamentById(eventId: string): Promise<{
    event?: any | null;
    tournament?: any | null;
    participants?: any[] | null;
    error?: Error;
  }> {
    try {
      console.log(`[ParticipanteService] Fetching event ${eventId} with tournament and participants`);
      
      // Tentativa 1: Query completa com joins
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select(`
          *,
          tournaments(*),
          participants(
            *,
            users(*)
          )
        `)
        .eq('id', eventId)
        .single();

      if (eventError) {
        if (eventError.code === 'PGRST116') {
          console.log(`[ParticipanteService] Event ${eventId} not found`);
          return { error: new Error('Evento não encontrado') };
        }
        
        // Se erro de relação, tentar fallback queries separadas
        if (eventError.code === 'PGRST204' || eventError.message?.includes('does not exist')) {
          console.warn('[ParticipanteService] Relation issue, trying fallback queries');
          return this.getEventWithTournamentFallback(eventId);
        }
        
        console.error('[ParticipanteService] Error fetching event with tournament:', eventError);
        throw new Error(`Falha ao carregar evento: ${eventError.message}`);
      }

      if (!eventData) {
        return { error: new Error('Evento não encontrado') };
      }

      // Transform participants data
      const transformedParticipants = eventData.participants?.map((p: any) => ({
        id: p.id,
        name: p.users?.user_metadata?.name || p.users?.email || 'Participante',
        email: p.users?.email || '',
        team: p.team,
        category: p.category,
        registrationDate: p.created_at,
        status: p.status || 'active',
        eventId: p.event_id,
        userId: p.user_id
      })) || [];

      // Extract tournament data (should be single object or null)
      const tournamentData = Array.isArray(eventData.tournaments) 
        ? eventData.tournaments[0] 
        : eventData.tournaments;

      console.log(`[ParticipanteService] Successfully loaded event ${eventId} with ${transformedParticipants.length} participants`);
      
      return {
        event: {
          id: eventData.id,
          title: eventData.title,
          date: eventData.date,
          location: eventData.location,
          price: eventData.price || 0,
          banner_image_url: eventData.banner_image_url,
          description: eventData.description,
          max_participants: eventData.max_participants,
          registration_deadline: eventData.registration_deadline,
          isTeamEvent: this.checkIfTeamEvent(eventData.title)
        },
        tournament: tournamentData,
        participants: transformedParticipants
      };
    } catch (networkError) {
      // Se é erro de rede, tentar novamente uma vez
      if (networkError instanceof TypeError && networkError.message.includes('Failed to fetch')) {
        console.warn('[ParticipanteService] Network error, retrying once...');
        
        try {
          return this.getEventWithTournamentFallback(eventId);
        } catch (retryFailed) {
          console.error('[ParticipanteService] Retry also failed:', retryFailed);
          return { error: new Error('Erro de conexão. Verifique sua internet e tente novamente.') };
        }
      }
      
      console.error('[ParticipanteService] Unexpected error:', networkError);
      return { error: new Error('Erro inesperado ao carregar dados do evento') };
    }
  },

  // Fallback method for separate queries when joins fail
  getEventWithTournamentFallback: async function(eventId: string): Promise<{
    event?: any | null;
    tournament?: any | null;
    participants?: any[] | null;
    error?: Error;
  }> {
    try {
      console.log(`[ParticipanteService] Using fallback queries for event ${eventId}`);
      
      // Query 1: Get event data
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) {
        if (eventError.code === 'PGRST116') {
          return { error: new Error('Evento não encontrado') };
        }
        throw new Error(`Falha ao carregar evento: ${eventError.message}`);
      }

      // Query 2: Get tournament data
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('event_id', eventId)
        .single();

      if (tournamentError && tournamentError.code !== 'PGRST116') {
        console.warn('[ParticipanteService] Tournament not found for event:', eventId);
      }

      // Query 3: Get participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('participants')
        .select(`
          *,
          users(*)
        `)
        .eq('event_id', eventId);

      if (participantsError) {
        console.error('[ParticipanteService] Error fetching participants:', participantsError);
        return { 
          event: this.transformEventData(eventData),
          tournament: tournamentData,
          participants: [],
          error: new Error('Falha ao carregar participantes')
        };
      }

      // Transform participants data
      const transformedParticipants = participantsData?.map((p: any) => ({
        id: p.id,
        name: p.users?.user_metadata?.name || p.users?.email || 'Participante',
        email: p.users?.email || '',
        team: p.team,
        category: p.category,
        registrationDate: p.created_at,
        status: p.status || 'active',
        eventId: p.event_id,
        userId: p.user_id
      })) || [];

      return {
        event: this.transformEventData(eventData),
        tournament: tournamentData,
        participants: transformedParticipants
      };
    } catch (error) {
      console.error('[ParticipanteService] Fallback query failed:', error);
      return { error: error as Error };
    }
  },

  // Helper method to transform event data
  transformEventData: function(eventData: any) {
    return {
      id: eventData.id,
      title: eventData.title,
      date: eventData.date,
      location: eventData.location,
      price: eventData.price || 0,
      banner_image_url: eventData.banner_image_url,
      description: eventData.description,
      max_participants: eventData.max_participants,
      registration_deadline: eventData.registration_deadline,
      isTeamEvent: this.checkIfTeamEvent(eventData.title)
    };
  },

  // Helper method to check if event is team-based
  checkIfTeamEvent: function(title: string): boolean {
    if (!title) return false;
    const lowerTitle = title.toLowerCase();
    return lowerTitle.includes('duplas') || lowerTitle.includes('doubles') || lowerTitle.includes('equipe');
  }
}
