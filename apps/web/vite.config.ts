import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3100,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4100',
        changeOrigin: true
      }
    }
  },
  preview: {
    host: true,
    port: 3100,
    allowedHosts: true
  }
});
