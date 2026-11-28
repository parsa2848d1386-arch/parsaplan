/// <reference types="vitest" />
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(() => {
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true as const,
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/icon.svg', 'apple-touch-icon.png', 'masked-icon.svg'],

        // --- Phase 2: Enhanced Workbox for Offline-First ---
        workbox: {
          // Pre-cache all static assets (JS, CSS, HTML, fonts)
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff,ttf}'],
          navigateFallbackDenylist: [/^\/api\//],
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
            // Never cache personal AI prompts or health checks in SW cache
            {
              urlPattern: /^\/api\/.*/i,
              handler: 'NetworkOnly',
            }
          ],
          // Clean old caches on update
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
        },

        manifest: {
          name: 'ParsaPlan - برنامه ریزی هوشمند',
          short_name: 'ParsaPlan',
          description: 'دستیار جامع، هوشمند و آفلاین برای برنامه‌ریزی زندگی، کار، پروژه‌ها، عادت‌ها و یادگیری',
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
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
      testTimeout: 20000,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      target: 'es2022',
      sourcemap: 'hidden' as const,
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunks — each loaded on demand
            'vendor-router': ['react-router-dom'],
            'vendor-icons': ['lucide-react'],
            'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
            'vendor-firebase-app': ['firebase/app'],
            'vendor-firebase-auth': ['firebase/auth'],
            'vendor-firebase-db': ['firebase/firestore'],
            'vendor-charts': ['recharts'],
            'vendor-motion': ['framer-motion'],
            'vendor-markdown': ['react-markdown', 'remark-gfm'],
          }
        }
      }
    }
  };
});
