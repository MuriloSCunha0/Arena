import axios from 'axios';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../utils/formatters';

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || '';
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN || '';

/**
 * Serviço de integração com a API do WhatsApp Business
 */
export const WhatsappService = {
  /**
   * Envia uma mensagem via WhatsApp
   * @param phone Número do telefone de destino (formato: 5511999999999)
   * @param message Mensagem a ser enviada
   */
  async sendMessage(phone: string, message: string): Promise<boolean> {
    try {
      // Formata o número para remover caracteres não numéricos
      const formattedPhone = phone.replace(/\D/g, '');
      
      if (!formattedPhone.startsWith('55')) {
        throw new Error('Número de telefone deve incluir código do país (55 para Brasil)');
      }

      await axios.post(
        `${WHATSAPP_API_URL}/messages`,
        {
          to: formattedPhone,
          type: 'text',
          text: { body: message }
        },
        {
          headers: {
            'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return true;
    } catch (error) {
      console.error('Erro ao enviar mensagem WhatsApp:', error);
      return false;
    }
  },

  /**
   * Verifica e envia lembrete de aniversário para participantes
   */
  async sendBirthdayReminders(): Promise<void> {
    try {
      // Obter a data atual no formato MM-DD (mês-dia)
      const today = new Date();
      const monthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      // Buscar participantes que fazem aniversário hoje
      const { data: birthdayParticipants, error } = await supabase
        .from('participants')
        .select('id, name, phone, birthdate')
        .filter('EXTRACT(MONTH FROM birthdate)', 'eq', today.getMonth() + 1)
        .filter('EXTRACT(DAY FROM birthdate)', 'eq', today.getDate());
      
      if (error) throw error;
      
      // Enviar mensagens para cada aniversariante
      for (const participant of birthdayParticipants || []) {
        if (participant.phone) {
          const message = `🎂 Feliz Aniversário, ${participant.name}! A equipe Arena Conexão deseja um dia repleto de alegrias e realizações!`;
          await this.sendMessage(participant.phone, message);
          
          // Registrar o envio da mensagem
          await supabase
            .from('notification_logs')
            .insert({
              participant_id: participant.id,
              type: 'BIRTHDAY',
              message,
              sent_at: new Date().toISOString()
            });
        }
      }
    } catch (error) {
      console.error('Erro ao enviar lembretes de aniversário:', error);
    }
  },
  
  /**
   * Envia lembretes para eventos próximos
   * @param daysBeforeEvent Quantos dias antes do evento enviar o lembrete
   */
  async sendEventReminders(daysBeforeEvent: number = 1): Promise<void> {
    try {
      // Calcular a data para a qual enviaremos lembretes
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysBeforeEvent);
      const formattedDate = targetDate.toISOString().split('T')[0];
      
      // Buscar eventos que ocorrerão na data alvo
      const { data: upcomingEvents, error } = await supabase
        .from('events')
        .select('*')
        .eq('date', formattedDate);
      
      if (error) throw error;
      
      // Para cada evento, enviar lembretes aos participantes
      for (const event of upcomingEvents || []) {
        // Buscar participantes do evento
        const { data: participants, error: participantsError } = await supabase
          .from('participants')
          .select('id, name, phone')
          .eq('event_id', event.id)
          .eq('payment_status', 'CONFIRMED'); // Apenas para participantes confirmados
        
        if (participantsError) throw participantsError;
        
        // Enviar mensagens para cada participante
        for (const participant of participants || []) {
          if (participant.phone) {
            const message = `
🏆 Lembrete de Evento!
Evento: ${event.title}
Data: ${formatDate(event.date)}
Horário: ${event.time}
Local: ${event.location}

Estamos ansiosos para vê-lo(a) lá!
            `.trim();
            
            await this.sendMessage(participant.phone, message);
            
            // Registrar o envio do lembrete
            await supabase
              .from('notification_logs')
              .insert({
                participant_id: participant.id,
                event_id: event.id,
                type: 'EVENT_REMINDER',
                message,
                sent_at: new Date().toISOString()
              });
          }
        }
      }
    } catch (error) {
      console.error('Erro ao enviar lembretes de eventos:', error);
    }
  }
};

export default WhatsappService;
