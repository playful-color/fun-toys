import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig(({ command }) => ({
  plugins: [vue()],
  base: '/fun-toys/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  },
}));
