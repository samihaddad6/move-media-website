import { defineConfig } from 'vite';
// Normal files with hashed names, long-term cacheable; the scroll scenes are their own chunk.
export default defineConfig({
  build: { target: 'es2020', assetsInlineLimit: 0, cssCodeSplit: true, modulePreload: { polyfill: false } },
});
