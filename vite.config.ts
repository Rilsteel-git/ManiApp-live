import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// Port diambil dari env PORT bila ada supaya bisa dijalankan berdampingan
// dengan dev server lain; jatuh ke 5173 saat dijalankan manual.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'mani-app-logo.png'],
      manifest: {
        id: '/',
        name: 'Mani App',
        short_name: 'Mani App',
        description: 'Track your wallets, transactions, and spending in one simple place.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f4f6f4',
        theme_color: '#008f1d',
        lang: 'en',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html'
      }
    })
  ],
  server: { port: Number(process.env.PORT) || 5173 }
});
