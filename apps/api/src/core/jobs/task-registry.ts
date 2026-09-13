import { Injectable } from '@nestjs/common';
import { newId } from '@voltdrop/domain';
import type { CronItem, JobHelpers, TaskList } from 'graphile-worker';
import type { z } from 'zod';
import { runWithContext } from '../context/request-context.js';
import { JOB_META_KEY, type TaskDefinition } from './task.js';

export interface TaskContext {
  readonly jobId: string;
  /** 1 on the first run, 2 on the first retry, and so on. */
  readonly attempt: number;
  readonly maxAttempts: number;
}

export type TaskHandler<TPayload extends z.ZodObject> = (
  payload: z.output<TPayload>,
  context: TaskContext,
) => Promise<void>;

export interface Schedule {
  readonly task: TaskDefinition;
  /** Five-field cron pattern, evaluated in UTC. ADR-0015 explains Europe/London schedules. */
  readonly match: string;
  /** Stable name that Graphile Worker uses to avoid scheduling the same run twice. */
  readonly identifier: string;
  readonly jobKey?: string;
}

interface Registration {
  readonly task: TaskDefinition;
  readonly handler: TaskHandler<z.ZodObject>;
}

/** Payload members starting with "_" are job metadata (ours and Graphile's `_cron`), not task input. */
function splitPayload(payload: unknown): {
  input: Record<string, unknown>;
  correlationId?: string;
} {
  const input: Record<string, unknown> = {};
  let correlationId: string | undefined;
  if (typeof payload === 'object' && payload !== null) {
    for (const [key, value] of Object.entries(payload)) {
      if (!key.startsWith('_')) {
        input[key] = value;
      } else if (key === JOB_META_KEY && typeof value === 'object' && value !== null) {
        const candidate = (value as Record<string, unknown>).correlationId;
        correlationId = typeof candidate === 'string' ? candidate : undefined;
      }
    }
  }
  return correlationId === undefined ? { input } : { input, correlationId };
}

/**
 * Where modules register background task handlers and schedules (ADR-0015). Both processes build
 * it; only the worker runs what is registered.
 */
@Injectable()
export class TaskRegistry {
  private readonly registrations = new Map<string, Registration>();
  private readonly schedules: Schedule[] = [];

  register<TPayload extends z.ZodObject>(
    task: TaskDefinition<TPayload>,
    handler: TaskHandler<TPayload>,
  ): void {
    if (this.registrations.has(task.name)) {
      throw new Error(`Task "${task.name}" is already registered.`);
    }
    this.registrations.set(task.name, { task, handler });
  }

  schedule(schedule: Schedule): void {
    if (this.schedules.some((existing) => existing.identifier === schedule.identifier)) {
      throw new Error(`Schedule "${schedule.identifier}" is already registered.`);
    }
    this.schedules.push(schedule);
  }

  /** Graphile Worker's task list. Each job runs in a context carrying its enqueuer's correlation id. */
  taskList(): TaskList {
    const list: TaskList = {};
    for (const [name, { task, handler }] of this.registrations) {
      list[name] = async (payload: unknown, helpers: JobHelpers): Promise<void> => {
        const { input, correlationId } = splitPayload(payload);
        const parsed = task.payload.parse(input);
        const { job } = helpers;
        await runWithContext({ correlationId: correlationId ?? newId() }, () =>
          handler(parsed, { jobId: job.id, attempt: job.attempts, maxAttempts: job.max_attempts }),
        );
      };
    }
    return list;
  }

  cronItems(): CronItem[] {
    return this.schedules.map((schedule) => {
      if (!this.registrations.has(schedule.task.name)) {
        throw new Error(
          `Schedule "${schedule.identifier}" runs "${schedule.task.name}", which has no handler.`,
        );
      }
      return {
        task: schedule.task.name,
        match: schedule.match,
        identifier: schedule.identifier,
        // Missed runs are not backfilled: every scheduled task catches up on its own next run.
        options:
          schedule.jobKey === undefined
            ? { backfillPeriod: 0 }
            : { backfillPeriod: 0, jobKey: schedule.jobKey },
      };
    });
  }
}
