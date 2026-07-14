import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// En local y en el dominio propio no hace falta subruta ('/'). El workflow
// de GitHub Pages (.github/workflows/deploy.yml) la pasa como
// VITE_BASE_PATH=/kalo/ porque Pages sirve el proyecto bajo /<repo>/, no en
// la raíz del dominio.
const base = process.env.VITE_BASE_PATH || '/'
const iconPath = (path: string) => `${base}${path}`.replace(/\/{2,}/g, '/')

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      // Solo cachea el app shell (JS/CSS/HTML/iconos) para que la instalación
      // y la carga inicial sean instantáneas. Sin runtimeCaching: los datos
      // (auth, Realtime, Edge Functions de Supabase) siempre van a red, nunca
      // se sirven de caché — esta app no tiene sentido "offline".
      // start_url/scope no se fijan aquí a propósito: el plugin los calcula
      // solos a partir de `base` (ver resolveBasePath en su código fuente).
      manifest: {
        name: 'Kalo — calorie tracker',
        short_name: 'Kalo',
        description:
          'Registra comida al vuelo por texto o foto, sin pesar nada.',
        lang: 'es',
        display: 'standalone',
        background_color: '#f6f2ff',
        theme_color: '#16a34a',
        icons: [
          {
            src: iconPath('icons/icon-192.png'),
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: iconPath('icons/icon-512.png'),
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: iconPath('icons/icon-512-maskable.png'),
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
