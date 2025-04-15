import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  // Validate required environment variables
  if (!env.VITE_SUPABASE_URL) {
    console.warn('\x1b[33m%s\x1b[0m', 'Warning: VITE_SUPABASE_URL environment variable is missing. Make sure you have a .env file with this variable set.');
  }
  if (!env.VITE_SUPABASE_ANON_KEY) {
    console.warn('\x1b[33m%s\x1b[0m', 'Warning: VITE_SUPABASE_ANON_KEY environment variable is missing. Make sure you have a .env file with this variable set.');
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    // Ensure environment variables are properly loaded
    define: {
      // Make sure Vite replaces these at build time
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ''),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || '')
    }
  };
});
