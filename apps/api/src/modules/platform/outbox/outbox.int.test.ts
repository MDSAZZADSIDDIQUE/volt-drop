import 'reflect-metadata';
import type { INestApplicationContext } from '@nestjs/common';
import { sql, type SQL } from 'drizzle-orm';
import { runOnce } from 'graphile-worker';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  createContext,
  createTestDatabase,
  integrationEnv,
  type TestDatabase,
} from '../../../../test/integration/harness.js';
import { currentCorrelationId, runWithContext } from '../../../core/context/request-context.js';
import { Database } from '../../../core/database/database.js';
import { TaskRegistry } from '../../../core/jobs/task-registry.js';
import { graphileLogger, WorkerRunner } from '../../../core/jobs/worker-runner.js';
import { createLogger } from '../../../core/logging/logger.js';
import { defineEvent, type OutboxHandler } from './events.js';
import { OutboxHandlerRegistry } from './outbox-handler.registry.js';
import { OutboxDispatcher } from './outbox.dispatcher.js';
import { OutboxService } from './outbox.service.js';

const OfferPriced = defineEvent(
  'offer.priced',
  1,
  z.object({ offerId: z.string(), pence: z.number().int() }),
);

interface JobRow {
  task_identifier: string;
  key: string | null;
  attempts: number;
  last_error: string | null;
}

