import { createClient } from '@supabase/supabase-js'

// Verificar se as variáveis de ambiente estão sendo lidas corretamente
console.log('SUPABASE URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('SUPABASE KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Existe' : 'Não existe')

// Usar valores de fallback se as variáveis de ambiente não estiverem disponíveis
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zgtjtmlzkcmxibhmclpc.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpndGp0bWx6a2NteGliaG1jbHBjIiwicm9zZSI6ImFub24iLCJpYXQiOjE3NDM5NzgwMDMsImV4cCI6MjA1OTU1NDAwM30.HZlpCrlM2-hLl3VOM0ClZDTGSMzdPXNbSefmJqxuFUo'

// Define common headers we want to use globally
const globalHeaders = {
  'Accept': 'application/json',
  'Content-Type': 'application/json' // Add Content-Type globally
};

// Create Supabase client with proper global configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: globalHeaders // Apply global headers
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'arena-auth', // Custom storage key for better identification
    storage: localStorage // Explicitly use localStorage for auth persistence
  }
});

// Function to debug auth state
export const debugAuth = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    console.log('Current auth session:', data.session);
    
    if (data.session?.user) {
      console.log('User ID:', data.session.user.id);
      console.log('User email:', data.session.user.email);
      console.log('User metadata:', data.session.user.user_metadata);
    } else {
      console.log('No active session found');
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Auth debugging failed:', error);
    return { success: false, error };
  }
};

// Add connection status check
export const checkSupabaseConnection = async () => {
  try {
    // Global headers are applied automatically
    const { data, error } = await supabase
      .from('events')
      .select('id')
      .limit(1);
      
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Supabase connection failed:', error);
    return { success: false, error };
  }
};

// Remove the enhancedQuery helper as it's replaced by supabaseApi in supabaseHelpers.ts
// export const enhancedQuery = { ... };