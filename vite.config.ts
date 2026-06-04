import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/SAE_Syntax_Generator/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      manifest: {
        name: 'SAE Syntax Generator',
        short_name: 'SAE Generator',
        description:
          'Expert system for small area estimation method recommendation and script generation.',
        theme_color: '#1e40af',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/SAE_Syntax_Generator/',
        start_url: '/SAE_Syntax_Generator/',
        icons: [
          {
            src: 'icons/icon-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache all build assets — workbox serves these CacheFirst by default.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        // For HTML navigation requests: try network first, fall back to cached shell.
        navigateFallback: '/SAE_Syntax_Generator/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /\.(?:js|css|svg|png|ico|webmanifest)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
