import { supabase } from '../../lib/supabase';
import { Participant } from '../../types';

// Função para converter dados do Supabase para nosso tipo Participant
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
});

// Função para converter nosso tipo Participant para o formato do Supabase
const toSupabaseParticipant = (participant: Partial<Participant>) => ({
  event_id: participant.eventId,
  name: participant.name,
  email: participant.email,
  phone: participant.phone,
  partner_id: participant.partnerId,
  payment_status: participant.paymentStatus,
  payment_id: participant.paymentId,
  payment_date: participant.paymentDate,
});

export const ParticipantsService = {
  // Buscar todos os participantes
  async getAll(): Promise<Participant[]> {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .order('registered_at', { ascending: false });

    if (error) throw error;
    return data.map(transformParticipant);
  },

  // Buscar participantes por evento
  async getByEventId(eventId: string): Promise<Participant[]> {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('event_id', eventId)
      .order('registered_at', { ascending: false });

    if (error) throw error;
    return data.map(transformParticipant);
  },

  // Buscar um participante por ID
  async getById(id: string): Promise<Participant | null> {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return null;
    return transformParticipant(data);
  },

  // Criar um novo participante
  async create(participant: Partial<Participant>): Promise<Participant> {
    // Verificar se há um pagamento confirmado e um ID de pagamento
    const hasPayment = participant.paymentStatus === 'CONFIRMED' && participant.paymentId;
    
    const supabaseData = {
      ...toSupabaseParticipant(participant),
      registered_at: new Date().toISOString(),
    };
    
    // Se temos um pagamento confirmado, adicionar a data do pagamento
    if (hasPayment) {
      supabaseData.payment_date = new Date().toISOString();
    }
    
    const { data, error } = await supabase
      .from('participants')
      .insert(supabaseData)
      .select()
      .single();

    if (error) throw error;
    return transformParticipant(data);
  },

  // Atualizar um participante existente
  async update(id: string, participant: Partial<Participant>): Promise<Participant> {
    const { data, error } = await supabase
      .from('participants')
      .update(toSupabaseParticipant(participant))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return transformParticipant(data);
  },

  // Atualizar status de pagamento
  async updatePaymentStatus(
    id: string, 
    paymentStatus: 'PENDING' | 'CONFIRMED', 
    paymentId?: string
  ): Promise<Participant> {
    const updateData: any = { payment_status: paymentStatus };
    
    if (paymentStatus === 'CONFIRMED') {
      updateData.payment_id = paymentId;
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
  },

  // Excluir um participante
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('participants')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
