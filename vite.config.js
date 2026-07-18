import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // /api/* are Vercel serverless functions — they don't run under plain
    // `vite dev`, so forward them to `vercel dev --listen 3001` running
    // alongside this dev server (see README/`npm run dev` instructions).
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
