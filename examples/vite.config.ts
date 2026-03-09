import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0", // Listen on all interfaces for dev container
    port: 3055,
    strictPort: false, // Try next port if 3055 is in use
    proxy: {
      "/api": {
        target: "http://localhost:3050",
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    exclude: ["pdformerai"],
  },
});
