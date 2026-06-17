import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Deployed at the domain root (https://mulea.org/). Asset, worker, WASM and
  // service-worker URLs resolve from '/'. All in-code public-asset references go
  // through import.meta.env.BASE_URL, so this stays correct if the base changes.
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'mulea',
        short_name: 'mulea',
        description: 'Client-side functional enrichment analysis with empirical FDR',
        theme_color: '#2f7d5d',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '.',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Precache the bundled catalog index (public/ontology-catalog.json) so the
        // OntologyPicker works offline; `json` is included here.
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,json,gmt,txt}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            // Raw catalog GMTs fetched on demand from the muleaData ontology repo
            // (fetchGmtRaw in src/ontologyCatalog.ts). Cache them at runtime so a
            // once-loaded ontology stays available offline.
            urlPattern:
              /^https:\/\/raw\.githubusercontent\.com\/ELTEbioinformatics\/GMT_files_for_mulea\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'mulea-ontology-gmt',
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 2592000, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
});
