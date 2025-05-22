/**
 * Utilitários para formatação de dados na aplicação
 */

/**
 * Formata um valor para moeda brasileira
 */
export const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Formata data e hora para o formato brasileiro
 */
export const formatDateTime = (dateTime: string | Date | null): string => {
  if (!dateTime) return '';
  
  try {
    const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
    
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch {
    return '';
  }
};

/**
 * Formata apenas a data para o formato brasileiro
 */
export const formatDate = (date: string | Date | null): string => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(dateObj);
  } catch {
    return '';
  }
};

/**
 * Formata um número de telefone para o padrão brasileiro
 */
export const formatPhone = (phone: string | null): string => {
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
 * Format payment method to display format based on database enum
 */
export const formatPaymentMethod = (method: string | null): string => {
  if (!method) return '';
  
  const methods: Record<string, string> = {
    'PIX': 'PIX',
    'CARD': 'Cartão',
    'CASH': 'Dinheiro',
    'OTHER': 'Outro'
  };
  
  return methods[method] || method;
};

/**
 * Format payment status to display format based on database enum
 */
export const formatPaymentStatus = (status: string | null): string => {
  if (!status) return '';
  
  const statuses: Record<string, string> = {
    'PENDING': 'Pendente',
    'CONFIRMED': 'Confirmado',
    'CANCELLED': 'Cancelado'
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
export const formattedCurrency = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '') return 'R$ 0,00';
  
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
    return numbersOnly.replace(/^(\d{2})(\d{1})(\d{4})(\d{4})$/, '($1) $2 $3-$4');
  } else if (numbersOnly.length === 10) {
    // Fixo: (XX) XXXX-XXXX
    return numbersOnly.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  }
  
  return phone;
};

/**
 * Formata um valor de tempo para o formato HH:MM
 */
export const formatTime = (time: string): string => {
  if (!time) return '';
  
  return time.substring(0, 5); // Pegando apenas HH:MM
};

/**
 * Formata um enum de transaction_type do banco de dados
 */
export const formatTransactionType = (type: string | null): string => {
  if (!type) return '';
  
  const types: Record<string, string> = {
    'INCOME': 'Receita',
    'EXPENSE': 'Despesa'
  };
  
  return types[type] || type;
};

/**
 * Formata um enum de event_status do banco de dados
 */
export const formatEventStatus = (status: string | null): string => {
  if (!status) return '';
  
  const statuses: Record<string, string> = {
    'SCHEDULED': 'Agendado',
    'ONGOING': 'Em Andamento',
    'COMPLETED': 'Concluído',
    'CANCELLED': 'Cancelado'
  };
  
  return statuses[status] || status;
};

/**
 * Formata um enum de tournament_status do banco de dados
 */
export const formatTournamentStatus = (status: string | null): string => {
  if (!status) return '';
  
  const statuses: Record<string, string> = {
    'CREATED': 'Criado',
    'STARTED': 'Iniciado',
    'FINISHED': 'Finalizado',
    'CANCELLED': 'Cancelado'
  };
  
  return statuses[status] || status;
};

/**
 * Formata CPF para o padrão brasileiro (XXX.XXX.XXX-XX)
 */
export const formatCPF = (cpf: string | null): string => {
  if (!cpf) return '';
  
  // Remove caracteres não numéricos
  const cleaned = cpf.replace(/\D/g, '');
  
  // Se não tiver o tamanho correto, retorna como está
  if (cleaned.length !== 11) return cpf;
  
  // Formata no padrão XXX.XXX.XXX-XX
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};
