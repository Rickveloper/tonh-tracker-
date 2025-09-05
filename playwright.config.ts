import { defineConfig } from '@playwright/test';

export default defineConfig({
    webServer: {
        command: 'npx http-server -p 4173 .',
        port: 4173,
        reuseExistingServer: !process.env.CI,
    },
    use: {
        baseURL: 'http://localhost:4173',
    },
});


