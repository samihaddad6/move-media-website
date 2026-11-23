import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import fs from 'node:fs';

// The site ships as one self-contained page, so the logo kit's icon set (web-icons/head-snippet.html)
// is embedded as data URIs in place of the snippet's /favicon.ico, /favicon.svg, ... paths.
const b64 = (f, type) => `data:${type};base64,${fs.readFileSync(`public/${f}`).toString('base64')}`;
function icons() {
  return {
    name: 'mm-icons',
    transformIndexHtml(html) {
      const manifest = JSON.parse(fs.readFileSync('public/site.webmanifest', 'utf8'));
      manifest.icons = manifest.icons.map((i) => ({ ...i, src: b64(i.src.replace(/^\//, ''), 'image/png') }));
      const man = `data:application/manifest+json;base64,${Buffer.from(JSON.stringify(manifest)).toString('base64')}`;
      return html.replace(
        '<!--icons-->',
        [
          `<link rel="icon" href="${b64('favicon.ico', 'image/x-icon')}" sizes="48x48">`,
          `<link rel="icon" href="${b64('favicon.svg', 'image/svg+xml')}" type="image/svg+xml">`,
          `<link rel="apple-touch-icon" href="${b64('apple-touch-icon.png', 'image/png')}">`,
          `<link rel="manifest" href="${man}">`,
        ].join('\n    '),
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), icons(), viteSingleFile()],
  build: { assetsInlineLimit: 100_000_000, chunkSizeWarningLimit: 4000, cssCodeSplit: false, target: 'es2020' },
  publicDir: false,
});
