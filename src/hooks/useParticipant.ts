
import { useState } from 'react';
import { ParticipantService } from '../services/supabase/participantService';
import { Participant, PartnerInvite } from '../types';
import { useNotificationStore } from '../components/ui/Notification';

export function useParticipant() {
  const [loading, setLoading] = useState(false);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [pendingInvites, setPendingInvites] = useState<PartnerInvite[]>([]);
  const addNotification = useNotificationStore((state: any) => state.addNotification);

  // Buscar convites enviados
  const fetchSentInvites = async (userId: string) => {
    try {
      setLoading(true);
      return await ParticipantService.getSentInvites(userId);
    } catch (error) {
      console.error('Error fetching sent invites:', error);
      addNotification({
        type: 'error',
        message: 'Erro ao buscar convites enviados'
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Buscar convites confirmados
  const fetchConfirmedInvites = async (userId: string) => {
    try {
      setLoading(true);
      return await ParticipantService.getConfirmedInvites(userId);
    } catch (error) {
      console.error('Error fetching confirmed invites:', error);
      addNotification({
        type: 'error',
        message: 'Erro ao buscar convites confirmados'
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Verificar se o usuário já está inscrito em um evento
  const checkEventRegistration = async (userId: string, eventId: string) => {
    try {
      setLoading(true);
      const result = await ParticipantService.getByUserIdAndEvent(userId, eventId);
      setParticipant(result);
      return result;
    } catch (error) {
      console.error('Error checking registration:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Registrar o usuário em um evento
  const registerForEvent = async (userId: string, eventId: string, userData: Partial<Participant>) => {
    try {
      setLoading(true);
      const result = await ParticipantService.registerIndividual(userId, eventId, userData);
      setParticipant(result);
      addNotification({
        type: 'success',
        message: 'Inscrição realizada com sucesso!'
      });
      return result;
    } catch (error) {
      console.error('Error registering for event:', error);
      addNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Erro ao realizar inscrição'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Convidar um parceiro
  const invitePartner = async (userId: string, eventId: string, partnerUserId: string) => {
    try {
      setLoading(true);
      const result = await ParticipantService.invitePartner(userId, eventId, partnerUserId);
      addNotification({
        type: 'success',
        message: 'Convite enviado com sucesso!'
      });
      return result;
    } catch (error) {
      console.error('Error inviting partner:', error);
      addNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Erro ao enviar convite'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Buscar convites pendentes
  const fetchPendingInvites = async (userId: string) => {
    try {
      setLoading(true);
      const invites = await ParticipantService.getPendingInvites(userId);
      setPendingInvites(invites);
      return invites;
    } catch (error) {
      console.error('Error fetching invites:', error);
      addNotification({
        type: 'error',
        message: 'Erro ao buscar convites pendentes'
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Aceitar convite
  const acceptInvite = async (inviteId: string, userId: string) => {
    try {
      setLoading(true);
      const result = await ParticipantService.acceptPartnerInvite(inviteId, userId);
      addNotification({
        type: 'success',
        message: 'Convite aceito com sucesso!'
      });
      
      // Atualizar lista de convites pendentes
      fetchPendingInvites(userId);
      
      return result;
    } catch (error) {
      console.error('Error accepting invite:', error);
      addNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Erro ao aceitar convite'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Recusar convite
  const declineInvite = async (inviteId: string, userId: string) => {
    try {
      setLoading(true);
      const result = await ParticipantService.declinePartnerInvite(inviteId, userId);
      addNotification({
        type: 'success',
        message: 'Convite recusado'
      });
      
      // Atualizar lista de convites pendentes
      fetchPendingInvites(userId);
      
      return result;
    } catch (error) {
      console.error('Error declining invite:', error);
      addNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Erro ao recusar convite'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Obter torneios do participante
  const getParticipantTournaments = async (userId: string) => {
    setLoading(true);
    try {
      const result = await ParticipantService.getParticipantTournaments(userId);
      return result;
    } catch (error) {
      console.error('Error fetching participant tournaments:', error);
      addNotification({
        type: 'error',
        message: 'Erro ao buscar torneios do participante'
      });
      // Retorna vazio para não travar a tela
      return { upcomingTournaments: [], pastTournaments: [] };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    participant,
    pendingInvites,
    checkEventRegistration,
    registerForEvent,
    invitePartner,
    fetchPendingInvites,
    fetchSentInvites,
    fetchConfirmedInvites,
    acceptInvite,
    declineInvite,
    getParticipantTournaments
  };
}
