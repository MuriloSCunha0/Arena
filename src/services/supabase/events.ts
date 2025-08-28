import { supabase, tratarErroSupabase } from '../../lib/supabase';
import { Event, EventType, TeamFormationType, TournamentFormat } from '../../types';

// Função para converter dados do Supabase para nosso tipo Event
const transformEvent = (data: any): Event => ({
  id: data.id,
  type: data.type as EventType,
  title: data.title,
  description: data.description,
  location: data.location,
  date: data.date,
  time: data.time,
  endDate: data.end_date,
  endTime: data.end_time,
  price: data.entry_fee || 0, // ✅ Usar apenas entry_fee conforme DDL
  entry_fee: data.entry_fee, // Manter entry_fee para compatibilidade
  maxParticipants: data.max_participants,
  minParticipants: data.min_participants,
  currentParticipants: data.current_participants,
  prize: data.prize || '',
  prizePool: data.prize_pool,
  prizeDistribution: data.prize_distribution,
  rules: data.rules,
  bannerImageUrl: data.banner_image_url,
  images: data.images,
  teamFormation: data.team_formation as TeamFormationType,
  categories: data.categories || [],
  ageRestrictions: data.age_restrictions,
  skillLevel: data.skill_level,
  additionalInfo: data.additional_info,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
  organizerId: data.organizer_id,
  organizerCommissionRate: data.organizer_commission_rate,
  courtIds: data.court_ids || [],
  status: data.status, // ✅ Adicionar status que estava faltando
  organizer: data.organizers ? {
      id: data.organizers.id,
      name: data.organizers.name,
      description: data.organizers.description,
      phone: data.organizers.phone,
      email: data.organizers.email,
      website: data.organizers.website,
      pixKey: data.organizers.pix_key,
      bankDetails: data.organizers.bank_details,
      defaultCommissionRate: data.organizers.default_commission_rate,
      settings: data.organizers.settings,
      active: data.organizers.active,
      verified: data.organizers.verified,
      address: data.organizers.address,
      logoUrl: data.organizers.logo_url,
      createdAt: data.organizers.created_at,
      updatedAt: data.organizers.updated_at,
  } : undefined,
});

// Função robusta para converter Event para formato Supabase com fallbacks
const toSupabaseEvent = (event: Partial<Event>) => {
  // Preparar payload base com campos sempre presentes
  // Garante integridade: se for SUPER8, força os campos corretos
  let teamFormation = event.teamFormation;
  let tournamentFormat = event.format;
  if (event.type === 'SUPER8') {
    tournamentFormat = TournamentFormat.SUPER8;
    teamFormation = TeamFormationType.SUPER8;
  }
  const basePayload = {
    type: event.type,
    title: event.title,
    description: event.description,
    location: event.location,
    date: event.date,
    time: event.time,
    end_date: event.endDate,
    end_time: event.endTime,
    max_participants: event.maxParticipants,
    min_participants: event.minParticipants,
    rules: event.rules,
    banner_image_url: event.bannerImageUrl,
    images: event.images,
    team_formation: teamFormation,
    tournament_format: tournamentFormat,
    categories: event.categories || [],
    age_restrictions: event.ageRestrictions,
    skill_level: event.skillLevel,
    additional_info: event.additionalInfo,
    organizer_id: event.organizerId,
    organizer_commission_rate: event.organizerCommissionRate,
    court_ids: event.courtIds || []
    // ⚠️ Remover status temporariamente até migration ser aplicada
    // status: event.status || 'DRAFT'
  };

  // ✅ Usar apenas campos que existem no DDL
  const extendedPayload = {
    ...basePayload,
    entry_fee: event.price || event.entry_fee || 0, // ✅ Mapear price → entry_fee
    prize_pool: event.prizePool || 0,
    prize_distribution: event.prizeDistribution || {}
    // ⚠️ Remover status temporariamente até migration ser aplicada
    // status: event.status || 'DRAFT'
  };

  return extendedPayload;
};

