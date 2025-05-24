/**
 * Função para validar CPF no formato brasileiro
 * 
 * @param cpf O CPF a ser validado (pode incluir pontuação)
 * @returns true se o CPF é válido, false caso contrário
 */
export function validateCPF(cpf: string): boolean {
  // Se for null, undefined ou string vazia
  if (!cpf) return false;
  
  // Remove caracteres não numéricos
  cpf = cpf.replace(/[^\d]/g, '');

  // Verifica se tem 11 dígitos
  if (cpf.length !== 11) return false;

  // Verifica se todos os dígitos são iguais (caso inválido)
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  
  let remainder = 11 - (sum % 11);
  let digit1 = remainder === 10 || remainder === 11 ? 0 : remainder;
  
  if (digit1 !== parseInt(cpf.charAt(9))) return false;

  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  
  remainder = 11 - (sum % 11);
  let digit2 = remainder === 10 || remainder === 11 ? 0 : remainder;
  
  if (digit2 !== parseInt(cpf.charAt(10))) return false;

  return true;
}

/**
 * Formata um CPF adicionando a pontuação padrão (XXX.XXX.XXX-XX)
 * 
 * @param cpf O CPF a ser formatado
 * @returns O CPF formatado com pontuação
 */
export function formatCPF(cpf: string): string {
  // Remove caracteres não numéricos
  cpf = cpf.replace(/[^\d]/g, '');
  
  // Limita a 11 dígitos
  cpf = cpf.substring(0, 11);
  
  // Adiciona a formatação
  if (cpf.length <= 3) {
    return cpf;
  } else if (cpf.length <= 6) {
    return `${cpf.substring(0, 3)}.${cpf.substring(3)}`;
  } else if (cpf.length <= 9) {
    return `${cpf.substring(0, 3)}.${cpf.substring(3, 6)}.${cpf.substring(6)}`;
  } else {
    return `${cpf.substring(0, 3)}.${cpf.substring(3, 6)}.${cpf.substring(6, 9)}-${cpf.substring(9)}`;
  }
}

/**
 * Formata um número de telefone brasileiro
 * 
 * @param phone O número de telefone a ser formatado
 * @returns O telefone formatado (XX) XXXXX-XXXX
 */
export const formatPhone = (phone: string): string => {
  // Remove todos os caracteres não numéricos
  const phoneDigits = phone.replace(/\D/g, '');
  
  // Aplicar a formatação (xx) xxxxx-xxxx
  if (phoneDigits.length <= 2) {
    return `(${phoneDigits}`;
  } else if (phoneDigits.length <= 7) {
    return `(${phoneDigits.slice(0, 2)}) ${phoneDigits.slice(2)}`;
  } else {
    return `(${phoneDigits.slice(0, 2)}) ${phoneDigits.slice(2, 7)}-${phoneDigits.slice(7, 11)}`;
  }
};
