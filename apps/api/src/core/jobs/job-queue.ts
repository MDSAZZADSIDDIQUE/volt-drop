import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { z } from 'zod';
import { currentCorrelationId } from '../context/request-context.js';
import type { Transaction } from '../database/database.js';
import { JOB_META_KEY, type TaskDefinition } from './task.js';

export interface EnqueueOptions {
  /** Run no earlier than this. Defaults to now. */
  readonly runAt?: Date;
  /** Defaults to Graphile Worker's 25 attempts, with exponential backoff between them. */
  readonly maxAttempts?: number;
  /** Jobs in one named queue run one at a time, in order. Use a small, fixed set of names. */
  readonly queueName?: string;
  /** Lower numbers run first. Defaults to 0. */
  readonly priority?: number;
  /** At most one pending job per key: enqueueing again replaces the pending job. */
  readonly jobKey?: string;
  /** `replace` (the default) also moves the run time; `preserve_run_at` keeps the earlier one. */
  readonly jobKeyMode?: 'replace' | 'preserve_run_at';
}

/**
 * The only way modules enqueue background jobs (ADR-0015). The job is written through the caller's
 * transaction, so it exists only if the state change that caused it commits.
 */
@Injectable()
export class JobQueue {
  async enqueue<TPayload extends z.ZodObject>(
    tx: Transaction,
    task: TaskDefinition<TPayload>,
    payload: z.input<TPayload>,
    options: EnqueueOptions = {},
  ): Promise<void> {
    const parsed = task.payload.parse(payload);
    const correlationId = currentCorrelationId();
    const body =
      correlationId === undefined ? parsed : { ...parsed, [JOB_META_KEY]: { correlationId } };
    await tx.execute(sql`
      select graphile_worker.add_job(
        identifier => ${task.name}::text,
        payload => ${JSON.stringify(body)}::json,
        queue_name => ${options.queueName ?? null}::text,
        run_at => ${options.runAt?.toISOString() ?? null}::timestamptz,
        max_attempts => ${options.maxAttempts ?? null}::integer,
        job_key => ${options.jobKey ?? null}::text,
        priority => ${options.priority ?? null}::integer,
        job_key_mode => ${options.jobKeyMode ?? 'replace'}::text
      )`);
  }
}
