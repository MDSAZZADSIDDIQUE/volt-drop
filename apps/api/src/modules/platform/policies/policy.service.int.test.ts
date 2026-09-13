import 'reflect-metadata';
import type { INestApplicationContext } from '@nestjs/common';
import {
  CartPriceLock,
  definePolicy,
  IdempotencyReplayWindow,
  PaymentConfirmationHold,
  StockReservationTtl,
  StoreAcceptanceTimers,
} from '@voltdrop/domain';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  createContext,
  createTestDatabase,
  FakeClock,
  integrationEnv,
  type TestDatabase,
} from '../../../../test/integration/harness.js';
import { Database, pgErrorCode } from '../../../core/database/database.js';
import { ProblemException } from '../../../core/problems/problem.js';
import { PolicyError, PolicyService } from './policy.service.js';

const SECOND = 1_000;
const HOUR = 3_600 * SECOND;

describe('PolicyService', () => {
  let db: TestDatabase;
  let app: INestApplicationContext;
  let database: Database;
  let clock: FakeClock;
  let policies: PolicyService;

  beforeAll(async () => {
    db = await createTestDatabase();
    app = await createContext(integrationEnv(db.url));
    database = app.get(Database);
    clock = new FakeClock();
    policies = new PolicyService(database, clock);
  });

  afterAll(async () => {
    await app.close();
    await db.drop();
  });

  const publish = (value: number, effectiveFrom: Date, service = policies) =>
    database.transaction((tx) =>
      service.publish(tx, CartPriceLock, value, { effectiveFrom, authorId: null, reason: 'Test' }),
    );

  it('serves the seeded version 1 of every M0 policy with the spec defaults', async () => {
    expect((await policies.current(StockReservationTtl)).value).toBe(600);
    expect((await policies.current(PaymentConfirmationHold)).value).toBe(600);
    expect((await policies.current(IdempotencyReplayWindow)).value).toBe(24);
    expect(await policies.current(StoreAcceptanceTimers)).toMatchObject({
      version: 1,
      value: { reminderPushSeconds: 60, phoneCallSeconds: 120, autoRejectSeconds: 240 },
    });
    expect(await policies.current(CartPriceLock)).toMatchObject({ version: 1, value: 1_800 });
  });

  it('adds versions rather than changing them, and serves the newest one in force', async () => {
    expect(await publish(1_200, clock.now())).toMatchObject({ version: 2, value: 1_200 });
    expect(await policies.current(CartPriceLock)).toMatchObject({ version: 2, value: 1_200 });
    expect((await policies.version(CartPriceLock, 1)).value).toBe(1_800);
  });

  it('ignores a version until its effective_from has passed', async () => {
    await publish(900, new Date(clock.now().getTime() + HOUR));
    expect(await policies.current(CartPriceLock)).toMatchObject({ version: 2, value: 1_200 });
    clock.advance(HOUR);
    expect(await policies.current(CartPriceLock)).toMatchObject({ version: 3, value: 900 });
  });

  it("picks up another process's change within 5 seconds", async () => {
    const otherProcess = new PolicyService(database, clock);
    await policies.current(CartPriceLock);
    await publish(600, clock.now(), otherProcess);
    expect((await policies.current(CartPriceLock)).value).toBe(900);
    clock.advance(5 * SECOND);
    expect((await policies.current(CartPriceLock)).value).toBe(600);
  });

  it('refuses a value that does not fit the policy schema', async () => {
    await expect(publish(0, clock.now())).rejects.toBeInstanceOf(ProblemException);
  });

  it('rejects updates, deletes and truncation of policy rows', async () => {
    const attempts = [
      sql`update policy_versions set value = '1' where key = 'cart.price_lock_seconds'`,
      sql`delete from policy_versions where key = 'cart.price_lock_seconds'`,
      sql`truncate policy_versions`,
    ];
    for (const attempt of attempts) {
      await expect(database.root.execute(attempt)).rejects.toSatisfy(
        (error: unknown) => pgErrorCode(error) === '23001',
      );
    }
    expect((await policies.version(CartPriceLock, 1)).value).toBe(1_800);
  });

  it('fails loudly for a missing policy or a stored value that no longer fits', async () => {
    await expect(policies.current(definePolicy('test.missing', z.number(), 'x'))).rejects.toThrow(
      PolicyError,
    );
    await database.root.execute(
      sql`insert into policy_versions (key, version, value, effective_from, reason) values ('test.bad_value', 1, '"soon"', now(), 'Test')`,
    );
    await expect(
      policies.version(definePolicy('test.bad_value', z.number(), 'x'), 1),
    ).rejects.toThrow(/doesn't match its schema/);
  });
});
