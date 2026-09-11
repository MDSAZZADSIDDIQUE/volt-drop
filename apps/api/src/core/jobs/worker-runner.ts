import { Inject, Injectable } from '@nestjs/common';
import { Logger as GraphileLogger, parseCronItems, run, type Runner } from 'graphile-worker';
import type pg from 'pg';
import type { Logger } from 'pino';
import { PG_POOL } from '../database/database.js';
import { LOGGER } from '../logging/logger.js';
import { TaskRegistry } from './task-registry.js';

/**
 * Sends Graphile Worker's log lines through pino. Its per-job "info" lines become debug, so the
 * default level shows only warnings and failures from the queue.
 */
export function graphileLogger(logger: Logger): GraphileLogger {
  return new GraphileLogger((scope) => (level, message, meta) => {
    const fields = { ...meta, queue: scope };
    if (level === 'error') {
      logger.error(fields, message);
    } else if (level === 'warning') {
      logger.warn(fields, message);
    } else {
      logger.debug(fields, message);
    }
  });
}

export interface WorkerRunnerOptions {
  /** How many jobs this process runs at once. */
  readonly concurrency: number;
}

/** Runs the registered tasks and schedules on Graphile Worker (the `worker` process, spec §4). */
@Injectable()
export class WorkerRunner {
  private runner: Runner | undefined;

  constructor(
    @Inject(PG_POOL) private readonly pool: pg.Pool,
    private readonly registry: TaskRegistry,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {}

  async start({ concurrency }: WorkerRunnerOptions): Promise<void> {
    if (this.runner !== undefined) {
      throw new Error('The worker is already running.');
    }
    this.runner = await run({
      pgPool: this.pool,
      taskList: this.registry.taskList(),
      parsedCronItems: parseCronItems(this.registry.cronItems()),
      concurrency,
      // The entrypoint handles SIGTERM and SIGINT, so shutdown also closes the Nest context.
      noHandleSignals: true,
      pollInterval: 1_000,
      logger: graphileLogger(this.logger),
    });
  }

  /** Stops taking new jobs and waits for running ones to finish. */
  async stop(): Promise<void> {
    const runner = this.runner;
    this.runner = undefined;
    await runner?.stop();
  }
}
