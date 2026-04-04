import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5180,
    proxy: {
      '/items': {
        target: 'http://localhost:3030',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3030',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
