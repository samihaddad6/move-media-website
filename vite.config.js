import { defineConfig } from 'vite';
import { resolve } from 'node:path';
// Normal files with hashed names, long-term cacheable; the scroll scenes are their own chunk.
// The concept round lives under /concepts/ and does not change the main page.
export default defineConfig({
  build: {
    target: 'es2020', assetsInlineLimit: 0, cssCodeSplit: true, modulePreload: { polyfill: false },
    rollupOptions: { input: {
      main: resolve(__dirname, 'index.html'),
      concepts: resolve(__dirname, 'concepts/index.html'),
      ca: resolve(__dirname, 'concepts/a.html'), cb: resolve(__dirname, 'concepts/b.html'), cc: resolve(__dirname, 'concepts/c.html'),
    } },
  },
});
