import { defineConfig } from 'vite'

// base './' — GitHub Pages 하위 경로나 정적 호스팅 어디서든 그대로 열리도록
export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 1200,
  },
})
