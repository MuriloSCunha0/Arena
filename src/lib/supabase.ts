import { createClient } from '@supabase/supabase-js'

// Obtenha as variáveis de ambiente para o Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Crie o cliente Supabase com persistência de sessão
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storage: localStorage, // Use localStorage para persistir a sessão
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'implicit'
  }
});

// Função para verificar e renovar o token automaticamente
export const refreshSession = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Erro ao verificar sessão:', error);
      return null;
    }
    
    if (data?.session) {
      // Verificar se o token está prestes a expirar (menos de 10 minutos)
      const expiresAt = data.session.expires_at;
      const now = Math.floor(Date.now() / 1000);
      
      if (expiresAt && expiresAt - now < 600) {
        console.log('Token prestes a expirar, renovando...');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('Erro ao renovar token:', refreshError);
          return data.session;
        }
        
        return refreshData.session;
      }
      
      return data.session;
    }
    
    return null;
  } catch (err) {
    console.error('Erro ao renovar sessão:', err);
    return null;
  }
};

// Função de debug para verificar o estado da autenticação
export const debugAuth = async () => {
  try {
    console.log('=== Depuração de Autenticação ===');
    
    // Verificar se temos uma sessão
    const { data: sessionData } = await supabase.auth.getSession();
    console.log('Sessão atual:', sessionData?.session ? 'EXISTENTE' : 'NÃO ENCONTRADA');
    
    // Verificar o usuário atual
    const { data: userData } = await supabase.auth.getUser();
    console.log('Usuário atual:', userData?.user ? 'CONECTADO' : 'NÃO CONECTADO');
    
    if (sessionData?.session) {
      const expiresAt = sessionData.session.expires_at;
      const now = Math.floor(Date.now() / 1000);
      console.log(`Token expira em: ${expiresAt ? expiresAt - now : 'N/A'} segundos`);
    }
    
    return { success: true };
  } catch (err) {
    console.error('Erro durante depuração de autenticação:', err);
    return { success: false, error: err };
  }
};

// Função para mapear mensagens de erro do Supabase para português
export const traduzirErroSupabase = (erro: any): string => {
  // Se não houver erro, retorna vazio
  if (!erro) return '';
  
  // Verificar o código de erro
  const codigo = erro.code;
  const mensagem = erro.message || '';
  
  // Mapeamento de erros comuns
  const mensagensErro: Record<string, string> = {
    // Erros de autenticação
    'auth/invalid-email': 'Endereço de e-mail inválido',
    'auth/user-disabled': 'Esta conta foi desativada',
    'auth/user-not-found': 'Usuário não encontrado',
    'auth/wrong-password': 'Senha incorreta',
    'auth/email-already-in-use': 'Este e-mail já está sendo utilizado',
    'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres',
    'auth/too-many-requests': 'Muitas tentativas de login. Tente novamente mais tarde',
    
    // Erros de banco de dados
    '23505': 'Este registro já existe (violação de unicidade)',
    '23503': 'Não é possível realizar esta operação devido a restrições de relacionamento',
    '23514': 'Os dados fornecidos não atendem às regras de validação',
    '42P01': 'Tabela não encontrada',
    '42703': 'Coluna não encontrada',
    
    // Erros específicos de validação
    'users_cpf_format': 'O CPF informado está em um formato inválido. Use o formato xxx.xxx.xxx-xx',
    'users_phone_format': 'O telefone informado está em um formato inválido. Use o formato (xx) xxxxx-xxxx',
    
    // Erros gerais
    'PGRST116': 'Registro não encontrado',
    'PGRST301': 'Não foi possível acessar os dados (verifique permissões)',
    'not_found': 'Recurso não encontrado',
    'invalid_request': 'Solicitação inválida',
    'unauthorized': 'Não autorizado',
    
    // Novo: Erro 406 específico
    '406': 'Erro de acesso aos dados. Verifique as permissões de segurança da tabela.'
  };
  
  // Verificar por correspondência parcial nos erros específicos
  for (const [chave, traducao] of Object.entries(mensagensErro)) {
    if (mensagem.includes(chave)) {
      return traducao;
    }
  }
  
  // Verificar se temos uma tradução exata para o código
  if (codigo && mensagensErro[codigo]) {
    return mensagensErro[codigo];
  }
  
  // Se não tiver tradução, retorna a mensagem original ou um padrão
  return mensagem || 'Ocorreu um erro inesperado';
};

// Função auxiliar para tratamento de erros Supabase
export const tratarErroSupabase = (erro: any, operacao: string = ''): Error => {
  console.error(`Erro ao ${operacao}:`, erro);
  const mensagemTraduzida = traduzirErroSupabase(erro);
  return new Error(mensagemTraduzida);
};

// Função auxiliar para tratamento de erros Supabase específicos para erro 406
export const tratarErro406 = (erro: any, operacao: string = ''): Error => {
  console.error(`Erro 406 ao ${operacao}:`, erro);
  const mensagem = 'Erro de acesso aos dados. Verifique se você tem permissão para acessar este recurso.';
  return new Error(mensagem);
};