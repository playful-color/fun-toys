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
  build: {
    outDir: 'dist',  // 出力先
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),  // 明示的にエントリーポイントを指定
    },
  },
}));
