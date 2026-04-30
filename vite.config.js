import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    allowedHosts: ['dev.ecsfinancial.tech'],
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})

