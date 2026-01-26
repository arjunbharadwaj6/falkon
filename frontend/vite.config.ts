import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Serve index.html for all non-asset routes (SPA routing)
    middlewareMode: false,
    // This ensures dev server routes work correctly
  }
})
