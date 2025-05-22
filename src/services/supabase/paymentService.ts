import { supabase } from '../../lib/supabase';

export const PaymentService = {
  // Gerar informações de pagamento PIX para um participante
  async generatePixPayment(participantId: string, eventId: string): Promise<{ 
    pixQrcodeUrl: string,
    pixPaymentCode: string,
    paymentId: string,
    amount: number
  }> {
    try {
      // Obter dados do evento para o valor e organizador
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('price, organizers(pix_key)')
        .eq('id', eventId)
        .single();
        
      if (eventError || !event) throw new Error('Evento não encontrado');
      
      const amount = event.price || 0;
      // Corrigir acesso à chave PIX do organizador (organizers é um array)
      const pixKey = event.organizers?.[0]?.pix_key;
      
      if (!pixKey) throw new Error('Chave PIX do organizador não encontrada');
      
      // Inserir registro de transação financeira
      const { data: transaction, error: transactionError } = await supabase
        .from('financial_transactions')
        .insert({
          event_id: eventId,
          participant_id: participantId,
          amount: amount,
          type: 'INCOME',
          description: 'Inscrição em evento',
          payment_method: 'PIX',
          status: 'PENDING',
          transaction_date: new Date().toISOString()
        })
        .select()
        .single();
        
      if (transactionError) throw transactionError;
      
      // Em um ambiente real, aqui chamaria uma API de pagamento para gerar QR code
      // Como exemplo, usaremos a tabela pix_codes para armazenar os dados
      const paymentId = transaction.id;
      const paymentCode = `${pixKey.substring(0, 6)}${paymentId.substring(0, 8)}`;
      
      // Obter URL do QR Code, que em produção seria gerada por API
      const { data: pixData, error: pixError } = await supabase
        .from('pix_codes')
        .insert({
          participant_id: participantId,
          event_id: eventId,
          transaction_id: paymentId,
          pix_key: pixKey,
          amount: amount,
          status: 'PENDING',
          expiration_date: new Date(Date.now() + 24*60*60*1000).toISOString() // Validade: 24h
        })
        .select()
        .single();
      
      if (pixError) throw pixError;
      
      // Atualizar o participante com os dados do pagamento
      await supabase
        .from('participants')
        .update({
          payment_id: paymentId,
          pix_payment_code: paymentCode,
          pix_qrcode_url: pixData.qrcode_url || await generateQrCodeUrl(paymentCode, amount),
          payment_transaction_id: transaction.id
        })
        .eq('id', participantId);
      
      return {
        pixQrcodeUrl: pixData.qrcode_url || await generateQrCodeUrl(paymentCode, amount),
        pixPaymentCode: paymentCode,
        paymentId,
        amount
      };
    } catch (error) {
      console.error('Error generating PIX payment:', error);
      throw error;
    }
  },
  
  // Confirmar pagamento de participante
  async confirmPayment(participantId: string, transactionId: string): Promise<void> {
    try {
      // Atualizar status do participante
      await supabase
        .from('participants')
        .update({
          payment_status: 'CONFIRMED',
          payment_date: new Date().toISOString()
        })
        .eq('id', participantId);
      
      // Atualizar status da transação
      await supabase
        .from('financial_transactions')
        .update({
          status: 'CONFIRMED',
          transaction_date: new Date().toISOString()
        })
        .eq('id', transactionId);
        
      // Atualizar registro PIX
      await supabase
        .from('pix_codes')
        .update({
          status: 'CONFIRMED',
          payment_date: new Date().toISOString()
        })
        .eq('transaction_id', transactionId);
        
    } catch (error) {
      console.error('Error confirming payment:', error);
      throw error;
    }
  },
  
  // Função para verificar pendências de pagamento
  async checkPendingPayments(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('participants')
        .select(`
          id, 
          event_id, 
          payment_status, 
          payment_id,
          events(title, date, price)
        `)
        .eq('user_id', userId)
        .eq('payment_status', 'PENDING');
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error checking pending payments:', error);
      throw error;
    }
  }
};

// Função auxiliar para gerar URL do QR Code (em produção seria substituída por chamada à API)
async function generateQrCodeUrl(code: string, amount: number): Promise<string> {
  try {
    // Em ambiente de produção, esta função chamaria uma API externa
    // Como fallback para desenvolvimento, armazenaremos o URL gerado no storage
    
    // Verificar se já existe um QR code gerado para este código
    const { data: existingQrCode } = await supabase
      .from('pix_codes')
      .select('qrcode_url')
      .eq('pix_key', code)
      .maybeSingle();
      
    if (existingQrCode?.qrcode_url) {
      return existingQrCode.qrcode_url;
    }
    
    // Em ambiente real, a geração do QR code seria via API
    // Para desenvolvimento, usamos um identificador único no storage
    const qrCodeId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const filePath = `payment-qrcodes/${qrCodeId}.png`;
    
    // Neste ponto, em produção, enviaria os dados do pagamento para API
    // e receberia o QR code como resposta
    
    // Para ambiente de desenvolvimento, vamos salvar este caminho como URL do QR code
    const { data: publicUrlData } = await supabase
      .storage
      .from('public')
      .getPublicUrl(filePath);
      
    const qrCodeUrl = publicUrlData.publicUrl;
    
    // Em produção, aqui atualizaríamos a tabela com a URL recebida da API
    await supabase
      .from('pix_codes')
      .update({ qrcode_url: qrCodeUrl })
      .eq('pix_key', code);
      
    return qrCodeUrl;
  } catch (error) {
    console.error('Error generating QR code URL:', error);
    // Em caso de falha, retornar URL genérica que indica erro
    return '/assets/images/qrcode-error.png';
  }
}
