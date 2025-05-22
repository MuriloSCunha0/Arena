import { supabase } from '../../lib/supabase';
import { Participant } from '../../types';
import { EventService } from './event';

// Funções para converter dados entre formatos
const transformParticipant = (data: any): Participant => ({
  id: data.id,
  eventId: data.event_id,
  name: data.name,
  email: data.email,
  phone: data.phone,
  partnerId: data.partner_id,
  paymentStatus: data.payment_status,
  paymentId: data.payment_id,
  paymentDate: data.payment_date,
  registeredAt: data.registered_at,
  cpf: data.cpf,
  userId: data.user_id,
const toSupabaseParticipant = (participant: Partial<Participant>) => ({
  event_id: participant.eventId,
  name: participant.name,
  email: participant.email,
  phone: participant.phone,
  partner_id: participant.partnerId,
  payment_status: participant.paymentStatus,
  payment_id: participant.paymentId,
  payment_date: participant.paymentDate,
  cpf: participant.cpf,
  user_id: participant.userId,
});
  payment_date: participant.paymentDate,
});

interface CreateParticipantDTO {
  eventId: string;
  name: string;
  email: string;
  phone: string;
  partnerId?: string;
}

export const ParticipantService = {
  // Buscar todos os participantes
  async getAll(): Promise<Participant[]> {
    try {
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .order('registered_at', { ascending: false });

      if (error) throw error;
      return data.map(transformParticipant);
    } catch (error) {
      console.error('Error fetching all participants:', error);
      throw error;
    }
  },

  // Buscar participantes por evento
  async getByEventId(eventId: string): Promise<Participant[]> {
    try {
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .eq('event_id', eventId)
        .order('registered_at', { ascending: false });

      if (error) throw error;
      return data.map(transformParticipant);
    } catch (error) {
      console.error(`Error fetching participants for event ${eventId}:`, error);
      throw error;
    }
  },

  // Buscar participante por ID
  async getById(id: string): Promise<Participant | null> {
    try {
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Participante não encontrado
        }
        throw error;
      }

      return transformParticipant(data);
    } catch (error) {
      console.error(`Error fetching participant ${id}:`, error);
      throw error;
    }
  },

  // Criar novo participante
  async create(participantData: CreateParticipantDTO): Promise<Participant> {
    try {
      // Verificar se o evento existe e qual o tipo de formação de equipe
      const event = await EventService.getById(participantData.eventId);
      if (!event) {
        throw new Error('Evento não encontrado');
      }

      // Verificar se o partner_id só é fornecido para eventos com duplas formadas
      if (participantData.partnerId && event.teamFormation !== 'FORMED') {
        throw new Error('Não é possível definir parceiro em eventos com times aleatórios');
      }

      // Verificar se existe outro participante com mesmo email neste evento
      const { data: existingParticipant } = await supabase
        .from('participants')
        .select('id')
        .eq('event_id', participantData.eventId)
        .eq('email', participantData.email)
        .single();

      if (existingParticipant) {
        throw new Error('Já existe um participante com este email neste evento');
      }

      // Inserir participante
      const { data, error } = await supabase
        .from('participants')
        .insert({
          event_id: participantData.eventId,
          name: participantData.name,
          email: participantData.email,
          phone: participantData.phone,
          partner_id: participantData.partnerId,
          payment_status: 'PENDING'
        })
        .select()
        .single();

      if (error) throw error;

      // Se houver parceiro definido, atualizar o parceiro para apontar para este participante
      if (participantData.partnerId && event.teamFormation === 'FORMED') {
        await supabase
          .from('participants')
          .update({ partner_id: data.id })
          .eq('id', participantData.partnerId);
      }

      return transformParticipant(data);
    } catch (error) {
      console.error('Error creating participant:', error);
      throw error;
    }
  },

  // Atualizar status de pagamento
  async updatePaymentStatus(id: string, status: 'PENDING' | 'CONFIRMED'): Promise<Participant> {
    try {
      const updateData: any = {
        payment_status: status
      };
      
      // Se confirmado, adicionar data de pagamento
      if (status === 'CONFIRMED') {
        updateData.payment_date = new Date().toISOString();
      }
      
      const { data, error } = await supabase
        .from('participants')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return transformParticipant(data);
    } catch (error) {
      console.error(`Error updating payment status for participant ${id}:`, error);
      throw error;
    }
  },

  // Excluir participante
  async delete(id: string): Promise<void> {
    try {
      // Primeiro buscar para ver se tem parceiro
      const { data: participant, error: fetchError } = await supabase
        .from('participants')
        .select('*')
        .eq('id', id)
        .single();
        
      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
      
      // Se não encontrou, simplesmente retornamos
      if (!participant) return;
      
      // Se tiver parceiro, limpar o parceiro do outro participante
      if (participant.partner_id) {
        await supabase
          .from('participants')
          .update({ partner_id: null })
          .eq('id', participant.partner_id);
      }
      
      // Agora remover o participante
      const { error } = await supabase
        .from('participants')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error(`Error deleting participant ${id}:`, error);
      throw error;
    }
  }
};
