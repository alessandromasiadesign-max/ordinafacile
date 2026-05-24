import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');
          if (!normalizedId.includes('/node_modules/')) return;

          if (normalizedId.includes('/node_modules/react-router/') || normalizedId.includes('/node_modules/react-router-dom/') || normalizedId.includes('/node_modules/@remix-run/router/')) return 'router';
          if (normalizedId.includes('/node_modules/@tanstack/')) return 'tanstack';
          if (normalizedId.includes('/node_modules/@supabase/')) return 'supabase';
          if (normalizedId.includes('/node_modules/@stripe/')) return 'stripe';
          if (normalizedId.includes('/node_modules/@radix-ui/') || normalizedId.includes('/node_modules/cmdk/') || normalizedId.includes('/node_modules/vaul/')) return 'ui-vendor';
          if (normalizedId.includes('/node_modules/recharts/')) return 'charts';
          if (normalizedId.includes('/node_modules/react-quill/') || normalizedId.includes('/node_modules/jspdf/') || normalizedId.includes('/node_modules/html2canvas/')) return 'editor-pdf';
          if (normalizedId.includes('/node_modules/framer-motion/')) return 'motion';
          if (normalizedId.includes('/node_modules/lodash/') || normalizedId.includes('/node_modules/moment/') || normalizedId.includes('/node_modules/date-fns/')) return 'utils-vendor';
        },
      },
    },
  },
})