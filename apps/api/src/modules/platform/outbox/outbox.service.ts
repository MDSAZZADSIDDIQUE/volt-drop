import { Injectable } from '@nestjs/common';
import { newId } from '@voltdrop/domain';
import type { z } from 'zod';
import { currentCorrelationId } from '../../../core/context/request-context.js';
import type { Transaction } from '../../../core/database/database.js';
import { JobQueue } from '../../../core/jobs/job-queue.js';
import { outbox } from '../schema.js';
import type { EventDefinition } from './events.js';
import { OUTBOX_DISPATCH_JOB_KEY, OutboxDispatchTask } from './outbox.tasks.js';

export interface PublishInput<TPayload extends z.ZodObject> {
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly payload: z.input<TPayload>;
}

/** Publishes domain events through the transactional outbox (spec §4, ADR-0015). */
@Injectable()
export class OutboxService {
  constructor(private readonly jobs: JobQueue) {}

  /**
   * Records the event in the caller's transaction and schedules its dispatch. If the transaction
   * rolls back, neither exists. Returns the event id.
   */
  async publish<TPayload extends z.ZodObject>(
    tx: Transaction,
    event: EventDefinition<TPayload>,
    { aggregateType, aggregateId, payload }: PublishInput<TPayload>,
  ): Promise<string> {
    const id = newId();
    await tx.insert(outbox).values({
      id,
      aggregateType,
      aggregateId,
      eventType: event.type,
      eventVersion: event.version,
      payload: event.payload.parse(payload),
      correlationId: currentCorrelationId() ?? null,
    });
    await this.jobs.enqueue(tx, OutboxDispatchTask, {}, { jobKey: OUTBOX_DISPATCH_JOB_KEY });
    return id;
  }
}
