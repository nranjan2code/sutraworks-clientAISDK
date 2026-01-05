import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'SutraAI',
      fileName: (format) => `sutra-ai.${format}.js`,
      formats: ['umd'],
    },
    outDir: 'dist/umd',
    minify: 'terser',
    sourcemap: true,
    rollupOptions: {
      output: {
        globals: {},
      },
    },
  },
  plugins: [dts()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
