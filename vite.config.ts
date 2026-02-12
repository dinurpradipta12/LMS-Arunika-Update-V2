import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: "./", // WAJIB untuk static hosting seperti Cloudflare Pages
})