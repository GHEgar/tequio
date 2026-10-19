import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const src = (path: string): string => fileURLToPath(new URL(`./src/${path}`, import.meta.url));

export default defineConfig({
    resolve: {
        alias: [
            { find: /^@npmegar\/tequio\/element$/, replacement: src('element/index.ts') },
            { find: /^@npmegar\/tequio\/react$/, replacement: src('react/index.ts') },
            { find: /^@npmegar\/tequio$/, replacement: src('core/index.ts') },
        ],
    },
    test: {
        environment: 'happy-dom',
        include: ['test/**/*.test.{ts,tsx}'],
    },
});
