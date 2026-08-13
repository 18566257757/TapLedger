import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { cloudflare } from '@cloudflare/vite-plugin'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    ...(mode === 'test' ? [] : [
      cloudflare({
        configPath: process.env.CLOUDFLARE_VITE_WRANGLER_CONFIG_PATH ?? '../wrangler.jsonc',
        persistState: { path: '../.wrangler/state' },
      }),
    ]),
  ],
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['./tests/**/*.test.{ts,tsx}'],
    exclude: ['./tests/worker/**'],
    css: true,
  },
}))
