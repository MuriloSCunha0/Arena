import { supabase } from '../../lib/supabase';
import WhatsappService from './whatsappService';
import { formatDate } from '../../utils/formatters';

/**
 * Serviço para gerenciar lembretes de datas comemorativas
 */
export const DateReminderService = {
  /**
   * Busca datas comemorativas para um período específico
   * @param startDate Data inicial para busca
   * @param endDate Data final para busca
   */
  async getCommemorationDates(startDate?: string, endDate?: string): Promise<any[]> {
    try {
      let query = supabase.from('commemorative_dates').select('*');
      
      if (startDate) {
        // Extrai mês e dia da data inicial
        const startMonth = new Date(startDate).getMonth() + 1;
        const startDay = new Date(startDate).getDate();
        query = query.gte('month', startMonth)
          .gte('day', startMonth === new Date(startDate).getMonth() + 1 ? startDay : 1);
      }
      
      if (endDate) {
        // Extrai mês e dia da data final
        const endMonth = new Date(endDate).getMonth() + 1;
        const endDay = new Date(endDate).getDate();
        query = query.lte('month', endMonth)
          .lte('day', endMonth === new Date(endDate).getMonth() + 1 ? endDay : 31);
      }
      
      const { data, error } = await query.order('month').order('day');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar datas comemorativas:', error);
      return [];
    }
  },
  
  /**
   * Adiciona uma nova data comemorativa
   * @param title Título da data comemorativa
   * @param month Mês (1-12)
   * @param day Dia (1-31)
   * @param message Mensagem personalizada para a data
   */
  async addCommemorativeDate(title: string, month: number, day: number, message: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('commemorative_dates')
        .insert({
          title,
          month,
          day,
          message
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao adicionar data comemorativa:', error);
      throw error;
    }
  },
  
  /**
   * Verifica e envia mensagens para datas comemorativas do dia
   */
  async sendCommemorativeDateReminders(): Promise<void> {
    try {
      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const currentDay = today.getDate();
      
      // Buscar datas comemorativas para hoje
      const { data: commemorativeDates, error } = await supabase
        .from('commemorative_dates')
        .select('*')
        .eq('month', currentMonth)
        .eq('day', currentDay);
      
      if (error) throw error;
      
      if (commemorativeDates && commemorativeDates.length > 0) {
        // Buscar todos os participantes ativos
        const { data: participants, error: participantsError } = await supabase
          .from('participants')
          .select('id, name, phone')
          .eq('active', true);
        
        if (participantsError) throw participantsError;
        
        // Para cada data comemorativa, enviar mensagem para todos os participantes
        for (const date of commemorativeDates) {
          for (const participant of participants || []) {
            if (participant.phone) {
              // Personaliza a mensagem com o nome do participante
              const personalizedMessage = date.message.replace('{name}', participant.name);
              
              await WhatsappService.sendMessage(participant.phone, personalizedMessage);
              
              // Registrar o envio da mensagem
              await supabase
                .from('notification_logs')
                .insert({
                  participant_id: participant.id,
                  type: 'COMMEMORATIVE_DATE',
                  message: personalizedMessage,
                  sent_at: new Date().toISOString(),
                  metadata: { commemorative_date_id: date.id }
                });
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro ao enviar mensagens de datas comemorativas:', error);
    }
  }
};

export default DateReminderService;
