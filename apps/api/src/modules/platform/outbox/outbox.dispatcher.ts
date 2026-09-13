import { Injectable } from '@nestjs/common';
import { newId } from '@voltdrop/domain';
import { eq, inArray, isNull, sql } from 'drizzle-orm';
import { currentCorrelationId, runWithContext } from '../../../core/context/request-context.js';
import { Database } from '../../../core/database/database.js';
import { JobQueue } from '../../../core/jobs/job-queue.js';
import { outbox, outboxDeliveries } from '../schema.js';
import { OutboxHandlerRegistry } from './outbox-handler.registry.js';
import { OutboxHandleTask } from './outbox.tasks.js';

const BATCH_SIZE = 100;

export type DeliveryOutcome = 'delivered' | 'already_delivered';

/** Fans events out to their handlers and runs each handler at most once (ADR-0015). */
@Injectable()
export class OutboxDispatcher {
  constructor(
    private readonly database: Database,
    private readonly jobs: JobQueue,
    private readonly registry: OutboxHandlerRegistry,
  ) {}

  /** Dispatches batches until no undispatched events are left. Returns how many it dispatched. */
  async dispatchPending(batchSize = BATCH_SIZE): Promise<number> {
    let total = 0;
    for (;;) {
      const dispatched = await this.dispatchBatch(batchSize);
      total += dispatched;
      if (dispatched < batchSize) {
        return total;
      }
    }
  }

  /**
   * Claims up to `batchSize` undispatched events, skipping any another dispatcher holds, then
   * enqueues one job per event and handler and marks the events dispatched, all in one transaction.
   */
  async dispatchBatch(batchSize = BATCH_SIZE): Promise<number> {
    return this.database.transaction(async (tx) => {
      const events = await tx
        .select({
          id: outbox.id,
          eventType: outbox.eventType,
          eventVersion: outbox.eventVersion,
          correlationId: outbox.correlationId,
        })
        .from(outbox)
        .where(isNull(outbox.dispatchedAt))
        .orderBy(outbox.id)
        .limit(batchSize)
        .for('update', { skipLocked: true });
      for (const event of events) {
        const handlers = this.registry.handlersFor(event.eventType, event.eventVersion);
        // Each handler job carries the correlation id of the request that published the event.
        await runWithContext({ correlationId: event.correlationId ?? newId() }, async () => {
          for (const handler of handlers) {
            await this.jobs.enqueue(
              tx,
              OutboxHandleTask,
              { eventId: event.id, handler: handler.name },
              { jobKey: `outbox:${event.id}:${handler.name}` },
            );
          }
        });
      }
      if (events.length > 0) {
        await tx
          .update(outbox)
          .set({ dispatchedAt: sql`now()` })
          .where(
            inArray(
              outbox.id,
              events.map((event) => event.id),
            ),
          );
      }
      return events.length;
    });
  }

  /**
   * Runs one handler for one event. The delivery row and the handler's database work commit
   * together, so a retry after success does nothing and a failure leaves nothing behind.
   */
  async deliver(eventId: string, handlerName: string): Promise<DeliveryOutcome> {
    const handler = this.registry.get(handlerName);
    if (handler === undefined) {
      // Thrown, not skipped: during a rolling deploy another worker may know this handler.
      throw new Error(`No outbox handler named "${handlerName}" is registered in this process.`);
    }
    return this.database.transaction(async (tx) => {
      const claimed = await tx
        .insert(outboxDeliveries)
        .values({ eventId, handler: handlerName })
        .onConflictDoNothing()
        .returning({ eventId: outboxDeliveries.eventId });
      if (claimed.length === 0) {
        return 'already_delivered';
      }
      const [event] = await tx.select().from(outbox).where(eq(outbox.id, eventId));
      if (event === undefined) {
        throw new Error(`Outbox event ${eventId} does not exist.`);
      }
      const correlationId = event.correlationId ?? currentCorrelationId() ?? newId();
      await runWithContext({ correlationId }, () =>
        handler.handle(
          {
            id: event.id,
            type: event.eventType,
            version: event.eventVersion,
            aggregateType: event.aggregateType,
            aggregateId: event.aggregateId,
            payload: handler.event.payload.parse(event.payload),
            correlationId,
            occurredAt: event.occurredAt,
          },
          tx,
        ),
      );
      return 'delivered';
    });
  }
}
