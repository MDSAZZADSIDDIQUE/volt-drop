import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Unit and in-memory API tests: no network, no Docker. Integration tests (`*.int.test.ts`) run
// separately with `pnpm test:int` against Testcontainers. SWC compiles the tests so NestJS
// decorators emit the metadata dependency injection relies on (spec §4).
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['src/**/*.int.test.ts'],
  },
});
