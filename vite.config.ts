import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/Arena/', // This should match your GitHub repo name exactly
  build: {
    // Add source maps for better debugging
    sourcemap: true,
    // Improve error handling
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress certain warnings
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        warn(warning);
      }
    }
  }
});
