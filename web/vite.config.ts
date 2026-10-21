import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    // В dev запросы к API идут на локальный бэкенд
    proxy: { '/api': 'http://localhost:3000' },
  },
  preview: { port: 4173, proxy: { '/api': 'http://localhost:3000' } },
  worker: { format: 'es' },
  build: { target: 'es2022', sourcemap: true },
});
