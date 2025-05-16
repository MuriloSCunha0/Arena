import { supabase } from '../../lib/supabase';
import { handleSupabaseError } from '../../utils/supabase-error-handler';

export interface Payment {
  id: string;
  amount: number;
  description: string;
  paymentMethod: 'PIX' | 'CREDITO' | 'BOLETO' | 'DINHEIRO';
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
  reference?: string;
  tournamentId?: string;
  categoryId?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentData {
  amount: number;
  description: string;
  paymentMethod: 'PIX' | 'CREDITO' | 'BOLETO' | 'DINHEIRO';
  reference?: string;
  tournamentId?: string;
  categoryId?: string;
  userId: string;
}

export interface CreditCardData {
  cardNumber: string;
  cardholderName: string;
  expiryDate: string;
  cvv: string;
  installments: number;
}

class PaymentService {
  /**
   * Create a new payment
   */
  async createPayment(paymentData: CreatePaymentData): Promise<Payment> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert({
          amount: paymentData.amount,
          description: paymentData.description,
          payment_method: paymentData.paymentMethod,
          status: 'PENDING',
          reference: paymentData.reference,
          tournament_id: paymentData.tournamentId,
          category_id: paymentData.categoryId,
          user_id: paymentData.userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return this.transformPaymentData(data);
    } catch (error) {
      throw handleSupabaseError(error, 'Erro ao criar pagamento');
    }
  }

  /**
   * Get payment details by ID
   */
  async getPaymentDetails(paymentId: string): Promise<Payment> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (error) throw error;

      return this.transformPaymentData(data);
    } catch (error) {
      throw handleSupabaseError(error, 'Erro ao buscar detalhes do pagamento');
    }
  }

  /**
   * Generate PIX payment
   */
  async generatePixPayment(paymentId: string): Promise<{ pixCode: string }> {
    try {
      // In a real implementation, this would call an external API to generate a PIX code
      // For now, we'll simulate it
      
      // Update payment status in Supabase
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'PENDING',
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (error) throw error;

      // Return a mock PIX code
      return {
        pixCode: `00020126580014br.gov.bcb.pix0136${paymentId}520400005303986540${Math.floor(Math.random() * 1000)}5802BR5913Arena Tennis6009Sao Paulo62120508${paymentId}6304${this.calculateCRC16('mock')}`,
      };
    } catch (error) {
      throw handleSupabaseError(error, 'Erro ao gerar pagamento PIX');
    }
  }

  /**
   * Generate Boleto payment
   */
  async generateBoletoPayment(paymentId: string): Promise<{ boletoUrl: string }> {
    try {
      // In a real implementation, this would call an external API to generate a boleto
      // For now, we'll simulate it
      
      // Update payment status in Supabase
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'PENDING',
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (error) throw error;

      // Return a mock boleto URL
      return {
        boletoUrl: `https://example.com/boleto/${paymentId}`,
      };
    } catch (error) {
      throw handleSupabaseError(error, 'Erro ao gerar boleto');
    }
  }

  /**
   * Process credit card payment
   */
  async processCreditCardPayment(paymentId: string, creditCardData: CreditCardData): Promise<void> {
    try {
      // In a real implementation, this would call a payment gateway API to process the credit card
      // For now, we'll simulate a successful payment
      
      // Validate credit card in a real implementation
      
      // Update payment status in Supabase
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'PAID',
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (error) throw error;
    } catch (error) {
      throw handleSupabaseError(error, 'Erro ao processar pagamento com cartão de crédito');
    }
  }

  /**
   * Mark payment as to be paid in cash
   */
  async markAsCashPayment(paymentId: string): Promise<void> {
    try {
      // Update payment status in Supabase
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'PENDING', // It will be PAID when the organizer confirms
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (error) throw error;
    } catch (error) {
      throw handleSupabaseError(error, 'Erro ao registrar pagamento em dinheiro');
    }
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(paymentId: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('status')
        .eq('id', paymentId)
        .single();

      if (error) throw error;

      return data.status;
    } catch (error) {
      throw handleSupabaseError(error, 'Erro ao verificar status do pagamento');
    }
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(paymentId: string, status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED'): Promise<void> {
    try {
      const { error } = await supabase
        .from('payments')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (error) throw error;
    } catch (error) {
      throw handleSupabaseError(error, 'Erro ao atualizar status do pagamento');
    }
  }

  /**
   * Get payments by user ID
   */
  async getUserPayments(userId: string): Promise<Payment[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(this.transformPaymentData);
    } catch (error) {
      throw handleSupabaseError(error, 'Erro ao buscar pagamentos do usuário');
    }
  }

  /**
   * Get payments by tournament ID
   */
  async getTournamentPayments(tournamentId: string): Promise<Payment[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(this.transformPaymentData);
    } catch (error) {
      throw handleSupabaseError(error, 'Erro ao buscar pagamentos do torneio');
    }
  }

  // Helper method to transform database data to frontend format
  private transformPaymentData(data: any): Payment {
    return {
      id: data.id,
      amount: data.amount,
      description: data.description,
      paymentMethod: data.payment_method,
      status: data.status,
      reference: data.reference,
      tournamentId: data.tournament_id,
      categoryId: data.category_id,
      userId: data.user_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  // Helper method to calculate CRC16 (mocked version)
  private calculateCRC16(data: string): string {
    // In a real implementation, this would calculate the CRC16 checksum
    // For mock purposes, returning a random value
    return Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  }
}

export const paymentService = new PaymentService();
