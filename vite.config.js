import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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
            { test: /\/node_modules\/(?:\.vite\/deps\/)?react(?:\.js|\/|$)/, name: "vendor_react" },
            { test: /\/node_modules\/(?:\.vite\/deps\/)?react-dom(?:\.js|\/|$)/, name: "vendor_react" },
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
