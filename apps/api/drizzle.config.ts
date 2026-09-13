import { defineConfig } from 'drizzle-kit';

// `pnpm db:generate` diffs every module's schema.ts against the last snapshot and writes a SQL
// migration to ./drizzle for review. Migrations are forward-only: never edit one that is on main.
// Apply them with `pnpm db:migrate` (scripts/migrate.mjs), which also installs Graphile Worker.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/modules/*/schema.ts',
  out: './drizzle',
  strict: true,
  verbose: true,
});
