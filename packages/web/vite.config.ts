import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  optimizeDeps: {
    include: ['citeproc', 'localforage', 'uuid'],
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          // Keep citeproc separate — it's large
          citeproc: ['citeproc'],
          // Tiptap core
          tiptap: [
            '@tiptap/core',
            '@tiptap/starter-kit',
            '@tiptap/svelte',
          ],
        },
      },
    },
  },
  resolve: {
    alias: {
      // Ensure browser-compatible versions of Node built-ins are not needed
    },
  },
});
