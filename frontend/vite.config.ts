import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // shadcn/ui convention: `@/components/ui/...`
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // The Express API (backend/) runs on :3001. See CRUD-EXERCISE.md.
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
