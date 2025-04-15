import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../lib/supabase';

const PAYMENT_API_URL = process.env.PAYMENT_API_URL || '';
const PAYMENT_API_KEY = process.env.PAYMENT_API_KEY || '';

/**
 * Interface para dados de pagamento
 */
interface PaymentData {
  amount: number;
  description: string;
  customerName: string;
  customerEmail: string;
  customerDocument?: string; // CPF/CNPJ
  callbackUrl?: string;
  referenceId?: string;
  expiresIn?: number; // Em segundos
}

/**
 * Interface para dados fiscais
 */
interface FiscalData {
  document: string; // CPF/CNPJ
  address: {
    street: string;
    number: string;
    complement?: string;
    district: string;
    city: string;
    state: string;
    zipCode: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
}

/**
 * Serviço de integração com gateway de pagamento
 */
export const PaymentGatewayService = {
  /**
   * Gera um QR Code PIX para pagamento
   */
  async generatePixPayment(paymentData: PaymentData): Promise<any> {
    try {
      const referenceId = paymentData.referenceId || `pix_${uuidv4()}`;
      
      const response = await axios.post(
        `${PAYMENT_API_URL}/payments/pix`,
        {
          reference_id: referenceId,
          amount: paymentData.amount,
          description: paymentData.description,
          payer: {
            name: paymentData.customerName,
            email: paymentData.customerEmail,
            tax_id: paymentData.customerDocument
          },
          expires_in: paymentData.expiresIn || 3600, // 1 hora por padrão
          callback_url: paymentData.callbackUrl
        },
        {
          headers: {
            'Authorization': `Bearer ${PAYMENT_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Registrar o pagamento no nosso banco
      await supabase.from('payment_transactions').insert({
        payment_id: referenceId,
        payment_method: 'PIX',
        amount: paymentData.amount,
        description: paymentData.description,
        status: 'PENDING',
        customer_name: paymentData.customerName,
        customer_email: paymentData.customerEmail,
        expires_at: new Date(Date.now() + (paymentData.expiresIn || 3600) * 1000).toISOString(),
        qr_code: response.data.qr_code,
        qr_code_text: response.data.qr_code_text
      });
      
      return {
        referenceId,
        qrCode: response.data.qr_code,
        qrCodeText: response.data.qr_code_text,
        expiresAt: new Date(Date.now() + (paymentData.expiresIn || 3600) * 1000).toISOString()
      };
    } catch (error) {
      console.error('Erro ao gerar pagamento PIX:', error);
      throw new Error('Falha ao gerar QR Code PIX');
    }
  },
  
  /**
   * Gera um link de pagamento por cartão de crédito
   */
  async generateCardPaymentLink(paymentData: PaymentData): Promise<any> {
    try {
      const referenceId = paymentData.referenceId || `card_${uuidv4()}`;
      
      const response = await axios.post(
        `${PAYMENT_API_URL}/payments/link`,
        {
          reference_id: referenceId,
          amount: paymentData.amount,
          description: paymentData.description,
          customer: {
            name: paymentData.customerName,
            email: paymentData.customerEmail,
            tax_id: paymentData.customerDocument
          },
          expires_in: paymentData.expiresIn || 86400, // 24 horas por padrão
          callback_url: paymentData.callbackUrl
        },
        {
          headers: {
            'Authorization': `Bearer ${PAYMENT_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Registrar o pagamento no nosso banco
      await supabase.from('payment_transactions').insert({
        payment_id: referenceId,
        payment_method: 'CARD',
        amount: paymentData.amount,
        description: paymentData.description,
        status: 'PENDING',
        customer_name: paymentData.customerName,
        customer_email: paymentData.customerEmail,
        expires_at: new Date(Date.now() + (paymentData.expiresIn || 86400) * 1000).toISOString(),
        payment_link: response.data.payment_url
      });
      
      return {
        referenceId,
        paymentLink: response.data.payment_url,
        expiresAt: new Date(Date.now() + (paymentData.expiresIn || 86400) * 1000).toISOString()
      };
    } catch (error) {
      console.error('Erro ao gerar link de pagamento:', error);
      throw new Error('Falha ao gerar link de pagamento');
    }
  },
  
  /**
   * Verifica o status de um pagamento
   */
  async checkPaymentStatus(paymentId: string): Promise<string> {
    try {
      const response = await axios.get(
        `${PAYMENT_API_URL}/payments/${paymentId}`,
        {
          headers: {
            'Authorization': `Bearer ${PAYMENT_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const status = response.data.status;
      
      // Atualizar status no nosso banco
      await supabase
        .from('payment_transactions')
        .update({ status })
        .eq('payment_id', paymentId);
      
      return status;
    } catch (error) {
      console.error(`Erro ao verificar status do pagamento ${paymentId}:`, error);
      throw new Error('Falha ao verificar status do pagamento');
    }
  },
  
  /**
   * Gera uma nota fiscal para um pagamento
   */
  async generateInvoice(paymentId: string, fiscalData: FiscalData): Promise<any> {
    try {
      // Buscar dados do pagamento
      const { data: paymentData, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('payment_id', paymentId)
        .single();
      
      if (error || !paymentData) throw new Error('Pagamento não encontrado');
      if (paymentData.status !== 'COMPLETED') throw new Error('Pagamento ainda não foi concluído');
      
      // Gerar nota fiscal via serviço externo
      const response = await axios.post(
        `${PAYMENT_API_URL}/invoices`,
        {
          reference_id: paymentId,
          customer: {
            name: paymentData.customer_name,
            email: paymentData.customer_email,
            tax_id: fiscalData.document,
            address: fiscalData.address
          },
          items: fiscalData.items || [
            {
              description: paymentData.description,
              quantity: 1,
              unit_price: paymentData.amount
            }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${PAYMENT_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Atualizar registro com informações fiscais
      await supabase
        .from('payment_transactions')
        .update({
          invoice_id: response.data.invoice_id,
          invoice_url: response.data.invoice_url,
          fiscal_data: fiscalData
        })
        .eq('payment_id', paymentId);
      
      return {
        invoiceId: response.data.invoice_id,
        invoiceUrl: response.data.invoice_url
      };
    } catch (error) {
      console.error(`Erro ao gerar nota fiscal para o pagamento ${paymentId}:`, error);
      throw error;
    }
  },
  
  /**
   * Processa webhooks de notificação de pagamento
   */
  async processWebhook(payload: any): Promise<void> {
    try {
      const { reference_id, status } = payload;
      
      // Atualizar status no nosso banco
      await supabase
        .from('payment_transactions')
        .update({ 
          status,
          webhook_received_at: new Date().toISOString(),
          webhook_data: payload
        })
        .eq('payment_id', reference_id);
      
      // Se o pagamento foi confirmado, atualizar o status do participante
      if (status === 'COMPLETED') {
        // Buscar a transação de pagamento
        const { data: paymentTransaction, error } = await supabase
          .from('payment_transactions')
          .select('*')
          .eq('payment_id', reference_id)
          .single();
        
        if (error || !paymentTransaction) throw new Error('Transação não encontrada');
        
        // Se estiver associado a um participante, atualizar seu status
        if (paymentTransaction.participant_id) {
          await supabase
            .from('participants')
            .update({
              payment_status: 'CONFIRMED',
              payment_id: reference_id,
              payment_date: new Date().toISOString()
            })
            .eq('id', paymentTransaction.participant_id);
        }
      }
    } catch (error) {
      console.error('Erro ao processar webhook de pagamento:', error);
      throw error;
    }
  }
};

export default PaymentGatewayService;
