/// <reference types="vitest" />
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],

        // --- Phase 2: Enhanced Workbox for Offline-First ---
        workbox: {
          // Pre-cache all static assets (JS, CSS, HTML, fonts)
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff,ttf}'],
          // Runtime caching strategies
          runtimeCaching: [
            // Cache Google Fonts
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }, // 1 year
                cacheableResponse: { statuses: [0, 200] }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] }
              }
            },
            // Cache images
            {
              urlPattern: /\.(?:png|gif|jpg|jpeg|svg|webp)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-cache',
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 }, // 30 days
              }
            },
            // Network-first for API calls (Gemini AI, Firebase)
            {
              urlPattern: /^https:\/\/generativelanguage\.googleapis\.com\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'gemini-api-cache',
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 }, // 1 day
                networkTimeoutSeconds: 10, // fallback to cache after 10s
                cacheableResponse: { statuses: [0, 200] }
              }
            },
            {
              urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'firestore-cache',
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
                networkTimeoutSeconds: 10,
                cacheableResponse: { statuses: [0, 200] }
              }
            }
          ],
          // Clean old caches on update
          cleanupOutdatedCaches: true,
          // Skip waiting so new SW activates immediately
          skipWaiting: true,
          clientsClaim: true,
        },

        manifest: {
          name: 'ParsaPlan - برنامه ریزی هوشمند',
          short_name: 'ParsaPlan',
          description: 'برنامه ریزی جامع، هوشمند و آفلاین برای موفقیت در کنکور',
          theme_color: '#4f46e5',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',

          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ],

          // PWA shortcuts for quick access
          shortcuts: [
            {
              name: 'افزودن تسک جدید',
              short_name: 'تسک جدید',
              url: '/#/subjects',
              icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
            },
            {
              name: 'داشبورد',
              short_name: 'داشبورد',
              url: '/#/',
              icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
            }
          ],

          // Categories for app store listing
          categories: ['education', 'productivity']
        }
      })
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
