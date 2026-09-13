import 'reflect-metadata';
import type { INestApplicationContext } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createContext,
  createTestDatabase,
  FakeClock,
  integrationEnv,
  type TestDatabase,
} from '../../../../test/integration/harness.js';
import { Database, pgErrorCode } from '../../../core/database/database.js';
import { FeatureFlagService, type SetFlagInput } from './feature-flag.service.js';
import { defineFlag, type FlagScope } from './flags.js';

const ordering = defineFlag('ordering.enabled', true, 'Customers can place orders.');

describe('FeatureFlagService', () => {
  let db: TestDatabase;
  let app: INestApplicationContext;
  let database: Database;
  let clock: FakeClock;
  let flags: FeatureFlagService;

  beforeAll(async () => {
    db = await createTestDatabase();
    app = await createContext(integrationEnv(db.url));
    database = app.get(Database);
    clock = new FakeClock();
    flags = new FeatureFlagService(database, clock);
  });

  afterAll(async () => {
    await app.close();
    await db.drop();
  });

  const set = (
    scope: FlagScope,
    input: Pick<SetFlagInput, 'enabled' | 'expectedVersion'>,
    service = flags,
  ) =>
    database.transaction((tx) =>
      service.set(tx, ordering, scope, { ...input, updatedBy: null, reason: 'Test' }),
    );

  it('uses the default until a setting exists', async () => {
    expect(await flags.isEnabled(ordering, { zoneId: 'zone-1' })).toBe(true);
  });

  it('applies the most specific setting for the caller', async () => {
    await set({ type: 'global' }, { enabled: false });
    await set({ type: 'zone', id: 'zone-1' }, { enabled: true });
    await set({ type: 'merchant', id: 'merchant-1' }, { enabled: false });
    await set({ type: 'user_segment', id: 'trade' }, { enabled: true });

    expect(await flags.isEnabled(ordering)).toBe(false);
    expect(await flags.isEnabled(ordering, { zoneId: 'zone-1' })).toBe(true);
    expect(await flags.isEnabled(ordering, { zoneId: 'zone-1', merchantId: 'merchant-1' })).toBe(
      false,
    );
    expect(
      await flags.isEnabled(ordering, {
        zoneId: 'zone-1',
        merchantId: 'merchant-1',
        segments: ['trade'],
      }),
    ).toBe(true);
  });

  it('changes a setting only from the version it replaces', async () => {
    expect(await set({ type: 'global' }, { enabled: true, expectedVersion: 1 })).toEqual({
      version: 2,
    });
    await expect(
      set({ type: 'global' }, { enabled: false, expectedVersion: 1 }),
    ).rejects.toMatchObject({ problem: { code: 'conflict' } });
    await expect(set({ type: 'global' }, { enabled: false })).rejects.toMatchObject({
      problem: { code: 'conflict' },
    });
  });

  it("picks up another process's change within 5 seconds", async () => {
    const otherProcess = new FeatureFlagService(database, clock);
    expect(await flags.isEnabled(ordering)).toBe(true);
    await set({ type: 'global' }, { enabled: false, expectedVersion: 2 }, otherProcess);
    expect(await flags.isEnabled(ordering)).toBe(true);
    clock.advance(5_000);
    expect(await flags.isEnabled(ordering)).toBe(false);
  });

  it('refuses a zone, merchant or segment setting without an id', async () => {
    await expect(set({ type: 'zone', id: '' }, { enabled: true })).rejects.toThrow(/scope id/);
    await expect(
      database.root.execute(
        sql`insert into feature_flags (key, scope_type, scope_id, enabled, reason) values ('ordering.enabled', 'zone', '', true, 'Test')`,
      ),
    ).rejects.toSatisfy((error: unknown) => pgErrorCode(error) === '23514');
  });
});
