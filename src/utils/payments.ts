/**
 * Determina o método de pagamento baseado no ID do pagamento
 */
export const getPaymentMethodFromId = (paymentId?: string): 'PIX' | 'CARD' | 'CASH' | 'OTHER' => {
  if (!paymentId) return 'OTHER';
  
  if (paymentId.toLowerCase().startsWith('pix_')) {
    return 'PIX';
  } else if (paymentId.toLowerCase().startsWith('card_')) {
    return 'CARD';
  } else if (paymentId.toLowerCase().startsWith('cash_')) {
    return 'CASH';
  }
  
  return 'OTHER';
};

/**
 * Formata uma descrição para transação financeira
 */
export const formatPaymentDescription = (type: string, participantName: string): string => {
  switch (type) {
    case 'REGISTRATION':
      return `Inscrição - ${participantName}`;
    case 'ADDITIONAL':
      return `Pagamento adicional - ${participantName}`;
    case 'REFUND':
      return `Reembolso - ${participantName}`;
    default:
      return `Pagamento - ${participantName}`;
  }
};
