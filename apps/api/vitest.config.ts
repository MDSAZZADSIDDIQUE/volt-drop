import { defineConfig } from 'vitest/config';

// Unit tests: no network, no Docker. Integration tests (`*.int.test.ts`) run separately with
// `pnpm test:int` against Testcontainers.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['src/**/*.int.test.ts'],
  },
});
