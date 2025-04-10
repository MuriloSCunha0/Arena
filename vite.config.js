import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/Arena/', // Ajustado para o caminho correto do repositório
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Removido minify: 'terser' para usar o minificador padrão
    sourcemap: false,
  }
})
