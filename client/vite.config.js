import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        timeout: 120000,
        proxyTimeout: 120000,
        configure: (proxy) => {
          proxy.on("error", (error, req) => {
            console.error(`[vite proxy] ${req.method} ${req.url}:`, error.code || error.message);
          });
        }
      }
    }
  }
});
