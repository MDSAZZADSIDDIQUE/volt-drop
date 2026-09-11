import { fileURLToPath } from 'node:url';
import { sql } from 'drizzle-orm';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { pgErrorCode, type Database } from './database.js';

/** apps/api/drizzle, from both src/core/database and dist/core/database. */
export const MIGRATIONS_FOLDER = fileURLToPath(new URL('../../../drizzle', import.meta.url));

const UNDEFINED_TABLE = '42P01';

function isUndefinedTable(error: unknown): boolean {
  return pgErrorCode(error) === UNDEFINED_TABLE;
}

/**
 * Whether the database has every migration this build ships with: all Drizzle migrations (matched
 * by hash) and Graphile Worker's schema. Readiness reports "down" until `pnpm db:migrate` has run.
 */
export class MigrationStatus {
  private expected: readonly string[] | undefined;

  constructor(
    private readonly database: Database,
    private readonly migrationsFolder = MIGRATIONS_FOLDER,
  ) {}

  async isUpToDate(): Promise<boolean> {
    this.expected ??= readMigrationFiles({ migrationsFolder: this.migrationsFolder }).map(
      (migration) => migration.hash,
    );
    let applied: Set<string>;
    try {
      const result = await this.database.root.execute<{ hash: string }>(
        sql`select hash from drizzle.__drizzle_migrations`,
      );
      applied = new Set(result.rows.map((row) => row.hash));
    } catch (error) {
      if (isUndefinedTable(error)) {
        return false;
      }
      throw error;
    }
    if (!this.expected.every((hash) => applied.has(hash))) {
      return false;
    }
    const worker = await this.database.root.execute<{ installed: boolean }>(
      sql`select to_regprocedure('graphile_worker.add_job(text, json, text, timestamptz, integer, text, integer, text[], text)') is not null as installed`,
    );
    return worker.rows[0]?.installed === true;
  }
}
