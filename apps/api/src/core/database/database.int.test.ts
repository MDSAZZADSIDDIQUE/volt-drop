import 'reflect-metadata';
import type { INestApplicationContext } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createContext,
  createTestDatabase,
  integrationEnv,
  type TestDatabase,
} from '../../../test/integration/harness.js';
import { Database } from './database.js';
import { MigrationStatus } from './migration-status.js';

describe('database', () => {
  let db: TestDatabase;
  let app: INestApplicationContext;
  let database: Database;

  beforeAll(async () => {
    db = await createTestDatabase();
    app = await createContext(integrationEnv(db.url));
    database = app.get(Database);
    await database.root.execute(sql`create table probe (value text not null)`);
  });

  afterAll(async () => {
    await app.close();
    await db.drop();
  });

  it('has working PostGIS and pgvector', async () => {
    const extensions = await database.root.execute<{ extname: string }>(
      sql`select extname from pg_extension where extname in ('postgis', 'vector') order by extname`,
    );
    expect(extensions.rows.map((row) => row.extname)).toEqual(['postgis', 'vector']);

    // Manchester Piccadilly to Deansgate is roughly 1.5 km.
    const distance = await database.root.execute<{ metres: number }>(
      sql`select st_distance('SRID=4326;POINT(-2.2309 53.4774)'::geography, 'SRID=4326;POINT(-2.2507 53.4743)'::geography)::integer as metres`,
    );
    expect(distance.rows[0]?.metres).toBeGreaterThan(1_000);
    expect(distance.rows[0]?.metres).toBeLessThan(2_000);

    const similarity = await database.root.execute<{ distance: number }>(
      sql`select '[1,0]'::vector <-> '[0,1]'::vector as distance`,
    );
    expect(similarity.rows[0]?.distance).toBeCloseTo(Math.SQRT2);
  });

  it('knows every migration has been applied', async () => {
    expect(await app.get(MigrationStatus).isUpToDate()).toBe(true);
  });

  it('commits a transaction and exposes it as the executor meanwhile', async () => {
    await database.transaction(async (tx) => {
      expect(database.executor).toBe(tx);
      expect(database.inTransaction).toBe(true);
      await tx.execute(sql`insert into probe values ('kept')`);
    });
    expect(database.inTransaction).toBe(false);
    expect(database.executor).toBe(database.root);
    const rows = await database.root.execute<{ value: string }>(sql`select value from probe`);
    expect(rows.rows).toEqual([{ value: 'kept' }]);
  });

  it('joins an open transaction, so an outer failure rolls back the inner work too', async () => {
    await expect(
      database.transaction(async (outer) => {
        await outer.execute(sql`insert into probe values ('outer')`);
        await database.transaction(async (inner) => {
          expect(inner).toBe(outer);
          await inner.execute(sql`insert into probe values ('inner')`);
        });
        throw new Error('roll back both');
      }),
    ).rejects.toThrow('roll back both');
    const rows = await database.root.execute<{ value: string }>(sql`select value from probe`);
    expect(rows.rows).toEqual([{ value: 'kept' }]);
  });
});