describe('transactional outbox', () => {
  let db: TestDatabase;
  let app: INestApplicationContext;
  let database: Database;
  let outbox: OutboxService;
  let dispatcher: OutboxDispatcher;
  /** The next delivery of this event to `alerts.flaky` fails, once. */
  let failFlakyFor: string | undefined;

  /** Records each run in `handled`, through the delivery's transaction. */
  const recorder = (name: string): OutboxHandler<typeof OfferPriced.payload> => ({
    name,
    event: OfferPriced,
    async handle(event, tx) {
      if (name === 'alerts.flaky' && event.id === failFlakyFor) {
        failFlakyFor = undefined;
        throw new Error('The flaky handler failed');
      }
      await tx.execute(
        sql`insert into handled (handler, event_id, correlation_id) values (${name}, ${event.id}::uuid, ${currentCorrelationId() ?? null})`,
      );
    },
  });

  const count = async (query: SQL): Promise<number> =>
    (await database.root.execute<{ n: number }>(query)).rows[0]?.n ?? 0;
  const jobs = async (): Promise<JobRow[]> =>
    (
      await database.root.execute<{
        task_identifier: string;
        key: string | null;
        attempts: number;
        last_error: string | null;
      }>(
        sql`select task_identifier, key, attempts, last_error from graphile_worker.jobs order by id`,
      )
    ).rows;
  const handledCount = (handler: string, eventId: string) =>
    count(
      sql`select count(*)::int as n from handled where handler = ${handler} and event_id = ${eventId}::uuid`,
    );
  const publish = (offerId: string) =>
    database.transaction((tx) =>
      outbox.publish(tx, OfferPriced, {
        aggregateType: 'offer',
        aggregateId: offerId,
        payload: { offerId, pence: 1_299 },
      }),
    );

  beforeAll(async () => {
    db = await createTestDatabase();
    app = await createContext(integrationEnv(db.url));
    database = app.get(Database);
    outbox = app.get(OutboxService);
    dispatcher = app.get(OutboxDispatcher);
    app.get(OutboxHandlerRegistry).register(recorder('search.index_offer'));
    app.get(OutboxHandlerRegistry).register(recorder('alerts.flaky'));
    await database.root.execute(
      sql`create table handled (handler text not null, event_id uuid not null, correlation_id text)`,
    );
  });

  afterAll(async () => {
    await app.close();
    await db.drop();
  });

  it('writes nothing, and queues nothing, when the transaction rolls back', async () => {
    await expect(
      database.transaction(async (tx) => {
        await outbox.publish(tx, OfferPriced, {
          aggregateType: 'offer',
          aggregateId: 'offer-0',
          payload: { offerId: 'offer-0', pence: 100 },
        });
        throw new Error('Roll back');
      }),
    ).rejects.toThrow('Roll back');
    expect(await count(sql`select count(*)::int as n from outbox`)).toBe(0);
    expect(await jobs()).toEqual([]);
  });

  it('rejects a payload that does not match the event schema', async () => {
    await expect(
      database.transaction((tx) =>
        outbox.publish(tx, OfferPriced, {
          aggregateType: 'offer',
          aggregateId: 'offer-0',
          payload: { offerId: 'offer-0', pence: 1.5 },
        }),
      ),
    ).rejects.toThrow();
  });

  it('commits events with a single, merged dispatch job', async () => {
    await publish('offer-1');
    await publish('offer-2');
    expect(await count(sql`select count(*)::int as n from outbox`)).toBe(2);
    expect(await jobs()).toMatchObject([
      { task_identifier: 'outbox.dispatch', key: 'outbox.dispatch' },
    ]);
  });

  it('fans out once per event and handler, even with concurrent dispatchers', async () => {
    const dispatched = await Promise.all([
      dispatcher.dispatchPending(1),
      dispatcher.dispatchPending(1),
      dispatcher.dispatchPending(1),
    ]);
    expect(dispatched.reduce((sum, n) => sum + n, 0)).toBe(2);
    expect(
      await count(sql`select count(*)::int as n from outbox where dispatched_at is null`),
    ).toBe(0);

    const handleJobs = (await jobs()).filter((job) => job.task_identifier === 'outbox.handle');
    expect(handleJobs).toHaveLength(4);
    expect(new Set(handleJobs.map((job) => job.key)).size).toBe(4);
  });

  it("runs a handler's database work once, even when its delivery repeats", async () => {
    const eventId = await publish('offer-3');
    expect(await dispatcher.deliver(eventId, 'search.index_offer')).toBe('delivered');
    expect(await dispatcher.deliver(eventId, 'search.index_offer')).toBe('already_delivered');
    expect(await handledCount('search.index_offer', eventId)).toBe(1);
  });

  it('rolls a failed handler back completely, so its retry can succeed', async () => {
    const eventId = await publish('offer-4');
    failFlakyFor = eventId;
    await expect(dispatcher.deliver(eventId, 'alerts.flaky')).rejects.toThrow('flaky');
    expect(
      await count(
        sql`select count(*)::int as n from outbox_deliveries where event_id = ${eventId}::uuid`,
      ),
    ).toBe(0);
    expect(await dispatcher.deliver(eventId, 'alerts.flaky')).toBe('delivered');
    expect(await handledCount('alerts.flaky', eventId)).toBe(1);
  });

  it('refuses a handler this process does not know, so another worker can retry it', async () => {
    const eventId = await publish('offer-5');
    await expect(dispatcher.deliver(eventId, 'nobody.listens')).rejects.toThrow(
      /No outbox handler/,
    );
  });

  it('runs end to end on Graphile Worker, retrying a failed handler with backoff', async () => {
    const eventId = await runWithContext({ correlationId: 'corr-outbox-e2e' }, () =>
      publish('offer-6'),
    );
    failFlakyFor = eventId;
    const env = integrationEnv(db.url);
    const options = {
      pgPool: database.pool,
      taskList: app.get(TaskRegistry).taskList(),
      noHandleSignals: true,
      logger: graphileLogger(createLogger(env)),
    };

    await runOnce(options);
    expect(await handledCount('search.index_offer', eventId)).toBe(1);
    expect(await handledCount('alerts.flaky', eventId)).toBe(0);
    // Graphile Worker records a failure without awaiting it (worker.js calls failJob and moves on),
    // so for a moment the row can show the attempt but not yet its error. Wait for the record.
    await vi.waitFor(async () => {
      const failed = (await jobs()).find((job) => job.key === `outbox:${eventId}:alerts.flaky`);
      expect(failed?.attempts, JSON.stringify(failed)).toBe(1);
      expect(failed?.last_error, JSON.stringify(failed)).toContain('flaky');
    });

    // Graphile Worker retries after about e^1 seconds.
    await vi.waitFor(
      async () => {
        await runOnce(options);
        expect(await handledCount('alerts.flaky', eventId)).toBe(1);
      },
      { timeout: 15_000, interval: 1_000 },
    );
    const correlationIds = await database.root.execute<{ correlation_id: string }>(
      sql`select distinct correlation_id from handled where event_id = ${eventId}::uuid`,
    );
    expect(correlationIds.rows).toEqual([{ correlation_id: 'corr-outbox-e2e' }]);
  });

  it('delivers through the worker process until it is stopped', async () => {
    const runner = app.get(WorkerRunner);
    await runner.start({ concurrency: 2 });
    try {
      const eventId = await publish('offer-7');
      await vi.waitFor(
        async () => {
          expect(await handledCount('search.index_offer', eventId)).toBe(1);
          expect(await handledCount('alerts.flaky', eventId)).toBe(1);
        },
        { timeout: 15_000, interval: 250 },
      );
    } finally {
      await runner.stop();
    }
  });
});
