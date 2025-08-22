import { supabase } from '../../lib/supabase';
import { Participant, PartnerInvite } from '../../types';

// Função para converter dados do Supabase para tipo Participant
const transformParticipant = (data: any): Participant => ({
  id: data.id,
  eventId: data.event_id,
  eventName: data.event_name,
  name: data.name,
  cpf: data.cpf,
  phone: data.phone,
  email: data.email,
  userId: data.user_id,
  partnerId: data.partner_id,
  partnerUserId: data.partner_user_id,
  partnerInviteStatus: data.partner_invite_status,
  paymentStatus: data.payment_status,
  partnerPaymentStatus: data.partner_payment_status,
  paymentId: data.payment_id,
  paymentDate: data.payment_date,
  registeredAt: data.registered_at,
  pixPaymentCode: data.pix_payment_code,
  pixQrcodeUrl: data.pix_qrcode_url,
  paymentTransactionId: data.payment_transaction_id,
  birthDate: data.birth_date,
  partnerName: data.partner_name,
  ranking: data.ranking
});

// Função para converter dados do Supabase para tipo PartnerInvite
const transformInvite = (data: any): PartnerInvite => ({
  id: data.id,
  senderId: data.sender_id,
  senderName: data.sender_name,
  receiverId: data.receiver_id,
  eventId: data.event_id,
  eventName: data.event_name,
  status: data.status,
  createdAt: data.created_at,
  expiresAt: data.expires_at
});

