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
    flowType: 'implicit' // Adicione esta linha
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