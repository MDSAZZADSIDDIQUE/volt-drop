import { defineConfig } from 'vitest/config';

const everyLine = { branches: 100, functions: 100, lines: 100, statements: 100 };

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/index.ts'],
      // M0 acceptance: the money package has 100% branch coverage (spec §16).
      thresholds: {
        'src/money/**': everyLine,
        'src/vat/**': everyLine,
      },
    },
  },
});
