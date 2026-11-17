import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// base './' so the built menu runs from any folder or host (iPad home-screen web app).
// host: true lets an iPad on the same Wi-Fi open the dev / preview server.
//
// Offline: the PWA plugin writes a service worker that, on the first visit, downloads and keeps
// EVERYTHING the menu needs (app code, all photos, fonts, the intro sound, icons). After that the
// menu opens and works with no internet at all. When a new version is published it updates itself
// in the background on the next visit while online.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icons/*.png', 'sound/*'],
      manifest: {
        name: 'Tonos Greek Restaurant – Menu',
        short_name: 'Tonos Menu',
        description: 'Tonos Greek Restaurant digital menu',
        start_url: './',
        scope: './',
        display: 'fullscreen',
        orientation: 'portrait',
        background_color: '#0b2230',
        theme_color: '#0b2230',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // precache every file of the built menu, photos included
        globPatterns: ['**/*.{js,css,html,webp,png,jpg,jpeg,svg,woff2,mp3,m4a,json}'],
        globIgnores: ['ipad.html'],
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
      },
    }),
  ],
  base: './',
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
})
