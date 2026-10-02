import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/static': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/invoices_pdf': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/reports_pdf': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      }
    }

  }
})
