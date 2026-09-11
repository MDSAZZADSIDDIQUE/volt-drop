import 'reflect-metadata';
import { Body, Controller, Module, Post } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { newId } from '@voltdrop/domain';
import { sql } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  createTestDatabase,
  integrationEnv,
  startApi,
  type TestDatabase,
} from '../../../../test/integration/harness.js';
import { Database } from '../../../core/database/database.js';
import { Public } from '../../access/index.js';
import { IdempotencyLeaseLostError, IdempotencyStore, type Claim } from './idempotency.store.js';
import { Idempotent } from './idempotent.decorator.js';

const PaymentSchema = z.object({ amountPence: z.number().int().min(1) });
type Payment = z.infer<typeof PaymentSchema>;

/** Switches the tests flip to steer the test-only controller below. */
const handler: { calls: number; failNext: boolean; gate: Promise<void> | undefined } = {
  calls: 0,
  failNext: false,
  gate: undefined,
};

@Controller({ path: 'test/payments', version: '1' })
class PaymentsController {
  constructor(private readonly database: Database) {}

  @Post()
  @Public()
  @Idempotent()
  async create(
    @Body({ schema: PaymentSchema }) body: Payment,
  ): Promise<{ id: string; amountPence: number }> {
    handler.calls += 1;
    await handler.gate;
    const id = newId();
    // Joins the interceptor's transaction, so it commits with the stored response or not at all.
    await this.database.transaction(async (tx) => {
      await tx.execute(
        sql`insert into payments (id, amount_pence) values (${id}::uuid, ${body.amountPence})`,
      );
    });
    if (handler.failNext) {
      handler.failNext = false;
      throw new Error('The card was declined');
    }
    return { id, amountPence: body.amountPence };
  }
}

@Module({ controllers: [PaymentsController] })
class PaymentsModule {}

function lockTokenOf(claim: Claim): string {
  if (claim.outcome !== 'claimed') {
    throw new Error(`Expected to claim the key, got "${claim.outcome}".`);
  }
  return claim.lockToken;
}

