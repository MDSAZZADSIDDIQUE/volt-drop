// Applies every database migration: first VoltDrop's Drizzle migrations (forward-only, reviewed SQL
// in apps/api/drizzle), then Graphile Worker's own schema. Plain JavaScript, so `pnpm db:migrate`
// works straight after `pnpm install` without a build. Shared by the CLI and the integration tests.
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { runMigrations } from 'graphile-worker';
import pg from 'pg';

export const MIGRATIONS_FOLDER = fileURLToPath(new URL('../../drizzle', import.meta.url));

/**
 * A small pool for migrating. Graphile Worker expects the pool, and every client it hands out, to
 * handle errors; a failed migration still surfaces through `migrateDatabase` itself.
 * @param {string} connectionString
 */
export function createMigrationPool(connectionString) {
  const pool = new pg.Pool({ connectionString, max: 2 });
  /** @param {Error} error */
  const report = (error) => {
    console.error('A database connection failed:', error.message);
  };
  pool.on('error', report);
  pool.on('connect', (client) => {
    client.on('error', report);
  });
  return pool;
}

/** @param {import('pg').Pool} pool */
export async function migrateDatabase(pool) {
  await migrate(drizzle({ client: pool }), { migrationsFolder: MIGRATIONS_FOLDER });
  await runMigrations({ pgPool: pool });
}
