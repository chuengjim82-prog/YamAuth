import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        // 按大小拆分 Ant Design 依赖时，仍须保持模块初始化的先后顺序。
        strictExecutionOrder: true,
        codeSplitting: {
          groups: [{
            name: 'vendor',
            test: /node_modules/,
            entriesAware: true,
            entriesAwareMergeThreshold: 20_000,
            maxSize: 450_000,
          }],
        },
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 6503,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:6500',
        changeOrigin: true,
      },
    },
  },
})
