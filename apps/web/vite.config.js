import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(rootDir, "src") },
  },
  server: {
    port: 5173,
    // In development we proxy /api to the local backend, so no VITE_API_BASE_URL
    // is needed. In production the app calls VITE_API_BASE_URL directly.
    proxy: {
      "/api": { target: "http://localhost:4000", changeOrigin: true },
    },
  },
});
