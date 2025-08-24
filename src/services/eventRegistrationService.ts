import { supabase } from '../lib/supabase';

interface RegistrationData {
  userId: string;
  eventId: string;
  partnerName?: string;
  phoneNumber?: string;
  category?: string;
  paymentMethod: 'pix' | 'credit_card' | 'cash' | 'bank_transfer';
  notes?: string;
}

export const EventRegistrationService = {
  // Register a participant for an event
  async registerForEvent(data: RegistrationData): Promise<{ id: string; success: boolean }> {
    try {
      // Get event details first to check availability
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, max_participants, registration_deadline')
        .eq('id', data.eventId)
        .single();
      
      if (eventError) throw eventError;
      
      // Check if event exists
      if (!event) {
        throw new Error('Evento não encontrado.');
      }
      
      // Check if registration is still open
      const now = new Date();
      const deadline = new Date(event.registration_deadline);
      if (deadline < now) {
        throw new Error('As inscrições para este evento já foram encerradas.');
      }
      
      // Check if participant already registered
      const { data: existingRegistration, error: regCheckError } = await supabase
        .from('participants')
        .select('id')
        .eq('user_id', data.userId)
        .eq('event_id', data.eventId)
        .maybeSingle();
      
      if (regCheckError) throw regCheckError;
      
      if (existingRegistration) {
        throw new Error('Você já está inscrito neste evento.');
      }
      
      // Check if event is full
      const { count, error: countError } = await supabase
        .from('participants')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', data.eventId);
      
      if (countError) throw countError;
      
      if (typeof count === 'number' && event.max_participants && count >= event.max_participants) {
        throw new Error('Este evento já atingiu o número máximo de participantes.');
      }
      
      // Create the registration
      const registrationData = {
        user_id: data.userId,
        event_id: data.eventId,
        partner_name: data.partnerName || null,
        registration_date: new Date().toISOString(),
        payment_status: 'pending',
        payment_method: data.paymentMethod,
        phone_contact: data.phoneNumber || null,
        category: data.category || 'open',
        notes: data.notes || null
      };
      
      const { data: newRegistration, error: insertError } = await supabase
        .from('participants')
        .insert([registrationData])
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      return {
        id: newRegistration.id,
        success: true
      };
    } catch (error) {
      console.error('Error registering for event:', error);
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
  }
};
