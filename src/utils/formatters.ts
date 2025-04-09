/**
 * Utilitários para formatação de dados na aplicação
 */

/**
 * Formata um valor para moeda brasileira
 */
export const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

/**
 * Formata data e hora para o formato brasileiro
 */
export const formatDateTime = (dateString: string): string => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  return date.toLocaleString('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Formata apenas a data para o formato brasileiro
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  return date.toLocaleDateString('pt-BR');
};

/**
 * Formata um número de telefone para o padrão brasileiro
 */
export const formatPhone = (phone: string): string => {
  if (!phone) return '';
  
  // Remove caracteres não numéricos
  const cleaned = phone.replace(/\D/g, '');
  
  // Verifica o tamanho para determinar o formato
  if (cleaned.length === 11) {
    // Celular: (xx) xxxxx-xxxx
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
  } else if (cleaned.length === 10) {
    // Fixo: (xx) xxxx-xxxx
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
  }
  
  // Retorna o valor original se não conseguir formatar
  return phone;
};

/**
 * Format payment method to display format
 */
export const formatPaymentMethod = (method: string): string => {
  const methods: Record<string, string> = {
    PIX: 'PIX',
    CARD: 'Cartão',
    CASH: 'Dinheiro',
    OTHER: 'Outro'
  };
  
  return methods[method] || method;
};

/**
 * Format payment status to display format
 */
export const formatPaymentStatus = (status: string): string => {
  const statuses: Record<string, string> = {
    PENDING: 'Pendente',
    CONFIRMED: 'Confirmado',
    CANCELLED: 'Cancelado'
  };
  
  return statuses[status] || status;
};

/**
 * Format a percentage value with fixed decimal places
 */
export const formatPercentage = (value: number, decimalPlaces: number = 1): string => {
  return `${value.toFixed(decimalPlaces)}%`;
};

/**
 * Formata uma data no formato amigável em português brasileiro
 */
export const formattedDate = (dateString: string | Date): string => {
  if (!dateString) return '';
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Formata um valor numérico como moeda (R$)
 */
export const formattedCurrency = (value: number | string): string => {
  if (value === null || value === undefined) return '';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(numValue);
};

/**
 * Formata um timestamp para formato de hora
 */
export const formattedTime = (timeString: string): string => {
  if (!timeString) return '';
  
  // Se for um timestamp completo, extrair apenas a parte da hora
  if (timeString.includes('T')) {
    const date = new Date(timeString);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // Se for apenas uma string de hora (HH:MM:SS)
  if (timeString.includes(':')) {
    const parts = timeString.split(':');
    return `${parts[0]}:${parts[1]}`;
  }
  
  return timeString;
};

/**
 * Formata um número de telefone brasileiro
 */
export const formattedPhone = (phone: string): string => {
  if (!phone) return '';
  
  // Remove caracteres não numéricos
  const numbersOnly = phone.replace(/\D/g, '');
  
  if (numbersOnly.length === 11) {
    // Celular: (XX) X XXXX-XXXX
    return numbersOnly.replace(/^(\d{2})(\d)(\d{4})(\d{4})$/, '($1) $2 $3-$4');
  } else if (numbersOnly.length === 10) {
    // Fixo: (XX) XXXX-XXXX
    return numbersOnly.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  }
  
  return phone;
};
