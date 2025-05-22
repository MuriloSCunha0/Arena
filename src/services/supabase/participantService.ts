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

  // Convidar um parceiro para o evento
  async invitePartner(userId: string, eventId: string, partnerUserId: string): Promise<PartnerInvite> {
    try {
      // Verificar se o evento permite duplas formadas
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('team_formation, title')
        .eq('id', eventId)
        .single();
        
      if (eventError) throw new Error('Evento não encontrado');
      
      if (event.team_formation !== 'FORMED') {
        throw new Error('Este evento não permite escolha de parceiro');
      }
      
      // Buscar participante que está convidando
      const { data: participant, error: participantError } = await supabase
        .from('participants')
        .select('id, name')
        .eq('user_id', userId)
        .eq('event_id', eventId)
        .single();
        
      if (participantError) throw new Error('Você precisa se inscrever primeiro');
      
      // Verificar se o parceiro já está inscrito com alguém
      const { data: existingPartner } = await supabase
        .from('participants')
        .select('id, partner_id')
        .eq('user_id', partnerUserId)
        .eq('event_id', eventId)
        .eq('partner_invite_status', 'ACCEPTED')
        .maybeSingle();
        
      if (existingPartner && existingPartner.partner_id) {
        throw new Error('Este jogador já possui um parceiro para este evento');
      }
      
      // Verificar usuário parceiro
      const { data: partnerUser, error: partnerUserError } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('id', partnerUserId)
        .single();
        
      if (partnerUserError) throw new Error('Usuário parceiro não encontrado');
      
      // Criar convite
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 7); // Convite expira em 7 dias
      
      const { data: invite, error: inviteError } = await supabase
        .from('partner_invites')
        .insert({
          sender_id: userId,
          sender_name: participant.name,
          receiver_id: partnerUserId,
          event_id: eventId,
          event_name: event.title,
          status: 'PENDING',
          created_at: new Date().toISOString(),
          expires_at: expirationDate.toISOString()
        })
        .select()
        .single();
        
      if (inviteError) throw inviteError;
      
      // Atualizar participante com o status do convite
      await supabase
        .from('participants')
        .update({
          partner_user_id: partnerUserId,
          partner_name: partnerUser.full_name,
          partner_invite_status: 'PENDING'
        })
        .eq('id', participant.id);
      
      return transformInvite(invite);
    } catch (error) {
      console.error('Error inviting partner:', error);
      throw error;
    }
  },

  // Aceitar convite de parceiro
  async acceptPartnerInvite(inviteId: string, userId: string): Promise<{ participant: Participant, invite: PartnerInvite }> {
    try {
      // Buscar o convite
      const { data: invite, error: inviteError } = await supabase
        .from('partner_invites')
        .select('*')
        .eq('id', inviteId)
        .eq('receiver_id', userId)
        .eq('status', 'PENDING')
        .single();
        
      if (inviteError) throw new Error('Convite não encontrado ou já foi respondido');
      
      // Buscar o participante que enviou o convite
      const { data: senderParticipant, error: senderError } = await supabase
        .from('participants')
        .select('*')
        .eq('user_id', invite.sender_id)
        .eq('event_id', invite.event_id)
        .single();
        
      if (senderError) throw new Error('Participante que enviou o convite não encontrado');
      
      // Verificar se o usuário já está inscrito no evento
      const { data: existingParticipation } = await supabase
        .from('participants')
        .select('*')
        .eq('user_id', userId)
        .eq('event_id', invite.event_id)
        .maybeSingle();
      
      let participantId;
      let resultParticipant;
      
      // Se já está inscrito, atualizar. Senão, criar nova inscrição
      if (existingParticipation) {
        participantId = existingParticipation.id;
        
        const { data: updatedParticipant } = await supabase
          .from('participants')
          .update({
            partner_id: senderParticipant.id,
            partner_user_id: invite.sender_id,
            partner_name: invite.sender_name,
            partner_invite_status: 'ACCEPTED'
          })
          .eq('id', existingParticipation.id)
          .select()
          .single();
          
        resultParticipant = updatedParticipant;
      } else {
        // Buscar dados do usuário
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('full_name, email, phone, cpf, birth_date')
          .eq('id', userId)
          .single();
        
        if (userError || !userData) throw new Error('Usuário não encontrado');
        
        // Criar nova inscrição
        const { data: newParticipant } = await supabase
          .from('participants')
          .insert({
            user_id: userId,
            event_id: invite.event_id,
            name: userData.full_name || '',
            email: userData.email || '',
            phone: userData.phone || '',
            cpf: userData.cpf || '',
            birth_date: userData.birth_date || null,
            partner_id: senderParticipant.id,
            partner_user_id: invite.sender_id,
            partner_name: invite.sender_name,
            partner_invite_status: 'ACCEPTED',
            payment_status: 'PENDING',
            registered_at: new Date().toISOString()
          })
          .select()
          .single();
          
        participantId = newParticipant.id;
        resultParticipant = newParticipant;
      }
      
      // Atualizar o participante que enviou o convite
      await supabase
        .from('participants')
        .update({
          partner_id: participantId,
          partner_invite_status: 'ACCEPTED'
        })
        .eq('id', senderParticipant.id);
      
      // Atualizar o status do convite
      const { data: updatedInvite } = await supabase
        .from('partner_invites')
        .update({ status: 'ACCEPTED' })
        .eq('id', inviteId)
        .select()
        .single();
      
      return {
        participant: transformParticipant(resultParticipant),
        invite: transformInvite(updatedInvite)
      };
    } catch (error) {
      console.error('Error accepting partner invite:', error);
      throw error;
    }
  },

  // Recusar convite de parceiro
  async declinePartnerInvite(inviteId: string, userId: string): Promise<PartnerInvite> {
    try {
      // Buscar o convite
      const { data: invite, error: inviteError } = await supabase
        .from('partner_invites')
        .select('*')
        .eq('id', inviteId)
        .eq('receiver_id', userId)
        .eq('status', 'PENDING')
        .single();
        
      if (inviteError) throw new Error('Convite não encontrado ou já foi respondido');
      
      // Atualizar participante que enviou o convite
      await supabase
        .from('participants')
        .update({
          partner_id: null,
          partner_user_id: null,
          partner_name: null,
          partner_invite_status: 'DECLINED'
        })
        .eq('user_id', invite.sender_id)
        .eq('event_id', invite.event_id);
      
      // Atualizar status do convite
      const { data: updatedInvite } = await supabase
        .from('partner_invites')
        .update({ status: 'DECLINED' })
        .eq('id', inviteId)
        .select()
        .single();
      
      return transformInvite(updatedInvite);
    } catch (error) {
      console.error('Error declining partner invite:', error);
      throw error;
    }
  },

  // Obter convites pendentes para um usuário
  async getPendingInvites(userId: string): Promise<PartnerInvite[]> {
    try {
      const { data, error } = await supabase
        .from('partner_invites')
        .select('*')
        .eq('receiver_id', userId)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      return data ? data.map(transformInvite) : [];
    } catch (error) {
      console.error('Error fetching pending invites:', error);
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
  async getTorneiasParticipante(userId: string): Promise<{
    upcomingTournaments: any[],
    pastTournaments: any[]
  }> {
    try {
      // Buscar participações
      const { data: participations, error } = await supabase
        .from('participants')
        .select(`
          id,
          event_id,
          partner_name,
          events(id, title, date, location, status)
        `)
        .eq('user_id', userId);
        
      if (error) throw error;
      
      const now = new Date();
      const upcomingTournaments = [];
      const pastTournaments = [];
      
      if (participations) {
        for (const participation of participations) {
          if (!participation.events || participation.events.length === 0) continue;
          
          // Fix: events is returned as an array, so we need to get the first element
          const event = Array.isArray(participation.events) 
            ? participation.events[0] 
            : participation.events;
          
          const eventDate = new Date(event.date);
          const isUpcoming = eventDate >= now || event.status === 'ONGOING';
          
          // Buscar resultados para torneios passados
          let placement = null;
          if (!isUpcoming) {
            const { data: result } = await supabase
              .from('participant_results')
              .select('position')
              .eq('participant_id', participation.id)
              .maybeSingle();
              
            placement = result?.position;
          }
          
          const tournament = {
            id: event.id,
            title: event.title,
            date: event.date,
            location: event.location,
            partner_name: participation.partner_name,
            placement: placement,
            upcoming: isUpcoming
          };
          
          if (isUpcoming) {
            upcomingTournaments.push(tournament);
          } else {
            pastTournaments.push(tournament);
          }
        }
      }
      
      return { upcomingTournaments, pastTournaments };
    } catch (error) {
      console.error('Error fetching participant tournaments:', error);
      throw error;
    }
  }
};
