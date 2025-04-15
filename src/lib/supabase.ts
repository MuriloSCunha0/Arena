import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

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
    autoRefreshToken: true
  }
});

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