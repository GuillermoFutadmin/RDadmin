import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: resolve(process.cwd(), 'client-dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(process.cwd(), 'client.html')
    }
  }
})
