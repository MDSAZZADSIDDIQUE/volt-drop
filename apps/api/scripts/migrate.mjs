// `pnpm db:migrate`: applies all migrations to DATABASE_URL. With APP_ENV=local (the default) it reads
// the root .env if there is one and falls back to the local Docker Compose database, so a fresh clone
// needs no configuration. Outside local, DATABASE_URL must be set.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createMigrationPool, migrateDatabase } from './lib/migrations.mjs';

const isLocal = (process.env.APP_ENV ?? 'local') === 'local';
const rootEnvFile = fileURLToPath(new URL('../../../.env', import.meta.url));
if (isLocal && existsSync(rootEnvFile)) {
  process.loadEnvFile(rootEnvFile);
}

const connectionString =
  process.env.DATABASE_URL ||
  (isLocal ? 'postgres://voltdrop:voltdrop@localhost:5432/voltdrop' : undefined);
if (connectionString === undefined) {
  console.error('DATABASE_URL is required when APP_ENV is not local.');
  process.exit(1);
}

const pool = createMigrationPool(connectionString);
try {
  await migrateDatabase(pool);
  console.log('Database migrations applied.');
} catch (error) {
  console.error('Migration failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
