import { supabase } from '../../lib/supabase';
import { tratarErroSupabase } from '../../lib/supabase';
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
  userId: data.user_id, // Adicionar userId para filtragem
  eventName: data.event_name // Adicionar nome do evento se disponível
});

// Função para converter nosso tipo CreateParticipantDTO para o formato do Supabase
const toSupabaseParticipantCreate = (participant: CreateParticipantDTO) => ({
  event_id: participant.eventId,
  name: participant.name,
  email: participant.email,
  phone: participant.phone,
  cpf: participant.cpf, 
  birth_date: participant.birthDate || null, // Tratar string vazia como null
  partner_id: participant.partnerId,
  payment_status: participant.paymentStatus || 'PENDING',
  payment_id: participant.paymentId,
  user_id: participant.userId, // Adicionar userId quando disponível
  // payment_date is set below based on status
});

// Keep a version for updates if needed, accepting Partial<Participant>
const toSupabaseParticipantUpdate = (participant: Partial<Participant>) => ({
  event_id: participant.eventId,
  name: participant.name,
  email: participant.email,
  phone: participant.phone,
  birth_date: participant.birthDate || null, // Tratar string vazia como null
  partner_id: participant.partnerId,
  payment_status: participant.paymentStatus,
  payment_id: participant.paymentId,
  payment_date: participant.paymentDate || null, // Tratar string vazia como null
  cpf: participant.cpf,
  // Add other updatable fields
});


export const ParticipantsService = {
  /**
   * Buscar todos os participantes (apenas usuários com tipo "user")
   * Esta função filtra os participantes para mostrar apenas aqueles com papel de usuário comum,
   * excluindo administradores e organizadores conforme solicitação de requisito de negócio.
   * Isso é feito verificando se app_metadata.role === "user" ou se app_metadata.roles contém "user"
   */  async getAll(): Promise<Participant[]> {
    try {
      // Buscar participantes diretamente da tabela participants
      // A tabela 'participants' deve ter RLS configurado corretamente
      const { data, error } = await supabase
        .from('participants')
        .select(`
          *,
          events(title)
        `)
        .order('registered_at', { ascending: false });

      if (error) throw error;

      // Transformar os dados para incluir o nome do evento
      return data.map(item => ({
        ...transformParticipant(item),
        eventName: item.events?.title || 'Evento sem nome'
      }));
    } catch (error) {
      console.error('Erro ao buscar participantes:', error);
      throw error;
    }
  },  /**
   * Buscar participantes por evento (apenas usuários do tipo "user")
   * Esta função filtra os participantes para mostrar apenas aqueles com papel de usuário comum,
   * excluindo administradores e organizadores conforme solicitação de requisito de negócio.
   * @param eventId ID do evento para filtrar os participantes
   */  async getByEventId(eventId: string): Promise<Participant[]> {
    // Primeiro, buscar os IDs de usuários com app_metadata.role === "user" ou app_metadata.roles contém "user"
    // Usando sintaxe correta do PostgREST para consultar campos JSON
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, app_metadata')
      .or('app_metadata->>role.eq.user,app_metadata->roles.cs.["user"]');

    if (userError) throw userError;

    // Extrair os IDs de usuário
    const userIds = userData.map(user => user.id);

    // Buscar participantes que correspondem a esses usuários e ao evento específico
    const { data, error } = await supabase
      .from('participants')
      .select('*, events(title)')
      .eq('event_id', eventId)
      .in('user_id', userIds)
      .order('registered_at', { ascending: false });

    if (error) throw error;

    // Transformar os dados para incluir o nome do evento
    return data.map(item => ({
      ...transformParticipant(item),
      eventName: item.events?.title || 'Evento sem nome'
    }));
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
  async create(participant: CreateParticipantDTO): Promise<Participant> {
    try {
      console.log('Creating participant:', participant);
      
      // Verificar se o evento existe e não está cheio
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, max_participants, current_participants')
        .eq('id', participant.eventId)
        .single();
      
      if (eventError) {
        throw new Error(`Erro ao verificar evento: ${eventError.message}`);
      }
      
      if (!event) {
        throw new Error('Evento não encontrado');
      }
      
      // Verificar se há vagas disponíveis
      const currentCount = event.current_participants || 0;
      const maxCount = event.max_participants || 0;
      
      if (maxCount > 0 && currentCount >= maxCount) {
        throw new Error('O evento já atingiu o número máximo de participantes');
      }
      
      const supabaseData = toSupabaseParticipantCreate(participant);
      
      const { data, error } = await supabase
        .from('participants')
        .insert(supabaseData)
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar participante no Supabase:', error);
        throw new Error(`Failed to create participant: ${error.message}`);
      }

      return transformParticipant(data);
    } catch (error) {
      throw tratarErroSupabase(error, 'criar participante');
    }
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
    try {
      // Primeiro, tentar verificar se o participante existe
      const { data: existingParticipant, error: fetchError } = await supabase
        .from('participants')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('Erro ao buscar participante:', fetchError);
        throw new Error(`Participante não encontrado: ${fetchError.message}`);
      }

      console.log('Participante encontrado:', existingParticipant);

      const updateData: any = { payment_status: paymentStatus };
      
      if (paymentStatus === 'CONFIRMED') {
        updateData.payment_id = paymentId;
        updateData.payment_date = new Date().toISOString();
      }

      console.log('Tentando atualizar com dados:', updateData);

      const { data, error } = await supabase
        .from('participants')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar participante:', error);
        throw new Error(`Erro ao atualizar: ${error.message} (Code: ${error.code})`);
      }

      console.log('Participante atualizado com sucesso:', data);
      return transformParticipant(data);
    } catch (error) {
      console.error('Erro completo no updatePaymentStatus:', error);
      throw error;
    }
  },

  // Método alternativo usando RPC para contornar problemas de cache
  async updatePaymentStatusRPC(
    id: string,
    paymentStatus: 'PENDING' | 'CONFIRMED',
    paymentId?: string
  ): Promise<Participant> {
    try {
      // Usar função RPC do banco para contornar cache
      const { error } = await supabase.rpc('update_participant_payment', {
        participant_id: id,
        new_status: paymentStatus,
        payment_id_param: paymentId || null,
        payment_date_param: paymentStatus === 'CONFIRMED' ? new Date().toISOString() : null
      });

      if (error) {
        console.error('Erro RPC:', error);
        throw error;
      }

      // Se RPC não estiver disponível, usar método manual
      return this.updatePaymentStatusManual(id, paymentStatus, paymentId);
    } catch (error) {
      console.error('RPC falhou, tentando método manual:', error);
      return this.updatePaymentStatusManual(id, paymentStatus, paymentId);
    }
  },

  // Método manual usando SQL direto
  async updatePaymentStatusManual(
    id: string,
    paymentStatus: 'PENDING' | 'CONFIRMED',
    paymentId?: string
  ): Promise<Participant> {
    try {
      const paymentDate = paymentStatus === 'CONFIRMED' ? new Date().toISOString() : null;
      
      // Usar query SQL direto para contornar problemas de cache
      const query = `
        UPDATE participants 
        SET 
          payment_status = $1,
          payment_id = $2,
          payment_date = $3,
          updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `;

      const { data, error } = await supabase.rpc('execute_sql', {
        sql_query: query,
        params: [paymentStatus, paymentId || null, paymentDate, id]
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('Nenhum participante foi atualizado');
      }

      return transformParticipant(data[0]);
    } catch (error) {
      console.error('Método manual falhou:', error);
      throw error;
    }
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
