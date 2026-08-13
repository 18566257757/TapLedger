import { fileURLToPath } from 'node:url'
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      main: './src/worker/index.ts',
      miniflare: {
        // Keep the test runtime aligned with the workerd build bundled by the
        // Workers Vitest integration. Production keeps the current date in
        // wrangler.jsonc.
        compatibilityDate: '2026-07-14',
        d1Databases: ['DB'],
        bindings: {
          TEST_MIGRATIONS: await readD1Migrations(fileURLToPath(new URL('../migrations', import.meta.url))),
        },
      },
    })),
  ],
  test: {
    include: ['./tests/worker/**/*.test.ts'],
    setupFiles: ['./tests/worker/setup.ts'],
  },
})
