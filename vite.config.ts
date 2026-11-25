import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // The 3D cube's chunk is about 530 kB, nearly all three.js's renderer. It loads only when a game
    // starts (GameScreen lazy-loads it), so the menu stays small. Warn if anything outgrows this.
    chunkSizeWarningLimit: 600,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
  },
})
