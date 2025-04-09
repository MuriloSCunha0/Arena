import { createClient } from '@supabase/supabase-js';

// GitHub Pages fallback config
const GITHUB_PAGES_SUPABASE_URL = 'https://your-supabase-project-id.supabase.co';
const GITHUB_PAGES_ANON_KEY = 'your-public-anon-key-safe-to-expose';

// Use environment variables with fallbacks for GitHub Pages
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || GITHUB_PAGES_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || GITHUB_PAGES_ANON_KEY;

// Add robust error handling
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials missing. Please check your environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Add connection status check
export const checkSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('events').select('id').limit(1);
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Supabase connection failed:', error);
    return { success: false, error };
  }
};