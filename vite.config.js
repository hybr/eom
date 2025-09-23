import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html',
        'reset-password': './reset-password.html',
        'verify-email': './verify-email.html'
      }
    }
  },
  server: {
    port: 3000,
    host: true
  },
  optimizeDeps: {
    include: ['sql.js']
  },
  define: {
    global: 'globalThis'
  }
});