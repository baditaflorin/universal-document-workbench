import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "/universal-document-workbench/",
  plugins: [react()],
  build: {
    outDir: "../docs",
    emptyOutDir: false,
    sourcemap: true,
    rollupOptions: {
      output: {
        assetFileNames: "assets/[name]-[hash][extname]",
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
      },
    },
  },
  test: {
    exclude: ["**/node_modules/**", "**/e2e/**"],
    environment: "jsdom",
    globals: true,
  },
});