export const ParticipantService = {
  // Registrar um participante individual em um evento
  async registerIndividual(userId: string, eventId: string, userData: Partial<Participant>): Promise<Participant> {
    try {
      console.log('🔍 [ParticipantService] INICIANDO INSCRIÇÃO INDIVIDUAL:', { 
        userId, 
        eventId, 
        userData: { name: userData.name, email: userData.email } 
      });

      // ✅ CRÍTICO: Verificar se o evento existe e está aberto
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, title, team_formation, entry_fee, status, current_participants, max_participants')
        .eq('id', eventId)
        .single();
        
      if (eventError) {
        console.error('❌ [ParticipantService] Evento não encontrado:', eventError);
        throw new Error('Evento não encontrado');
      }

      console.log('✅ [ParticipantService] Evento encontrado:', {
        title: event.title,
        status: event.status,
        currentParticipants: event.current_participants,
        maxParticipants: event.max_participants
      });

      // ✅ CRÍTICO: Verificar se evento está aberto para inscrições
      if (!['DRAFT', 'PUBLISHED', 'OPEN'].includes(event.status)) {
        console.error('❌ [ParticipantService] Evento não está aberto:', event.status);
        throw new Error('Este evento não está mais aberto para inscrições');
      }

      // ✅ CRÍTICO: Verificar se já está inscrito (evitar duplicatas)
      const { data: existingParticipant, error: participantError } = await supabase
        .from('participants')
        .select('id')
        .eq('user_id', userId)
        .eq('event_id', eventId)
        .maybeSingle();
        
      if (existingParticipant) {
        console.warn('⚠️ [ParticipantService] Usuário já inscrito:', existingParticipant.id);
        throw new Error('Você já está inscrito neste evento');
      }

      // ✅ CRÍTICO: Verificar se evento não está lotado
      if (event.current_participants >= event.max_participants) {
        console.error('❌ [ParticipantService] Evento lotado:', {
          current: event.current_participants,
          max: event.max_participants
        });
        throw new Error('Este evento já atingiu o número máximo de participantes');
      }

      // ✅ CRÍTICO: Preparar dados COMPLETOS para inserção IMEDIATA
      const participantData = {
        user_id: userId,
        event_id: eventId,
        name: userData.name || 'Nome não informado',
        email: userData.email || null,
        phone: userData.phone || null,
        cpf: userData.cpf || null,
        birth_date: userData.birthDate || null,
        partner_name: userData.partnerName || null,
        category: userData.category || 'open',
        skill_level: userData.skillLevel || null,
        payment_status: 'PENDING',
        payment_method: userData.paymentMethod || null,
        payment_amount: event.entry_fee || 0,
        registration_notes: userData.notes || null,
        medical_notes: userData.medicalNotes || null,
        registered_at: new Date().toISOString(),
        metadata: userData.metadata || {}
      };

      console.log('🔍 [ParticipantService] Dados preparados para INSERÇÃO IMEDIATA:', participantData);
      
      // ✅ CRÍTICO: SALVAR IMEDIATAMENTE na tabela participants
      const { data, error } = await supabase
        .from('participants')
        .insert(participantData)
        .select(`
          id,
          user_id,
          event_id,
          name,
          email,
          phone,
          cpf,
          birth_date,
          partner_name,
          category,
          payment_status,
          payment_amount,
          registered_at
        `)
        .single();
        
      if (error) {
        console.error('❌ [ParticipantService] ERRO CRÍTICO ao inserir participante:', error);
        throw error;
      }

      console.log('✅ [ParticipantService] PARTICIPANTE SALVO COM SUCESSO na tabela participants:', data);

      // ✅ CRÍTICO: VERIFICAÇÃO IMEDIATA se foi salvo corretamente
      const { data: verification, error: verifyError } = await supabase
        .from('participants')
        .select('*')
        .eq('id', data.id)
        .single();

      if (verifyError || !verification) {
        console.error('❌ [ParticipantService] FALHA NA VERIFICAÇÃO pós-inserção:', verifyError);
        throw new Error('Erro crítico: participante não foi salvo corretamente');
      }

      console.log('✅ [ParticipantService] VERIFICAÇÃO CONFIRMADA - Participante está na tabela:', verification);

      // ✅ Verificar se contador foi atualizado
      const { data: updatedEvent } = await supabase
        .from('events')
        .select('current_participants')
        .eq('id', eventId)
        .single();

      if (updatedEvent) {
        console.log('📊 [ParticipantService] Contador atualizado:', {
          before: event.current_participants,
          after: updatedEvent.current_participants
        });
      }
      
      return transformParticipant(verification);
    } catch (error) {
      console.error('❌ [ParticipantService] ERRO CRÍTICO na inscrição:', error);
      throw error;
    }
  },

  // ✅ MÉTODO GARANTIDO: Salvar participante imediatamente na tabela
  async saveParticipantImmediate(participantData: {
    userId: string;
    eventId: string;
    name: string;
    email?: string;
    phone?: string;
    cpf?: string;
    birthDate?: string;
    partnerName?: string;
    category?: string;
    skillLevel?: string;
    paymentMethod?: string;
    notes?: string;
    medicalNotes?: string;
  }): Promise<any> {
    try {
      console.log('🚨 [ParticipantService] SALVAMENTO GARANTIDO INICIADO:', participantData);

      // ✅ INSERÇÃO DIRETA E IMEDIATA
      const insertData = {
        user_id: participantData.userId,
        event_id: participantData.eventId,
        name: participantData.name,
        email: participantData.email || null,
        phone: participantData.phone || null,
        cpf: participantData.cpf || null,
        birth_date: participantData.birthDate || null,
        partner_name: participantData.partnerName || null,
        category: participantData.category || 'open',
        skill_level: participantData.skillLevel || null,
        payment_status: 'PENDING',
        payment_method: participantData.paymentMethod || null,
        registration_notes: participantData.notes || null,
        medical_notes: participantData.medicalNotes || null,
        registered_at: new Date().toISOString(),
        metadata: {}
      };

      console.log('🚨 [ParticipantService] DADOS PARA INSERÇÃO GARANTIDA:', insertData);

      const { data, error } = await supabase
        .from('participants')
        .insert(insertData)
        .select('*')
        .single();

      if (error) {
        console.error('🚨 [ParticipantService] ERRO CRÍTICO na inserção garantida:', error);
        throw error;
      }

      console.log('✅ [ParticipantService] PARTICIPANTE SALVO COM GARANTIA:', data);

      // ✅ VERIFICAÇÃO TRIPLA
      const { data: triple_check } = await supabase
        .from('participants')
        .select('*')
        .eq('id', data.id)
        .single();

      if (!triple_check) {
        throw new Error('FALHA CRÍTICA: Participante não encontrado após inserção');
      }

      console.log('✅ [ParticipantService] VERIFICAÇÃO TRIPLA CONFIRMADA:', triple_check);
      return triple_check;

    } catch (error) {
      console.error('🚨 [ParticipantService] ERRO CRÍTICO no salvamento garantido:', error);
      throw error;
    }
  },

  // Partner Invite Methods
  async invitePartner(userId: string, eventId: string, partnerUserId: string): Promise<PartnerInvite> {
    try {
      // Verificar se já existe um convite pendente
      const { data: existingInvite } = await supabase
        .from('partner_invites')
        .select('*')
        .eq('sender_id', userId)
        .eq('receiver_id', partnerUserId)
        .eq('event_id', eventId)
        .eq('status', 'PENDING')
        .maybeSingle();

      if (existingInvite) {
        throw new Error('Já existe um convite pendente para este usuário neste evento');
      }

      // Buscar informações do remetente e do evento
      const [senderResult, eventResult] = await Promise.all([
        supabase.from('user_profiles').select('name').eq('user_id', userId).single(),
        supabase.from('events').select('title').eq('id', eventId).single()
      ]);

      if (senderResult.error) throw new Error('Usuário remetente não encontrado');
      if (eventResult.error) throw new Error('Evento não encontrado');

      // Criar o convite
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expira em 7 dias

      const { data: invite, error } = await supabase
        .from('partner_invites')
        .insert({
          sender_id: userId,
          sender_name: senderResult.data.name,
          receiver_id: partnerUserId,
          event_id: eventId,
          event_name: eventResult.data.title,
          status: 'PENDING',
          expires_at: expiresAt.toISOString()
        })
        .select('*')
        .single();

      if (error) throw error;

      return transformInvite(invite);
    } catch (error) {
      console.error('Error sending partner invite:', error);
      throw error;
    }
  },

  async getPendingInvites(userId: string): Promise<PartnerInvite[]> {
    try {
      const { data: invites, error } = await supabase
        .from('partner_invites')
        .select('*')
        .eq('receiver_id', userId)
        .eq('status', 'PENDING')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return invites?.map(transformInvite) || [];
    } catch (error) {
      console.error('Error fetching pending invites:', error);
      throw error;
    }
  },

  // Buscar convites enviados pelo usuário
  async getSentInvites(userId: string): Promise<PartnerInvite[]> {
    try {
      const { data: invites, error } = await supabase
        .from('partner_invites')
        .select('*')
        .eq('sender_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return invites?.map(transformInvite) || [];
    } catch (error) {
      console.error('Error fetching sent invites:', error);
      throw error;
    }
  },

  // Buscar convites confirmados (aceitos) pelo usuário
  async getConfirmedInvites(userId: string): Promise<PartnerInvite[]> {
    try {
      const { data: invites, error } = await supabase
        .from('partner_invites')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq('status', 'ACCEPTED')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return invites?.map(transformInvite) || [];
    } catch (error) {
      console.error('Error fetching confirmed invites:', error);
      throw error;
    }
  },

  async acceptPartnerInvite(inviteId: string, userId: string): Promise<{ success: boolean }> {
    try {
      // Buscar o convite
      const { data: invite, error: inviteError } = await supabase
        .from('partner_invites')
        .select('*')
        .eq('id', inviteId)
        .eq('receiver_id', userId)
        .eq('status', 'PENDING')
        .single();

      if (inviteError || !invite) {
        throw new Error('Convite não encontrado ou inválido');
      }

      // Verificar se o convite não expirou
      if (new Date(invite.expires_at) < new Date()) {
        throw new Error('Este convite expirou');
      }

      // Verificar se ambos os usuários ainda não estão inscritos no evento
      const [senderCheck, receiverCheck] = await Promise.all([
        supabase.from('participants').select('id').eq('user_id', invite.sender_id).eq('event_id', invite.event_id).maybeSingle(),
        supabase.from('participants').select('id').eq('user_id', userId).eq('event_id', invite.event_id).maybeSingle()
      ]);

      if (senderCheck.data || receiverCheck.data) {
        throw new Error('Um dos usuários já está inscrito neste evento');
      }

      // Atualizar status do convite
      const { error: updateError } = await supabase
        .from('partner_invites')
        .update({ status: 'ACCEPTED' })
        .eq('id', inviteId);

      if (updateError) throw updateError;

      return { success: true };
    } catch (error) {
      console.error('Error accepting partner invite:', error);
      throw error;
    }
  },

  async declinePartnerInvite(inviteId: string, userId: string): Promise<{ success: boolean }> {
    try {
      const { error } = await supabase
        .from('partner_invites')
        .update({ status: 'DECLINED' })
        .eq('id', inviteId)
        .eq('receiver_id', userId)
        .eq('status', 'PENDING');

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error declining partner invite:', error);
      throw error;
    }
  },

  // Obter participante por usuário e evento
  async getByUserIdAndEvent(userId: string, eventId: string): Promise<Participant | null> {
    try {
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .eq('user_id', userId)
        .eq('event_id', eventId)
        .maybeSingle();
        
      if (error) throw error;
      
      return data ? transformParticipant(data) : null;
    } catch (error) {
      console.error('Error fetching participant:', error);
      throw error;
    }
  },

  // Obter torneios do participante (futuros e passados)
  async getParticipantTournaments(userId: string): Promise<{
    upcomingTournaments: any[],
    pastTournaments: any[]
  }> {
    try {
      console.log('🔍 [ParticipantService] Buscando torneios do usuário:', userId);
      
      // Verificar se o usuário existe
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        console.error('❌ [ParticipantService] Usuário não encontrado:', userError);
        return { upcomingTournaments: [], pastTournaments: [] };
      }

      console.log('✅ [ParticipantService] Usuário encontrado:', user.full_name);

      // Buscar participações do usuário com join explícito
      const { data: participations, error } = await supabase
        .from('participants')
        .select(`
          id,
          event_id,
          partner_name,
          final_position,
          registered_at,
          payment_status,
          events!inner(
            id,
            title,
            date,
            location,
            status,
            entry_fee
          )
        `)
        .eq('user_id', userId)
        .order('registered_at', { ascending: false });

      console.log('🔍 [ParticipantService] Participações encontradas:', participations);
      console.log('🔍 [ParticipantService] Erro na query:', error);

      if (error) {
        console.error('❌ [ParticipantService] Erro ao buscar participações:', error);
        throw error;
      }

      if (!participations || participations.length === 0) {
        console.log('� [ParticipantService] Nenhuma participação encontrada para este usuário');
        return { upcomingTournaments: [], pastTournaments: [] };
      }

      // Mapear participações para estrutura esperada
      const today = new Date().toISOString().split('T')[0];
      console.log('🔍 [ParticipantService] Data atual para comparação:', today);
      
      const upcomingTournaments: any[] = [];
      const pastTournaments: any[] = [];

      participations.forEach((p: any) => {
        // Verificar se o evento está presente
        if (!p.events) {
          console.warn('⚠️ [ParticipantService] Participação sem evento associado:', {
            participationId: p.id,
            eventId: p.event_id
          });
          return;
        }
        
        const event = p.events;
        const eventDate = event.date;
        const isUpcoming = eventDate >= today;
        
        console.log('🔍 [ParticipantService] Analisando evento:', {
          eventId: event.id,
          title: event.title,
          date: eventDate,
          today,
          isUpcoming
        });
        
        const tournament = {
          id: event.id,
          title: event.title,
          date: event.date,
          location: event.location,
          partner_name: p.partner_name,
          final_position: p.final_position,
          upcoming: isUpcoming,
          payment_status: p.payment_status,
          entry_fee: event.entry_fee,
          event_status: event.status
        };
        
        if (isUpcoming) {
          upcomingTournaments.push(tournament);
          console.log('✅ [ParticipantService] Adicionado aos próximos:', tournament.title);
        } else {
          pastTournaments.push(tournament);
          console.log('✅ [ParticipantService] Adicionado aos passados:', tournament.title);
        }
      });

      // Ordenar por data
      upcomingTournaments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      pastTournaments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      console.log('🔍 [ParticipantService] Resultado final:', {
        upcomingCount: upcomingTournaments.length,
        pastCount: pastTournaments.length,
        upcomingTournaments,
        pastTournaments
      });

      return { upcomingTournaments, pastTournaments };
    } catch (error) {
      console.error('❌ [ParticipantService] Erro ao buscar torneios do participante:', error);
      // Retorne vazio para não travar a tela
      return { upcomingTournaments: [], pastTournaments: [] };
    }
  },

  // Obter todos os participantes de um evento
  async getParticipantsByEvent(eventId: string): Promise<Participant[]> {
    try {
      const { data, error } = await supabase
        .from('participants')
        .select(`
          *,
          events!inner(title)
        `)
        .eq('event_id', eventId)
        .order('registered_at', { ascending: true });
        
      if (error) throw error;
      
      return data?.map(p => ({
        ...transformParticipant(p),
        eventName: p.events?.title
      })) || [];
    } catch (error) {
      console.error('Error fetching event participants:', error);
      throw error;
    }
  },

  // Atualizar status de pagamento de um participante
  async updatePaymentStatus(participantId: string, status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'REFUNDED' | 'EXPIRED'): Promise<Participant> {
    try {
      // Primeiro, tentar com a função RPC se disponível
      try {
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('update_participant_payment_status', {
            participant_id: participantId,
            new_status: status
          });

        if (!rpcError && rpcData) {
          return transformParticipant(rpcData);
        }
      } catch (rpcErr) {
        console.warn('RPC function not available, using direct update');
      }

      // Fallback: método direto com múltiplas tentativas
      const updatePayload = { 
        payment_status: status,
        payment_date: status === 'CONFIRMED' ? new Date().toISOString() : null
      };

      // Tentativa 1: query normal
      const { data, error } = await supabase
        .from('participants')
        .update(updatePayload)
        .eq('id', participantId)
        .select('*')
        .single();

      if (error) {
        // Se erro PGRST204 (cache), tentar alternativas
        if (error.code === 'PGRST204') {
          // Tentativa 2: forçar refresh e tentar novamente
          try {
            await supabase.rpc('pg_notify', { 
              channel: 'pgrst', 
              payload: 'reload schema' 
            });
          } catch (notifyErr) {
            console.warn('Could not send cache refresh notification');
          }

          const { data: retryData, error: retryError } = await supabase
            .from('participants')
            .update(updatePayload)
            .eq('id', participantId)
            .select('*')
            .single();

          if (retryError) {
            throw new Error(`Erro de cache do banco de dados: ${retryError.message}. Tente novamente em alguns instantes.`);
          }

          // Buscar dados adicionais para transformação
          const { data: eventData } = await supabase
            .from('events')
            .select('title')
            .eq('id', retryData.event_id)
            .single();

          return transformParticipant({
            ...retryData,
            event_name: eventData?.title || ''
          });
        }
        
        throw error;
      }

      // Buscar dados adicionais para transformação
      const { data: eventData } = await supabase
        .from('events')
        .select('title')
        .eq('id', data.event_id)
        .single();

      return transformParticipant({
        ...data,
        event_name: eventData?.title || ''
      });

    } catch (error) {
      console.error('Error updating payment status:', error);
      
      // Traduzir erro para mensagem amigável
      if (error instanceof Error) {
        if (error.message.includes('PGRST204') || error.message.includes('schema cache')) {
          throw new Error('Erro de cache do banco de dados. Tente novamente em alguns instantes.');
        }
        if (error.message.includes('payment_status')) {
          throw new Error('Erro de configuração do banco. Contate o administrador.');
        }
      }
      
      throw error;
    }
  },

  // Obter estatísticas de participantes de um evento
  async getEventParticipantStats(eventId: string): Promise<{
    total: number;
    paid: number;
    pending: number;
    withPartner: number;
    solo: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('participants')
        .select('payment_status, partner_id')
        .eq('event_id', eventId);
        
      if (error) throw error;
      
      const stats = {
        total: data?.length || 0,
        paid: data?.filter(p => p.payment_status === 'PAID').length || 0,
        pending: data?.filter(p => p.payment_status === 'PENDING').length || 0,
        withPartner: data?.filter(p => p.partner_id).length || 0,
        solo: data?.filter(p => !p.partner_id).length || 0
      };
      
      return stats;
    } catch (error) {
      console.error('Error fetching event participant stats:', error);
      throw error;
    }
  }
};
