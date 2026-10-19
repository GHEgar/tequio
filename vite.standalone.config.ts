import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    build: {
        outDir: fileURLToPath(new URL('./dist/standalone', import.meta.url)),
        emptyOutDir: true,
        minify: true,
        rolldownOptions: { output: { minify: true } },
        lib: {
            entry: fileURLToPath(new URL('./src/element/standalone.ts', import.meta.url)),
            formats: ['es'],
            fileName: () => 'tequio-graph.js',
        },
    },
});