export const EventsService = {
  // Buscar todos os eventos
  async getAll(): Promise<Event[]> {
    try {
      console.log('🔍 [EventsService] Executando query para buscar eventos...');
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [EventsService] Erro do Supabase:', error);
        throw new Error(`Falha ao buscar eventos: ${error.message}`);
      }
      
      console.log(`✅ [EventsService] Query executada com sucesso:`, {
        totalRegistros: data?.length || 0,
        primeiros3: data?.slice(0, 3).map(d => ({
          id: d.id,
          title: d.title,
          status: d.status,
          date: d.date
        }))
      });
      
      const transformedEvents = (data || []).map(transformEvent);
      
      console.log(`🔄 [EventsService] Eventos transformados:`, {
        total: transformedEvents.length,
        sample: transformedEvents.slice(0, 2)
      });
      
      return transformedEvents;
    } catch (error) {
      console.error('❌ [EventsService] Erro na busca de eventos:', error);
      throw tratarErroSupabase(error, 'buscar todos os eventos');
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
      return transformEvent(data);    } catch (error) {
      throw tratarErroSupabase(error, `buscar evento ${id}`);
    }
  },

  // Criar um novo evento
  async create(event: Partial<Event>): Promise<Event> {
    try {
      // Primeiro, tentar com função RPC se disponível
      try {
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('create_event_robust', {
            event_data: toSupabaseEvent(event)
          });

        if (!rpcError && rpcData) {
          const createdEvent = transformEvent(rpcData);
          // Criar torneio automaticamente
          await this.createTournamentForEvent(createdEvent.id);
          return createdEvent;
        }
      } catch (rpcErr) {
        console.warn('RPC function create_event_robust not available, using direct insert');
      }

      // Método direto com tratamento robusto de cache
      const supabaseData = toSupabaseEvent(event);
      console.log("Creating event with data:", supabaseData);

      // Tentativa 1: insert normal
      const { data, error } = await supabase
        .from('events')
        .insert(supabaseData)
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating event:', error);
        
        // Se erro PGRST204 (cache), tentar alternativas
        if (error.code === 'PGRST204') {
          // Forçar refresh do cache e tentar novamente
          try {
            await supabase.rpc('pg_notify', { 
              channel: 'pgrst', 
              payload: 'reload schema' 
            });
          } catch (notifyErr) {
            console.warn('Could not send cache refresh notification');
          }

          // Tentativa 2: após refresh do cache
          const { data: retryData, error: retryError } = await supabase
            .from('events')
            .insert(supabaseData)
            .select()
            .single();

          if (retryError) {
            // ✅ Se ainda falhar, criar payload compatível com DDL
            const compatibleData = {
              ...supabaseData,
              // Remover campos opcionais que podem estar causando cache miss
              prize_distribution: undefined,
              // Garantir que entry_fee seja enviado corretamente
              entry_fee: event.price || event.entry_fee || 0
            };

            const { data: finalData, error: finalError } = await supabase
              .from('events')
              .insert(compatibleData)
              .select()
              .single();

            if (finalError) {
              throw new Error(`Erro de cache do banco de dados: ${finalError.message}. Tente novamente em alguns instantes.`);
            }

            const createdEvent = transformEvent(finalData);
            // Criar torneio automaticamente
            await this.createTournamentForEvent(createdEvent.id);
            return createdEvent;
          }

          const retryEvent = transformEvent(retryData);
          // Criar torneio automaticamente
          await this.createTournamentForEvent(retryEvent.id);
          return retryEvent;
        }
        
        throw new Error(`Failed to create event: ${error.message}`);
      }

      const createdEvent = transformEvent(data);
      // Criar torneio automaticamente
      await this.createTournamentForEvent(createdEvent.id);
      return createdEvent;
    } catch (error) {
      console.error('Error in create event:', error);
      throw tratarErroSupabase(error, 'criar evento');
    }
  },

  // Função para criar automaticamente o torneio quando um evento é criado
  async createTournamentForEvent(eventId: string): Promise<void> {
    try {
      console.log(`🏆 [createTournamentForEvent] Starting creation for event ${eventId}...`);
      
      // Verificar se já existe um torneio para este evento
      console.log(`🔍 [createTournamentForEvent] Checking for existing tournament...`);
      const { data: existingTournament, error: checkError } = await supabase
        .from('tournaments')
        .select('id, event_id, status')
        .eq('event_id', eventId)
        .maybeSingle();

      if (checkError) {
        console.error('❌ [createTournamentForEvent] Error checking existing tournament:', checkError);
        console.error('❌ [createTournamentForEvent] Check error details:', {
          code: checkError.code,
          message: checkError.message,
          details: checkError.details
        });
      }

      if (existingTournament) {
        console.log(`✅ [createTournamentForEvent] Tournament already exists for event ${eventId}: ${existingTournament.id}, status: ${existingTournament.status}`);
        return;
      } else {
        console.log(`📝 [createTournamentForEvent] No existing tournament found, creating new one...`);
      }

      // Verificar se o evento existe antes de criar o torneio
      console.log(`🔍 [createTournamentForEvent] Verifying event ${eventId} exists...`);
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, title, status')
        .eq('id', eventId)
        .single();
      
      if (eventError) {
        console.error('❌ [createTournamentForEvent] Event verification failed:', eventError);
        throw eventError;
      }
      
      if (!eventData) {
        console.error('❌ [createTournamentForEvent] Event not found');
        throw new Error(`Event ${eventId} not found`);
      }
      
      console.log(`✅ [createTournamentForEvent] Event found: ${eventData.title}, status: ${eventData.status}`);

      // Criar torneio com estrutura básica
      const tournamentData = {
        event_id: eventId,
        status: 'CREATED',
        format: 'GROUP_STAGE_ELIMINATION', // Usar string ao invés de enum
        settings: { 
          groupSize: 3,
          qualifiersPerGroup: 2,
          maxTeamsPerGroup: 4,
          autoCalculateGroups: false
        },
        current_round: 0,
        groups_count: 0,
        matches_data: [],
        teams_data: [],
        standings_data: [],
        elimination_bracket: [],
        stage: 'GROUP',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('📝 [createTournamentForEvent] Inserting tournament with data:', tournamentData);

      const { data: newTournament, error: insertError } = await supabase
        .from('tournaments')
        .insert(tournamentData)
        .select()
        .single();

      if (insertError) {
        console.error('❌ [createTournamentForEvent] Insert error:', insertError);
        console.error('❌ [createTournamentForEvent] Insert error details:', {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint
        });
        throw insertError;
      }

      console.log(`✅ [createTournamentForEvent] Tournament created successfully:`, {
        id: newTournament.id,
        event_id: newTournament.event_id,
        status: newTournament.status,
        format: newTournament.format
      });
    } catch (error) {
      console.error('❌ [createTournamentForEvent] Final error in createTournamentForEvent:', error);
      if (error instanceof Error) {
        console.error('❌ [createTournamentForEvent] Error message:', error.message);
        console.error('❌ [createTournamentForEvent] Error stack:', error.stack);
      }
      // Não falhar a criação do evento por causa do torneio
      console.warn('⚠️ [createTournamentForEvent] Tournament creation failed, but event was created successfully');
    }
  },

  // Atualizar um evento existente
  async update(id: string, event: Partial<Event>): Promise<Event> {
    try {
      // Primeiro, tentar com função RPC se disponível
      try {
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('update_event_robust', {
            event_id: id,
            event_data: toSupabaseEvent(event)
          });

        if (!rpcError && rpcData) {
          return transformEvent(rpcData);
        }
      } catch (rpcErr) {
        console.warn('RPC function update_event_robust not available, using direct update');
      }

      // Método direto com tratamento robusto
      const supabaseData = toSupabaseEvent(event);
      console.log(`Updating event ${id} with data:`, supabaseData);
      
      // Tentativa 1: update normal
      const { data, error } = await supabase
        .from('events')
        .update(supabaseData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`Supabase error updating event ${id}:`, error);
        
        // Se erro PGRST204 (cache), tentar alternativas
        if (error.code === 'PGRST204') {
          // Forçar refresh do cache
          try {
            await supabase.rpc('pg_notify', { 
              channel: 'pgrst', 
              payload: 'reload schema' 
            });
          } catch (notifyErr) {
            console.warn('Could not send cache refresh notification');
          }

          // Tentativa 2: após refresh do cache
          const { data: retryData, error: retryError } = await supabase
            .from('events')
            .update(supabaseData)
            .eq('id', id)
            .select()
            .single();

          if (retryError) {
            // ✅ Tentativa 3: payload compatível com DDL
            const compatibleData = {
              ...supabaseData,
              // Remover campos opcionais que podem estar causando cache miss
              prize_distribution: undefined,
              // Garantir que entry_fee seja enviado corretamente
              entry_fee: event.price || event.entry_fee || 0
            };

            const { data: finalData, error: finalError } = await supabase
              .from('events')
              .update(compatibleData)
              .eq('id', id)
              .select()
              .single();

            if (finalError) {
              throw new Error(`Erro de cache do banco de dados: ${finalError.message}. Tente novamente em alguns instantes.`);
            }

            return transformEvent(finalData);
          }

          return transformEvent(retryData);
        }
        
        // Verificar outros tipos de erro específicos
        if (error.message?.includes("'entry_fee' column") || error.message?.includes("'price' column")) {
          throw new Error(`Erro de schema: Verificar se a coluna 'entry_fee' existe na tabela events conforme DDL.`);
        }
        
        throw new Error(`Failed to update event: ${error.message}`);
      }

      return transformEvent(data);
    } catch (error) {
      console.error('Error in update event:', error);
      throw tratarErroSupabase(error, `atualizar evento ${id}`);
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
      }    } catch (error) {
      throw tratarErroSupabase(error, `excluir evento ${id}`);
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
      
      return count || 0;    } catch (error) {
      throw tratarErroSupabase(error, `buscar contagem de participantes para o evento ${eventId}`);
    }
  },

  // Get event with organizer with robust error handling
  async getByIdWithOrganizer(id: string): Promise<Event | null> {
    try {
      // Tentativa 1: Query completa com organizador
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          organizers:organizer_id(*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No rows returned
        }
        
        // Se erro de relação ou coluna não encontrada, tentar fallback
        if (error.code === 'PGRST204' || error.message?.includes('does not exist') || error.message?.includes('organizers')) {
          console.warn('Relation issue with organizers, trying fallback query');
          
          // Tentativa 2: Query sem organizador
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('events')
            .select('*')
            .eq('id', id)
            .single();

          if (fallbackError) {
            if (fallbackError.code === 'PGRST116') {
              return null;
            }
            console.error(`Fallback query also failed:`, fallbackError);
            throw new Error(`Failed to fetch event: ${fallbackError.message}`);
          }

          return fallbackData ? transformEvent(fallbackData) : null;
        }
        
        console.error(`Supabase error fetching event ${id} with organizer:`, error);
        throw new Error(`Failed to fetch event with organizer: ${error.message}`);
      }

      if (!data) return null;

      // Transform the event data and include organizer if available
      return transformEvent(data);
    } catch (networkError) {
      // Se é erro de rede (Failed to fetch), tentar novamente uma vez
      if (networkError instanceof TypeError && networkError.message.includes('Failed to fetch')) {
        console.warn('Network error, retrying once...');
        
        try {
          // Retry com query mais simples
          const { data: retryData, error: retryError } = await supabase
            .from('events')
            .select('*')
            .eq('id', id)
            .single();

          if (retryError) {
            if (retryError.code === 'PGRST116') {
              return null;
            }
            throw new Error(`Retry failed: ${retryError.message}`);
          }

          return retryData ? transformEvent(retryData) : null;
        } catch (retryFailed) {
          console.error('Retry also failed:', retryFailed);
          throw new Error(`Network error: Unable to fetch event data. Please check your connection.`);
        }
      }
      
      throw tratarErroSupabase(networkError, `buscar evento ${id} com dados do organizador`);
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
      };    } catch (error) {
      throw tratarErroSupabase(error, `registrar participante para o evento ${eventId}`);
    }
  },
};
