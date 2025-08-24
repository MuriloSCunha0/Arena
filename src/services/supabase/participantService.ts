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
      // Verificar se o evento existe
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('team_formation, title, price')
        .eq('id', eventId)
        .single();
        
      if (eventError) throw new Error('Evento não encontrado');
      
      // Verificar se o usuário já está inscrito
      const { data: existingParticipant, error: participantError } = await supabase
        .from('participants')
        .select('id')
        .eq('user_id', userId)
        .eq('event_id', eventId)
        .maybeSingle();
        
      if (existingParticipant) throw new Error('Você já está inscrito neste evento');
      
      // Criar participante
      const { data, error } = await supabase
        .from('participants')
        .insert({
          user_id: userId,
          event_id: eventId,
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          cpf: userData.cpf,
          birth_date: userData.birthDate,
          payment_status: 'PENDING',
          registered_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (error) throw error;
      
      return transformParticipant(data);
    } catch (error) {
      console.error('Error registering participant:', error);
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

  // Obter torneios do participante
  // Obter torneios do participante (futuros e passados)
  async getParticipantTournaments(userId: string): Promise<{
    upcomingTournaments: any[],
    pastTournaments: any[]
  }> {
    try {
      // Buscar participações do usuário
      // Buscar pela relação 'events' (conforme FK event_id -> events.id)
      const { data: participations, error } = await supabase
        .from('participants')
        .select(`
          id,
          event_id,
          partner_name,
          final_position,
          events(id, title, date, location, status)
        `)
        .eq('user_id', userId);

      if (error) throw error;
      if (!participations) return { upcomingTournaments: [], pastTournaments: [] };

      // Mapear participações para estrutura esperada
      const now = new Date();
      const upcomingTournaments: any[] = [];
      const pastTournaments: any[] = [];

      participations.forEach((p: any) => {
        // events pode vir como array ou objeto
        let event = p.events;
        if (Array.isArray(event)) event = event[0];
        if (!event) return;
        const tournament = {
          id: event.id,
          title: event.title,
          date: event.date,
          location: event.location,
          partner_name: p.partner_name,
          final_position: p.final_position,
          upcoming: new Date(event.date) >= now
        };
        if (tournament.upcoming) {
          upcomingTournaments.push(tournament);
        } else {
          pastTournaments.push(tournament);
        }
      });

      // Ordenar por data
      upcomingTournaments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      pastTournaments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return { upcomingTournaments, pastTournaments };
    } catch (error) {
      console.error('Error fetching participant tournaments:', error);
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
