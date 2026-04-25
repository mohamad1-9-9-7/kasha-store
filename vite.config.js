import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Force a single React instance — prevents the "Cannot read properties of null
  // (reading 'useState')" white-screen when Vite's dep optimizer caches react and
  // react-dom under different version hashes.
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom"],
  },
  build: {
    chunkSizeWarningLimit: 1000,
  },
});
