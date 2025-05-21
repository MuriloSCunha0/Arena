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
    // Adicionar opções adicionais que são suportadas pela versão do Supabase que você está usando
    // As opções storageKey e flowType podem não estar disponíveis em versões mais antigas
  }
});

// Função para verificar e renovar o token automaticamente
export const refreshSession = async () => {
  try {
    // Primeiro verificar se temos uma sessão
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error checking session:', error);
      return null;
    }
    
    // Se temos uma sessão, verificar se precisa renovar
    if (data?.session) {
      const expiresAt = data.session.expires_at;
      const now = Math.floor(Date.now() / 1000); // Tempo atual em segundos
      
      // Se o token expira em breve (menos de 10 minutos) ou já expirou
      if (!expiresAt || expiresAt - now < 600) {
        console.log('Token precisa ser renovado (expira em:', expiresAt ? `${expiresAt - now}s` : 'N/A', ')');
        
        try {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            console.error('Error refreshing token:', refreshError);
          } else if (refreshData?.session) {
            console.log('Token renovado com sucesso, nova expiração em:', 
              refreshData.session.expires_at ? 
              `${refreshData.session.expires_at - Math.floor(Date.now() / 1000)}s` : 'N/A');
            
            return refreshData.session;
          }
        } catch (refreshErr) {
          console.error('Exception during token refresh:', refreshErr);
        }
      } else {
        console.log('Token ainda é válido, expira em:', expiresAt - now, 'segundos');
      }
      
      return data.session;
    }
    
    console.log('Nenhuma sessão encontrada para renovar');
    return null;
  } catch (err) {
    console.error('Exception in refreshSession:', err);
    return null;
  }
};

// Função de debug para verificar o estado da autenticação
export const debugAuth = async () => {
  try {
    console.log('=== Auth debugging ===');
    
    // Verificar se temos uma sessão
    const { data: sessionData } = await supabase.auth.getSession();
    console.log('Current session:', sessionData?.session ? 'EXISTS' : 'NOT FOUND');
    
    // Verificar o usuário atual
    const { data: userData } = await supabase.auth.getUser();
    console.log('Current user:', userData?.user ? 'LOGGED IN' : 'NOT LOGGED IN');
    
    if (sessionData?.session) {
      const expiresAt = sessionData.session.expires_at;
      const now = Math.floor(Date.now() / 1000);
      console.log(`Token expires in: ${expiresAt ? expiresAt - now : 'N/A'} seconds`);
    }
    
    return { success: true };
  } catch (err) {
    console.error('Error during auth debugging:', err);
    return { success: false, error: err };
  }
};