describe('idempotency', () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let database: Database;

  const post = (key: string | undefined, body: Payment) => {
    const call = request(app.getHttpServer()).post('/v1/test/payments');
    return (key === undefined ? call : call.set('Idempotency-Key', key)).send(body);
  };
  const paymentCount = async (): Promise<number> =>
    (await database.root.execute<{ n: number }>(sql`select count(*)::int as n from payments`))
      .rows[0]?.n ?? 0;
  const keyRow = async (key: string) =>
    (
      await database.root.execute<{ status: string; response_status: number | null }>(
        sql`select status, response_status from idempotency_keys where key = ${key}`,
      )
    ).rows[0];
  const expireKey = (key: string) =>
    database.root.execute(
      sql`update idempotency_keys set expires_at = now() - interval '1 second' where key = ${key}`,
    );

  beforeAll(async () => {
    db = await createTestDatabase();
    app = await startApi(integrationEnv(db.url), [PaymentsModule]);
    database = app.get(Database);
    await database.root.execute(
      sql`create table payments (id uuid primary key, amount_pence integer not null)`,
    );
  });

  afterAll(async () => {
    await app.close();
    await db.drop();
  });

  it('requires an Idempotency-Key header', async () => {
    const calls = handler.calls;
    const response = await post(undefined, { amountPence: 500 }).expect(400);
    expect(response.body).toMatchObject({ type: 'urn:voltdrop:problem:idempotency-key-required' });
    expect(handler.calls).toBe(calls);
  });

  it('runs the first request once and replays its response to retries', async () => {
    const key = newId();
    const [calls, payments] = [handler.calls, await paymentCount()];
    const first = await post(key, { amountPence: 500 }).expect(201);
    expect(first.headers['idempotent-replayed']).toBeUndefined();

    const retry = await post(key, { amountPence: 500 }).expect(201);
    expect(retry.body).toEqual(first.body);
    expect(retry.headers['idempotent-replayed']).toBe('true');
    expect(handler.calls).toBe(calls + 1);
    expect(await paymentCount()).toBe(payments + 1);
    expect(await keyRow(key)).toEqual({ status: 'completed', response_status: 201 });
  });

  it('refuses a key reused for a different request', async () => {
    const key = newId();
    await post(key, { amountPence: 500 }).expect(201);
    const response = await post(key, { amountPence: 501 }).expect(422);
    expect(response.body).toMatchObject({ type: 'urn:voltdrop:problem:idempotency-key-reused' });
  });

  it('answers 409 while the first request is still running, then replays it', async () => {
    const key = newId();
    const calls = handler.calls;
    const gate = Promise.withResolvers<undefined>();
    handler.gate = gate.promise;
    const first = post(key, { amountPence: 700 }).then((response) => response);
    await vi.waitFor(() => {
      expect(handler.calls).toBe(calls + 1);
    });

    const concurrent = await post(key, { amountPence: 700 }).expect(409);
    expect(concurrent.body).toMatchObject({
      type: 'urn:voltdrop:problem:idempotency-key-in-progress',
    });

    handler.gate = undefined;
    gate.resolve(undefined);
    expect((await first).status).toBe(201);
    const retry = await post(key, { amountPence: 700 }).expect(201);
    expect(retry.headers['idempotent-replayed']).toBe('true');
    expect(handler.calls).toBe(calls + 1);
  });

  it("rolls back the handler's work and frees the key when the handler fails", async () => {
    const key = newId();
    const payments = await paymentCount();
    handler.failNext = true;
    await post(key, { amountPence: 900 }).expect(500);
    expect(await paymentCount()).toBe(payments);
    expect(await keyRow(key)).toBeUndefined();

    const retry = await post(key, { amountPence: 900 }).expect(201);
    expect(retry.headers['idempotent-replayed']).toBeUndefined();
    expect(await paymentCount()).toBe(payments + 1);
  });

  it('treats a key past its replay window as new', async () => {
    const key = newId();
    await post(key, { amountPence: 300 }).expect(201);
    await expireKey(key);
    const calls = handler.calls;
    const again = await post(key, { amountPence: 301 }).expect(201);
    expect(again.headers['idempotent-replayed']).toBeUndefined();
    expect(handler.calls).toBe(calls + 1);
  });

  it('lets a retry take over an expired lease, and stops the stale attempt committing', async () => {
    const store = app.get(IdempotencyStore);
    const input = { scope: 'anonymous', key: newId(), fingerprint: 'f', replayWindowHours: 24 };
    const stale = lockTokenOf(await store.claim(input));
    expect(await store.claim(input)).toEqual({ outcome: 'in_progress' });

    await database.root.execute(
      sql`update idempotency_keys set locked_until = now() - interval '1 second' where key = ${input.key}`,
    );
    const current = lockTokenOf(await store.claim(input));
    const ref = { scope: input.scope, key: input.key };
    await expect(
      database.transaction((tx) =>
        store.complete(tx, { ...ref, lockToken: stale, status: 201, body: { stale: true } }),
      ),
    ).rejects.toBeInstanceOf(IdempotencyLeaseLostError);
    await database.transaction((tx) =>
      store.complete(tx, { ...ref, lockToken: current, status: 201, body: { ok: true } }),
    );
    expect(await store.claim(input)).toEqual({
      outcome: 'replay',
      status: 201,
      body: { ok: true },
    });
  });

  it('deletes expired keys and keeps the rest', async () => {
    const [keep, expire] = [newId(), newId()];
    await post(keep, { amountPence: 100 }).expect(201);
    await post(expire, { amountPence: 100 }).expect(201);
    await expireKey(expire);
    expect(await app.get(IdempotencyStore).deleteExpired()).toBe(1);
    expect(await keyRow(expire)).toBeUndefined();
    expect(await keyRow(keep)).toBeDefined();
  });
});
