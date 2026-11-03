import { defineConfig } from "vite";
export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/brain-study/",
  build: { rollupOptions: { output: { manualChunks: { three: ["three"] } } } },
});
