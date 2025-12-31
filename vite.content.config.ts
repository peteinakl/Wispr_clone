import { defineConfig } from 'vite';
import { resolve } from 'path';

// Separate build configuration for content script (IIFE format, no external imports)
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false, // Don't clear dist - main build will run first
    lib: {
      entry: resolve(__dirname, 'src/content/content.ts'),
      name: 'FlowTypeContent',
      formats: ['iife'],
      fileName: () => 'content.js',
    },
    rollupOptions: {
      output: {
        extend: true,
        inlineDynamicImports: true,
      }
    },
    sourcemap: 'inline',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
