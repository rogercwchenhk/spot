import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    react(),
    // gzip 预压缩（构建时生成 .gz，Nginx 直接 serve）
    viteCompression({ algorithm: 'gzip', ext: '.gz' }),
    // brotli 压缩（更小体积）
    viteCompression({ algorithm: 'brotliCompress', ext: '.br' }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3200',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // 手动拆包：大型 vendor 拆成独立 chunk，利用浏览器缓存
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // React 核心（几乎不变，长期缓存）
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router')) {
              return 'vendor-react';
            }
            // 数据层（中频变更）
            if (id.includes('/@tanstack/') || id.includes('/@supabase/')) {
              return 'vendor-data';
            }
            // 图表库（体积大，仅 Reports 页面使用）
            if (id.includes('/recharts/')) {
              return 'vendor-charts';
            }
          }
        },
      },
    },
    sourcemap: false,
    chunkSizeWarningLimit: 500,
  },
});
