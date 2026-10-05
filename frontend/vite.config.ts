import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react()],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/maplibre-gl/")) return "map-renderer";
          if (
            id.includes("/node_modules/recharts/") ||
            id.includes("/node_modules/d3-")
          )
            return "charts";
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 4173,
    allowedHosts: ["terminal.local"],
    proxy: { "/api": "http://127.0.0.1:8000" },
  },
});
