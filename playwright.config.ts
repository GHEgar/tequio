import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: 'e2e',
    use: {
        baseURL: 'http://127.0.0.1:5197',
        viewport: { width: 960, height: 540 },
    },
    webServer: {
        command: 'npx vite --config demo/vite.config.ts --host 127.0.0.1 --port 5197 --strictPort',
        url: 'http://127.0.0.1:5197',
        reuseExistingServer: true,
    },
});
