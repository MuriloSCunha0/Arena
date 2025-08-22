import { supabase } from '../lib/supabase';

interface RegistrationData {
  userId: string;
  eventId: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  birthDate?: string;
  partnerName?: string;
  category?: string;
  skillLevel?: string;
  paymentMethod: 'pix' | 'credit_card' | 'cash' | 'bank_transfer';
  notes?: string;
  medicalNotes?: string;
}

export const EventRegistrationService = {
  // Register a participant for an event
  async registerForEvent(data: RegistrationData): Promise<{ id: string; success: boolean; participant?: any }> {
    try {
      console.log('🔍 [EventRegistrationService] Iniciando inscrição:', { 
        userId: data.userId, 
        eventId: data.eventId,
        name: data.name
      });

      // Get event details first to check availability
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, title, max_participants, current_participants, entry_fee, status')
        .eq('id', data.eventId)
        .single();
      
      if (eventError) {
        console.error('❌ [EventRegistrationService] Erro ao buscar evento:', eventError);
        throw eventError;
      }
      
      // Check if event exists
      if (!event) {
        console.error('❌ [EventRegistrationService] Evento não encontrado');
        throw new Error('Evento não encontrado.');
      }

      console.log('✅ [EventRegistrationService] Evento encontrado:', {
        title: event.title,
        status: event.status,
        currentParticipants: event.current_participants,
        maxParticipants: event.max_participants
      });
      
      // Check if event is open for registration
      if (!['DRAFT', 'PUBLISHED', 'OPEN'].includes(event.status)) {
        console.error('❌ [EventRegistrationService] Evento não está aberto para inscrições:', event.status);
        throw new Error('Este evento não está mais aberto para inscrições.');
      }
      
      // Check if participant already registered
      const { data: existingRegistration, error: regCheckError } = await supabase
        .from('participants')
        .select('id')
        .eq('user_id', data.userId)
        .eq('event_id', data.eventId)
        .maybeSingle();
      
      if (regCheckError) {
        console.error('❌ [EventRegistrationService] Erro ao verificar inscrição existente:', regCheckError);
        throw regCheckError;
      }
      
      if (existingRegistration) {
        console.warn('⚠️ [EventRegistrationService] Usuário já está inscrito neste evento');
        throw new Error('Você já está inscrito neste evento.');
      }
      
      // Check if event is full
      if (event.current_participants >= event.max_participants) {
        console.error('❌ [EventRegistrationService] Evento lotado:', {
          current: event.current_participants,
          max: event.max_participants
        });
        throw new Error('Este evento já atingiu o número máximo de participantes.');
      }
      
      // Create the registration with all required fields
      const registrationData = {
        user_id: data.userId,
        event_id: data.eventId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        cpf: data.cpf,
        birth_date: data.birthDate || null,
        partner_name: data.partnerName || null,
        category: data.category || 'open',
        skill_level: data.skillLevel || null,
        payment_status: 'PENDING',
        payment_method: data.paymentMethod,
        payment_amount: event.entry_fee || 0,
        registration_notes: data.notes || null,
        medical_notes: data.medicalNotes || null,
        registered_at: new Date().toISOString(),
        metadata: {}
      };

      console.log('🔍 [EventRegistrationService] Dados preparados para inserção:', registrationData);
      
      const { data: newRegistration, error: insertError } = await supabase
        .from('participants')
        .insert([registrationData])
        .select(`
          id,
          user_id,
          event_id,
          name,
          email,
          phone,
          cpf,
          partner_name,
          payment_status,
          payment_amount,
          registered_at
        `)
        .single();
      
      if (insertError) {
        console.error('❌ [EventRegistrationService] Erro ao inserir participante:', insertError);
        throw insertError;
      }

      console.log('✅ [EventRegistrationService] Participante inserido com sucesso:', newRegistration);

      // Verify the insertion was successful
      const { data: verificationData, error: verifyError } = await supabase
        .from('participants')
        .select('*')
        .eq('id', newRegistration.id)
        .single();

      if (verifyError || !verificationData) {
        console.error('❌ [EventRegistrationService] Falha na verificação pós-inserção:', verifyError);
        throw new Error('Erro na verificação da inscrição');
      }

      console.log('✅ [EventRegistrationService] Inscrição verificada no banco:', verificationData);

      // Check if event participant count was updated (should be handled by trigger)
      const { data: updatedEvent, error: eventUpdateError } = await supabase
        .from('events')
        .select('current_participants')
        .eq('id', data.eventId)
        .single();

      if (updatedEvent) {
        console.log('📊 [EventRegistrationService] Contador de participantes atualizado:', {
          before: event.current_participants,
          after: updatedEvent.current_participants
        });
      }
      
      return {
        id: newRegistration.id,
        success: true,
        participant: verificationData
      };
    } catch (error) {
      console.error('❌ [EventRegistrationService] Erro ao registrar participante:', error);
      throw error;
    }
  },
  
  // Cancel a registration
  async cancelRegistration(userId: string, eventId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('participants')
        .delete()
        .eq('user_id', userId)
        .eq('event_id', eventId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error canceling registration:', error);
      throw error;
    }
  },
  
  // Get registration details
  async getRegistrationDetails(userId: string, eventId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('participants')
        .select(`
          id,
          partner_name,
          registration_date,
          payment_status,
          payment_method,
          phone_contact,
          category,
          notes,
          events:event_id (
            id,
            title,
            date,
            price,
            location
          )
        `)
        .eq('user_id', userId)
        .eq('event_id', eventId)
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error getting registration details:', error);
      throw error;
    }
  },

  // Get all participants for an event
  async getEventParticipants(eventId: string): Promise<any[]> {
    try {
      console.log('🔍 [EventRegistrationService] Buscando participantes do evento:', eventId);

      const { data, error } = await supabase
        .from('participants')
        .select(`
          id,
          user_id,
          name,
          email,
          phone,
          cpf,
          birth_date,
          partner_name,
          category,
          skill_level,
          payment_status,
          payment_amount,
          final_position,
          registered_at,
          users(
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('event_id', eventId)
        .order('registered_at', { ascending: true });

      if (error) {
        console.error('❌ [EventRegistrationService] Erro ao buscar participantes:', error);
        throw error;
      }

      console.log(`✅ [EventRegistrationService] Encontrados ${data?.length || 0} participantes no evento`);
      return data || [];

    } catch (error) {
      console.error('❌ [EventRegistrationService] Erro ao buscar participantes do evento:', error);
      throw error;
    }
  },

  // Verify data integrity for participants
  async verifyDataIntegrity(eventId?: string): Promise<{
    totalParticipants: number;
    orphanParticipants: any[];
    duplicateParticipants: any[];
    eventsWithWrongCounts: any[];
  }> {
    try {
      console.log('🔍 [EventRegistrationService] Verificando integridade dos dados...');

      // 1. Count total participants
      const { count: totalParticipants, error: countError } = await supabase
        .from('participants')
        .select('id', { count: 'exact', head: true })
        .eq(eventId ? 'event_id' : 'event_id', eventId || '');

      if (countError && !eventId) {
        console.error('❌ Erro ao contar participantes:', countError);
      }

      // 2. Find orphan participants (participants without valid events)
      const { data: orphanParticipants, error: orphanError } = await supabase
        .from('participants')
        .select(`
          id,
          user_id,
          event_id,
          name,
          registered_at
        `)
        .not('event_id', 'in', `(SELECT id FROM events)`)
        .limit(10);

      // 3. Find duplicate participants (same user_id + event_id)
      const { data: allParticipants, error: dupError } = await supabase
        .from('participants')
        .select('id, user_id, event_id, name, registered_at')
        .not('user_id', 'is', null);

      const duplicateParticipants: any[] = [];
      const seen = new Set();
      
      allParticipants?.forEach(p => {
        const key = `${p.user_id}-${p.event_id}`;
        if (seen.has(key)) {
          duplicateParticipants.push(p);
        } else {
          seen.add(key);
        }
      });

      // 4. Find events with wrong participant counts
      const { data: eventsWithCounts, error: eventsError } = await supabase
        .from('events')
        .select(`
          id,
          title,
          current_participants,
          participants(count)
        `);

      const eventsWithWrongCounts = eventsWithCounts?.filter(event => {
        const actualCount = event.participants?.[0]?.count || 0;
        return event.current_participants !== actualCount;
      }) || [];

      const result = {
        totalParticipants: totalParticipants || 0,
        orphanParticipants: orphanParticipants || [],
        duplicateParticipants,
        eventsWithWrongCounts
      };

      console.log('📊 [EventRegistrationService] Relatório de integridade:', {
        totalParticipants: result.totalParticipants,
        orphanCount: result.orphanParticipants.length,
        duplicateCount: result.duplicateParticipants.length,
        wrongCountEvents: result.eventsWithWrongCounts.length
      });

      return result;

    } catch (error) {
      console.error('❌ [EventRegistrationService] Erro na verificação de integridade:', error);
      throw error;
    }
  },

  // Fix event participant counts
  async fixEventParticipantCounts(): Promise<{ fixed: number; errors: any[] }> {
    try {
      console.log('🔧 [EventRegistrationService] Corrigindo contadores de participantes...');

      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id, title, current_participants');

      if (eventsError) throw eventsError;

      const fixes: any[] = [];
      const errors: any[] = [];

      for (const event of events || []) {
        try {
          // Count actual participants
          const { count: actualCount, error: countError } = await supabase
            .from('participants')
            .select('id', { count: 'exact', head: true })
            .eq('event_id', event.id);

          if (countError) {
            errors.push({ eventId: event.id, error: countError });
            continue;
          }

          // Update if different
          if (actualCount !== event.current_participants) {
            const { error: updateError } = await supabase
              .from('events')
              .update({ current_participants: actualCount })
              .eq('id', event.id);

            if (updateError) {
              errors.push({ eventId: event.id, error: updateError });
            } else {
              fixes.push({
                eventId: event.id,
                title: event.title,
                oldCount: event.current_participants,
                newCount: actualCount
              });
            }
          }
        } catch (error) {
          errors.push({ eventId: event.id, error });
        }
      }

      console.log(`✅ [EventRegistrationService] Corrigidos ${fixes.length} eventos, ${errors.length} erros`);
      return { fixed: fixes.length, errors };

    } catch (error) {
      console.error('❌ [EventRegistrationService] Erro ao corrigir contadores:', error);
      throw error;
    }
  }
};
