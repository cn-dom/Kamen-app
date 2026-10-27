import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages serves this repository under /Kamen-app/.
  // Local development and non-Pages hosting use the root path.
  base: process.env.GITHUB_ACTIONS ? '/Kamen-app/' : '/',
  plugins: [react()],
  server: { host: '0.0.0.0' },
  preview: { host: '0.0.0.0' }
});
