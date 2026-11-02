import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// En dev/preview el fallback SPA de Vite sirve el index.html raíz: sin esto, recargar
// /nexplay/admin cargaría Playus. En producción lo resuelve vercel.json.
const nexplayFallback = {
  name: 'nexplay-fallback',
  configureServer(server) { server.middlewares.use(reescribirNexplay) },
  configurePreviewServer(server) { server.middlewares.use(reescribirNexplay) },
}
function reescribirNexplay(req, _res, next) {
  const path = req.url.split('?')[0]
  if (/^\/nexplay(\/|$)/.test(path) && !/\.[a-z0-9]+$/i.test(path)) {
    req.url = '/nexplay/index.html' + req.url.slice(path.length)
  }
  next()
}

export default defineConfig({
  plugins: [react(), nexplayFallback],
  // El museo es una página aparte (pantalla completa, scroll propio): se sirve en /museo/
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        museo: resolve(__dirname, 'museo/index.html'),
        nexplay: resolve(__dirname, 'nexplay/index.html'),
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
