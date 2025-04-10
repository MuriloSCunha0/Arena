import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Usar caminho relativo para todos os assets
  build: {
    outDir: 'dist',
    // Configuração adicional para garantir que os arquivos são servidos corretamente
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        entryFileNames: 'main.js', // Nome fixo para o arquivo principal
        chunkFileNames: '[name].[hash].js',
        assetFileNames: '[name].[ext]', // Manter nomes originais para assets
      }
    }
  }
})
