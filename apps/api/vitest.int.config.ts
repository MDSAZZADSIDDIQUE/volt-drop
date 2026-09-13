import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Integration tests (`*.int.test.ts`) against real PostgreSQL (with PostGIS and pgvector) and Valkey
// in Testcontainers (spec §14). They need Docker. The first run builds the Postgres image from
// infra/docker/postgres, which takes a minute or two; later runs reuse Docker's cache.
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['src/**/*.int.test.ts'],
    globalSetup: ['test/integration/global-setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
