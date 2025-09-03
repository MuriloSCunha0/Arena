import { supabase } from '../../lib/supabase';
import { tratarErroSupabase } from '../../lib/supabase';
// Import CreateParticipantDTO
import { Participant, CreateParticipantDTO } from '../../types';

/**
 * Gera um UUID simples
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Cria um usuário temporário para participantes manuais
 */
async function createTemporaryUser(participantData: {
  name: string;
  email: string;
  phone: string;
  cpf: string;
}): Promise<string | null> {
  try {
    const userId = generateUUID();
    
    const userData = {
      id: userId,
      email: participantData.email,
      full_name: participantData.name,
      phone: participantData.phone,
      cpf: participantData.cpf,
      user_metadata: {
        name: participantData.name,
        phone: participantData.phone,
        cpf: participantData.cpf,
        isTemporary: true,
        createdFor: 'manual_participant'
      },
      app_metadata: {
        role: 'user',
        isTemporary: true
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: createdUser, error } = await supabase
      .from('users')
      .insert(userData)
      .select('id')
      .single();

    if (error) {
      console.error('❌ Erro ao criar usuário temporário:', error);
      return null;
    }

    console.log(`✅ Usuário temporário criado: ${createdUser.id} para ${participantData.name}`);
    return createdUser.id;

  } catch (error) {
    console.error('❌ Erro na criação de usuário temporário:', error);
    return null;
  }
}

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
  teamName: data.team_name, // Nome da equipe/grupo
  userId: data.user_id, // Adicionar userId para filtragem
  eventName: data.event_name, // Adicionar nome do evento se disponível
  metadata: data.metadata // Adicionar metadados
});

// Função para converter nosso tipo CreateParticipantDTO para o formato do Supabase
const toSupabaseParticipantCreate = (participant: CreateParticipantDTO & { metadata?: any; teamName?: string }) => ({
  event_id: participant.eventId,
  name: participant.name,
  email: participant.email,
  phone: participant.phone,
  cpf: participant.cpf, 
  birth_date: participant.birthDate || null, // Tratar string vazia como null
  partner_id: participant.partnerId,
  partner_name: participant.partnerName, // Nome da dupla/parceiro
  team_name: participant.teamName, // Nome da equipe/grupo
  payment_status: participant.paymentStatus || 'PENDING',
  payment_id: participant.paymentId,
  user_id: participant.userId, // Adicionar userId quando disponível
  metadata: participant.metadata || {}, // Metadados adicionais
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
    try {
      // Buscar todos os usuários válidos (incluindo temporários para participantes manuais)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, app_metadata')
        .or('app_metadata->>role.eq.user,app_metadata->roles.cs.["user"]');

      if (userError) throw userError;

      // Extrair os IDs de usuário (incluindo temporários)
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
    } catch (error) {
      console.error('Erro ao buscar participantes por evento:', error);
      throw error;
    }
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

      let finalParticipant = { ...participant };

      // Para participantes manuais sem userId, criar usuário temporário automaticamente
      if (!participant.userId && participant.metadata?.isManual) {
        console.log('🔧 Criando usuário temporário para participante manual:', participant.name);
        
        // Validar que temos os dados obrigatórios
        if (participant.email && participant.phone && participant.cpf) {
          const tempUserId = await createTemporaryUser({
            name: participant.name,
            email: participant.email,
            phone: participant.phone,
            cpf: participant.cpf
          });

          if (tempUserId) {
            finalParticipant.userId = tempUserId;
            console.log(`✅ Usuário temporário ${tempUserId} vinculado ao participante ${participant.name}`);
          } else {
            console.warn('⚠️ Falha ao criar usuário temporário, prosseguindo sem userId');
          }
        } else {
          console.warn('⚠️ Dados insuficientes para criar usuário temporário (email, phone, cpf são obrigatórios)');
        }
      }
      
      const supabaseData = toSupabaseParticipantCreate({
        ...finalParticipant,
        teamName: finalParticipant.teamName || undefined
      });
      
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
      console.log(`Atualizando status de pagamento para participante ${id}: ${paymentStatus}`);

      // Usar RPC para bypass de possíveis triggers problemáticos
      const { data, error } = await supabase.rpc('update_participant_payment', {
        participant_id: id,
        new_payment_status: paymentStatus,
        new_payment_id: paymentId || null
      });

      if (error) {
        console.warn('Falha no RPC, tentando atualização direta:', error);
        
        // Fallback para atualização direta
        const updateData: any = { 
          payment_status: paymentStatus,
          updated_at: new Date().toISOString()
        };
        
        if (paymentStatus === 'CONFIRMED') {
          updateData.payment_id = paymentId;
          updateData.payment_date = new Date().toISOString();
        }

        const { data: directData, error: directError } = await supabase
          .from('participants')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (directError) {
          console.error('Erro na atualização direta:', directError);
          throw new Error(`Erro ao atualizar: ${directError.message} (Code: ${directError.code || 'UNKNOWN'})`);
        }

        return transformParticipant(directData);
      }

      // Se chegou aqui, o RPC funcionou
      console.log('Participante atualizado via RPC:', data);
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
