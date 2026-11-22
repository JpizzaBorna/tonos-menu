import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'node:path'

// base './' so the built menu runs from any folder or host (iPad home-screen web app).
// host: true lets an iPad on the same Wi-Fi open the dev / preview server.
//
// Two pages: the guest menu (index.html) and the admin panel (admin/index.html → tonos.website/admin/).
//
// Offline: the PWA plugin writes a service worker that, on the first visit, saves the app itself
// (code, fonts, logo, background, intro sound, icons — a few MB) so the menu opens with no internet.
// The ~240 menu photos are then saved one by one in the background by src/offline.ts (most important
// first, resumes after a dropped connection) and served from the "tonos-media" cache below. The live menu published from the admin panel and any
// photos uploaded there are saved as they are fetched, so they work offline too.
// The admin panel is never cached: it must always talk to the live database.
const SUPABASE = 'https://iswslfdaeoaxgithwezm.supabase.co'

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
        orientation: 'any',
        background_color: '#0b2230',
        theme_color: '#0b2230',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // precache the app itself: code, styles, Latin fonts, icons, sound, and the small decoration pictures
        // (logo, glass, background, garnish). Menu photos are saved separately, see offline.ts.
        globPatterns: ['**/*.{js,css,html,png,svg,woff2,mp3,m4a,json}', 'media/{logo,glass,bg,deco}-*.webp'],
        globIgnores: ['ipad.html', 'admin/**', 'assets/admin-*', 'assets/*-{latin-ext,cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*'],
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/\/admin/],
        runtimeCaching: [
          {
            // menu photos built into the app: saved once, then always shown from the device (instant, works offline)
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.includes('/media/'),
            handler: 'CacheFirst',
            options: { cacheName: 'tonos-media', cacheableResponse: { statuses: [200] } },
          },
          {
            // the published menu: always try for the newest, fall back to the saved copy when offline / slow
            urlPattern: ({ url }) => url.origin === SUPABASE && url.pathname.startsWith('/rest/v1/tonos_menu'),
            handler: 'NetworkFirst',
            options: { cacheName: 'tonos-live-menu', networkTimeoutSeconds: 3, cacheableResponse: { statuses: [200] } },
          },
          {
            // photos uploaded in the admin panel (new file name for every upload, so they never change)
            urlPattern: ({ url }) => url.origin === SUPABASE && url.pathname.startsWith('/storage/v1/object/public/tonos-photos/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'tonos-photos',
              expiration: { maxEntries: 800, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  base: './',
  build: {
    rollupOptions: {
      input: { main: resolve(__dirname, 'index.html'), admin: resolve(__dirname, 'admin/index.html') },
    },
  },
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
})
