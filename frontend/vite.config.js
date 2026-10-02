import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Cấu hình Vite: proxy /api sang backend Express để tránh lỗi CORS khi dev.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
