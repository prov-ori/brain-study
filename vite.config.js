import { defineConfig } from "vite";
export default defineConfig({
  root: "src",
  publicDir: "../public",
  base: process.env.VITE_BASE_PATH || "/brain-study/",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: { output: { manualChunks: { three: ["three"] } } },
  },
});
