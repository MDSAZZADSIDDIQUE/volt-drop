import { Injectable, type OnModuleInit } from '@nestjs/common';
import { TaskRegistry } from '../../core/jobs/task-registry.js';
import { IdempotencyStore } from './idempotency/idempotency.store.js';
import { IdempotencyCleanupTask } from './idempotency/idempotency.tasks.js';
import { OutboxDispatcher } from './outbox/outbox.dispatcher.js';
import {
  OUTBOX_DISPATCH_JOB_KEY,
  OutboxDispatchTask,
  OutboxHandleTask,
} from './outbox/outbox.tasks.js';

/** Registers the platform's background tasks and schedules (M0 plan §7). */
@Injectable()
export class PlatformTasks implements OnModuleInit {
  constructor(
    private readonly registry: TaskRegistry,
    private readonly dispatcher: OutboxDispatcher,
    private readonly idempotency: IdempotencyStore,
  ) {}

  onModuleInit(): void {
    this.registry.register(OutboxDispatchTask, async () => {
      await this.dispatcher.dispatchPending();
    });
    this.registry.register(OutboxHandleTask, async ({ eventId, handler }) => {
      await this.dispatcher.deliver(eventId, handler);
    });
    this.registry.register(IdempotencyCleanupTask, async () => {
      await this.idempotency.deleteExpired();
    });

    // Catches events whose dispatch job was lost or gave up.
    this.registry.schedule({
      task: OutboxDispatchTask,
      match: '* * * * *',
      identifier: 'outbox.dispatch_sweep',
      jobKey: OUTBOX_DISPATCH_JOB_KEY,
    });
    // 03:30 UTC. The time of day doesn't matter for this job, so UTC is fine (ADR-0015).
    this.registry.schedule({
      task: IdempotencyCleanupTask,
      match: '30 3 * * *',
      identifier: 'platform.idempotency_cleanup',
    });
  }
}
