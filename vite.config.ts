import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  build: { target: "es2022", assetsDir: "assets", chunkSizeWarningLimit: 600 },
  server: { strictPort: true },
});
