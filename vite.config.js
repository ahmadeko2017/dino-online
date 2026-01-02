import { defineConfig } from 'vite';

export default defineConfig({
  // Base path for GitHub Pages (use your repo name)
  base: './',
  
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  
  server: {
    port: 3000,
    open: true
  }
});
