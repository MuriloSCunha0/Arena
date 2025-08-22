import { supabase } from '../lib/supabase';
import { ParticipantService } from './supabase/participantService';
import { EventRegistrationService } from './eventRegistrationService';

/**
 * ✅ SERVIÇO GARANTIDO DE INSCRIÇÃO
 * Este serviço GARANTE que toda inscrição seja salva na tabela participants
 */
export const GuaranteedRegistrationService = {
  
  /**
   * ✅ MÉTODO PRINCIPAL: Garantir inscrição imediata
   * Este método é chamado SEMPRE que um usuário se inscreve em um torneio
   */
  async guaranteeParticipantSaved(
    userId: string,
    eventId: string,
    participantData: {
      name: string;
      email?: string;
      phone?: string;
      cpf?: string;
      birthDate?: string;
      partnerName?: string;
      category?: string;
      skillLevel?: string;
      paymentMethod?: 'pix' | 'credit_card' | 'cash' | 'bank_transfer';
      notes?: string;
      medicalNotes?: string;
    }
  ): Promise<{ success: boolean; participant: any; participantId: string }> {
    
    let savedParticipant = null;
    const maxRetries = 3;
    let lastError = null;

    console.log('🚨 [GuaranteedRegistration] INICIANDO PROCESSO GARANTIDO DE INSCRIÇÃO');
    console.log('🚨 Dados:', { userId, eventId, name: participantData.name });

    // ✅ TENTATIVA 1: Usar EventRegistrationService
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 [GuaranteedRegistration] Tentativa ${attempt}/${maxRetries} - EventRegistrationService`);
        
        const result = await EventRegistrationService.registerForEvent({
          userId,
          eventId,
          name: participantData.name,
          email: participantData.email || '',
          phone: participantData.phone || '',
          cpf: participantData.cpf || '',
          birthDate: participantData.birthDate,
          partnerName: participantData.partnerName,
          category: participantData.category,
          skillLevel: participantData.skillLevel,
          paymentMethod: participantData.paymentMethod || 'pix',
          notes: participantData.notes,
          medicalNotes: participantData.medicalNotes
        });

        if (result.success && result.participant) {
          savedParticipant = result.participant;
          console.log('✅ [GuaranteedRegistration] SUCESSO via EventRegistrationService:', savedParticipant);
          break;
        }

      } catch (error) {
        console.warn(`⚠️ [GuaranteedRegistration] Tentativa ${attempt} falhou:`, error);
        lastError = error;
        
        if (attempt === maxRetries) {
          console.log('🔄 [GuaranteedRegistration] Mudando para ParticipantService...');
        }
      }
    }

    // ✅ TENTATIVA 2: Usar ParticipantService (fallback)
    if (!savedParticipant) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`🔄 [GuaranteedRegistration] Fallback ${attempt}/${maxRetries} - ParticipantService`);
          
          savedParticipant = await ParticipantService.saveParticipantImmediate({
            userId,
            eventId,
            name: participantData.name,
            email: participantData.email,
            phone: participantData.phone,
            cpf: participantData.cpf,
            birthDate: participantData.birthDate,
            partnerName: participantData.partnerName,
            category: participantData.category,
            skillLevel: participantData.skillLevel,
            paymentMethod: participantData.paymentMethod,
            notes: participantData.notes,
            medicalNotes: participantData.medicalNotes
          });

          if (savedParticipant) {
            console.log('✅ [GuaranteedRegistration] SUCESSO via ParticipantService:', savedParticipant);
            break;
          }

        } catch (error) {
          console.warn(`⚠️ [GuaranteedRegistration] Fallback ${attempt} falhou:`, error);
          lastError = error;
        }
      }
    }

    // ✅ TENTATIVA 3: Inserção direta (último recurso)
    if (!savedParticipant) {
      try {
        console.log('🚨 [GuaranteedRegistration] ÚLTIMO RECURSO - Inserção direta');
        
        const directInsert = {
          user_id: userId,
          event_id: eventId,
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

        const { data, error } = await supabase
          .from('participants')
          .insert(directInsert)
          .select('*')
          .single();

        if (error) throw error;
        
        savedParticipant = data;
        console.log('✅ [GuaranteedRegistration] SUCESSO via inserção direta:', savedParticipant);

      } catch (error) {
        console.error('🚨 [GuaranteedRegistration] FALHA TOTAL em todas as tentativas:', error);
        lastError = error;
      }
    }

    // ✅ VERIFICAÇÃO FINAL GARANTIDA
    if (savedParticipant?.id) {
      try {
        const { data: finalVerification } = await supabase
          .from('participants')
          .select('*')
          .eq('id', savedParticipant.id)
          .single();

        if (finalVerification) {
          console.log('🎯 [GuaranteedRegistration] CONFIRMAÇÃO FINAL - Participante está na tabela!');
          return {
            success: true,
            participant: finalVerification,
            participantId: finalVerification.id
          };
        }
      } catch (verifyError) {
        console.error('🚨 [GuaranteedRegistration] Erro na verificação final:', verifyError);
      }
    }

    // ✅ FALHA TOTAL
    console.error('🚨 [GuaranteedRegistration] FALHA TOTAL - Participante NÃO foi salvo!');
    throw lastError || new Error('Falha crítica: não foi possível salvar o participante');
  },

  /**
   * ✅ VERIFICAR se um participante está realmente salvo
   */
  async verifyParticipantSaved(userId: string, eventId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('participants')
        .select('id')
        .eq('user_id', userId)
        .eq('event_id', eventId)
        .maybeSingle();

      const isSaved = !error && !!data;
      console.log(`🔍 [GuaranteedRegistration] Verificação: ${isSaved ? 'SALVO' : 'NÃO SALVO'}`, { userId, eventId });
      
      return isSaved;
    } catch (error) {
      console.error('🚨 [GuaranteedRegistration] Erro na verificação:', error);
      return false;
    }
  },

  /**
   * ✅ RECUPERAR participante salvo
   */
  async getParticipantData(userId: string, eventId: string): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .eq('user_id', userId)
        .eq('event_id', eventId)
        .single();

      if (error || !data) {
        console.log('🔍 [GuaranteedRegistration] Participante não encontrado');
        return null;
      }

      console.log('✅ [GuaranteedRegistration] Participante encontrado:', data);
      return data;
    } catch (error) {
      console.error('🚨 [GuaranteedRegistration] Erro ao buscar participante:', error);
      return null;
    }
  }
};

// ✅ HOOK PARA USAR EM COMPONENTES
export const useGuaranteedRegistration = () => {
  return {
    guaranteeRegistration: GuaranteedRegistrationService.guaranteeParticipantSaved,
    verifyRegistration: GuaranteedRegistrationService.verifyParticipantSaved,
    getParticipantData: GuaranteedRegistrationService.getParticipantData
  };
};
