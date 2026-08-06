import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "script", // Înregistrează automat Service Worker-ul în HTML fără import-uri speciale
      includeAssets: ["icon.svg", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "Workflow Daune 2.0",
        short_name: "Daune 2.0",
        description: "Recepție vehicule, inspecție foto, diagramă avarii și management dosare de daună.",
        theme_color: "#000000",
        background_color: "#000000",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,json}"],
        runtimeCaching: [
          {
            // OpenCV.js document-scan engine (~9MB) — cache after first load
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/jscanify@[\d.]+\/src\/opencv\.js$/,
            handler: "CacheFirst",
            options: {
              cacheName: "opencv-js-engine",
              expiration: {
                maxEntries: 2,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/docs\.opencv\.org\/[\d.]+\/opencv\.js$/,
            handler: "CacheFirst",
            options: {
              cacheName: "opencv-js-engine",
              expiration: {
                maxEntries: 2,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id) return;
          const normalizedId = id.replace(/\\/g, "/");
          if (!normalizedId.includes("/node_modules/")) return;

          const chunks = [
            { test: /\/node_modules\/(?:\.vite\/deps\/)?xlsx(?:\/|$)/, name: "vendor_xlsx" },
            { test: /\/node_modules\/(?:\.vite\/deps\/)?jspdf(?:\/|\.|$)/, name: "vendor_jspdf" },
            { test: /\/node_modules\/(?:\.vite\/deps\/)?recharts(?:\/|$)/, name: "vendor_recharts" },
            { test: /\/node_modules\/(?:\.vite\/deps\/)?lucide-react(?:\/|$)/, name: "vendor_icons" },
            { test: /\/node_modules\/(?:\.vite\/deps\/)?html2canvas(?:\/|$)/, name: "vendor_html2canvas" },
            { test: /\/node_modules\/(?:\.vite\/deps\/)?@supabase(?:\/|$)/, name: "vendor_supabase" },
            { test: /\/node_modules\/(?:\.vite\/deps\/)?supabase(?:\/|$)/, name: "vendor_supabase" },
          ];

          for (const chunk of chunks) {
            if (chunk.test.test(normalizedId)) return chunk.name;
          }

          return "vendor";
        },
      },
    },
  },
});
