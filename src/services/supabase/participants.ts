import { supabase } from '../../lib/supabase';
// Import CreateParticipantDTO
import { Participant, CreateParticipantDTO } from '../../types';

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
  cpf: data.cpf, // Adicione esta linha
  birthDate: data.birth_date, // Add birthDate mapping
  // Add other fields if they exist in your DB table (e.g., pix codes)
  pixPaymentCode: data.pix_payment_code,
  pixQrcodeUrl: data.pix_qrcode_url,
  paymentTransactionId: data.payment_transaction_id,
  partnerName: data.partner_name, // Assuming partner_name exists if needed
});

// Função para converter nosso tipo CreateParticipantDTO para o formato do Supabase
const toSupabaseParticipantCreate = (participant: CreateParticipantDTO) => ({
  event_id: participant.eventId,
  name: participant.name,
  email: participant.email,
  phone: participant.phone,
  cpf: participant.cpf, // Certifique-se de que esta linha exista
  birth_date: participant.birthDate,
  partner_id: participant.partnerId,
  payment_status: participant.paymentStatus || 'PENDING', // Default to PENDING
  payment_id: participant.paymentId,
  // payment_date is set below based on status
});

// Keep a version for updates if needed, accepting Partial<Participant>
const toSupabaseParticipantUpdate = (participant: Partial<Participant>) => ({
  event_id: participant.eventId,
  name: participant.name,
  email: participant.email,
  phone: participant.phone,
  birth_date: participant.birthDate, // Add birthDate mapping
  partner_id: participant.partnerId,
  payment_status: participant.paymentStatus,
  payment_id: participant.paymentId,
  payment_date: participant.paymentDate,
  cpf: participant.cpf, // Adicione esta linha
  // Add other updatable fields
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

  // Criar um novo participante - Update signature to use CreateParticipantDTO
  async create(participantData: CreateParticipantDTO): Promise<Participant> {
    const supabaseData: any = {
      ...toSupabaseParticipantCreate(participantData),
      registered_at: new Date().toISOString(),
    };

    // Set payment_date only if status is CONFIRMED
    if (participantData.paymentStatus === 'CONFIRMED') {
      supabaseData.payment_date = new Date().toISOString();
      // Ensure paymentId is set if confirming payment (might be generated in form or service)
      if (!supabaseData.payment_id) {
          supabaseData.payment_id = `manual_${Date.now()}`; // Example manual ID
          console.warn("Confirmed payment status without paymentId, generated manual ID:", supabaseData.payment_id);
      }
    } else {
        // Ensure payment_date and payment_id are null if PENDING
        supabaseData.payment_date = null;
        supabaseData.payment_id = null;
    }


    const { data, error } = await supabase
      .from('participants')
      .insert(supabaseData)
      .select()
      .single();

    if (error) {
        console.error("Supabase error creating participant:", error);
        throw error;
    }

    // Handle partner linking if necessary (check event type, etc.)
    // This logic might be better placed in the store or component depending on requirements
    // Example:
    // if (participantData.partnerId) {
    //   try {
    //     await supabase
    //       .from('participants')
    //       .update({ partner_id: data.id })
    //       .eq('id', participantData.partnerId);
    //   } catch (linkError) {
    //     console.error("Error linking partner:", linkError);
    //     // Decide how to handle linking errors (e.g., notify user)
    //   }
    // }


    return transformParticipant(data);
  },

  // Atualizar um participante existente - Use the update transformer
  async update(id: string, participant: Partial<Participant>): Promise<Participant> {
    const { data, error } = await supabase
      .from('participants')
      .update(toSupabaseParticipantUpdate(participant)) // Use update transformer
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
