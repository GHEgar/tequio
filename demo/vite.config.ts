import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const src = (path: string): string => fileURLToPath(new URL(`../src/${path}`, import.meta.url));

export default defineConfig({
    root: fileURLToPath(new URL('.', import.meta.url)),
    base: './',
    plugins: [react()],
    resolve: {
        alias: [
            { find: /^@npmegar\/tequio\/element$/, replacement: src('element/index.ts') },
            { find: /^@npmegar\/tequio\/react$/, replacement: src('react/index.ts') },
            { find: /^@npmegar\/tequio$/, replacement: src('core/index.ts') },
        ],
    },
    build: {
        outDir: fileURLToPath(new URL('../demo-dist', import.meta.url)),
        emptyOutDir: true,
        rolldownOptions: {
            input: {
                main: fileURLToPath(new URL('./index.html', import.meta.url)),
                tv: fileURLToPath(new URL('./tv.html', import.meta.url)),
            },
        },
    },
});
