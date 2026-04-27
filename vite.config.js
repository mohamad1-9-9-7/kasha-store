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
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("react-router")) return "router";
          if (id.includes("react-dom") || id.includes("/react/")) return "react";
          if (id.includes("html2canvas") || id.includes("jspdf")) return "pdf";
          if (id.includes("xlsx")) return "xlsx";
          return "vendor";
        },
      },
    },
  },
});
