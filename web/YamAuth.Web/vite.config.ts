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
            // 图标叶子模块保持独立的动态依赖边界，不能被合并阈值带入首页。
            test: (id) => /node_modules/.test(id) && !/@ant-design\/(icons\/es\/icons|icons-svg\/es\/asn)\//.test(id),
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
