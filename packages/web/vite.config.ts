import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  optimizeDeps: {
    include: ['citeproc', 'localforage', 'uuid'],
  },
  build: {
    target: 'es2020',
  },
});
