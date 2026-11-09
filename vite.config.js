import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  // GitHub Pages serves this repository under /Kamen-app/.
  // Local development and non-Pages hosting use the root path.
  base: process.env.GITHUB_ACTIONS ? '/Kamen-app/' : '/',
  plugins: [react(), wasm(), topLevelAwait()],
  server: { host: '0.0.0.0' },
  preview: { host: '0.0.0.0' }
});
