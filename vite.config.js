import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  // El museo es una página aparte (pantalla completa, scroll propio): se sirve en /museo/
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        museo: resolve(__dirname, 'museo/index.html'),
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
