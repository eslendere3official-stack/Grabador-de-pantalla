/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

// https://vitejs.dev/config/
export default defineConfig({
  // Base relativa para que el build funcione tanto en GitHub Pages
  // (rutas de proyecto tipo /Grabador-de-pantalla/) como en cualquier host.
  base: "./",
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    target: "es2020",
  },
  server: {
    port: 5173,
    open: true,
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.ts"],
    coverage: {
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.{test,spec}.ts", "src/types/**"],
    },
  },
});
