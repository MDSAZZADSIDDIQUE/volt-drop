import type { Pool } from 'pg';

/** Absolute path of the Drizzle migrations folder (apps/api/drizzle). */
export declare const MIGRATIONS_FOLDER: string;

/** A small pool for migrating, with the error handlers Graphile Worker expects. */
export declare function createMigrationPool(connectionString: string): Pool;

/** Applies VoltDrop's Drizzle migrations, then Graphile Worker's schema. */
export declare function migrateDatabase(pool: Pool): Promise<void>;
