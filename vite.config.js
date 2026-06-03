import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':  ['react', 'react-dom'],
          'vendor-charts': ['recharts'],
          'vendor-office': ['docxtemplater', 'pizzip', 'xlsx'],
          'vendor-icons':  ['lucide-react'],
        },
      },
    },
  },
})
