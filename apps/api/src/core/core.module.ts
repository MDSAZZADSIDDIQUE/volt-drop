import {
  Global,
  Inject,
  Injectable,
  Module,
  type DynamicModule,
  type OnApplicationShutdown,
} from '@nestjs/common';
import type { Redis } from 'ioredis';
import type pg from 'pg';
import type { Logger } from 'pino';
import type { Env } from '../config/env.js';
import { createPool, Database, PG_POOL } from './database/database.js';
import { MigrationStatus } from './database/migration-status.js';
import { JobQueue } from './jobs/job-queue.js';
import { TaskRegistry } from './jobs/task-registry.js';
import { LOGGER } from './logging/logger.js';
import { CLOCK, systemClock } from './time/clock.js';
import { createValkey, VALKEY } from './valkey/valkey.js';

export interface CoreModuleOptions {
  readonly logger: Logger;
  /** `voltdrop-api` or `voltdrop-worker`; shown in pg_stat_activity. */
  readonly service: string;
}

/** Closes connections when the application shuts down. */
@Injectable()
class CoreLifecycle implements OnApplicationShutdown {
  constructor(
    @Inject(PG_POOL) private readonly pool: pg.Pool,
    @Inject(VALKEY) private readonly valkey: Redis,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    this.valkey.disconnect();
    await this.pool.end();
  }
}

/**
 * Infrastructure shared by every module in both processes: logger, clock, PostgreSQL, Valkey and
 * the job queue. Nothing connects until first use, so tests without Docker can still build the app.
 */
@Global()
@Module({})
export class CoreModule {
  static forRoot(env: Env, { logger, service }: CoreModuleOptions): DynamicModule {
    return {
      module: CoreModule,
      providers: [
        { provide: LOGGER, useValue: logger },
        { provide: CLOCK, useValue: systemClock },
        {
          provide: PG_POOL,
          useFactory: (): pg.Pool => {
            const pool = createPool({
              connectionString: env.DATABASE_URL,
              applicationName: service,
            });
            // Without a listener, an idle connection dropped by the server would crash the process.
            pool.on('error', (error) => {
              logger.warn({ err: error }, 'An idle database connection failed');
            });
            // Graphile Worker shares this pool and expects every client to handle its own errors.
            pool.on('connect', (client) => {
              client.on('error', (error) => {
                logger.warn({ err: error }, 'A database connection failed');
              });
            });
            return pool;
          },
        },
        {
          provide: Database,
          useFactory: (pool: pg.Pool) => new Database(pool),
          inject: [PG_POOL],
        },
        {
          provide: MigrationStatus,
          useFactory: (database: Database) => new MigrationStatus(database),
          inject: [Database],
        },
        { provide: VALKEY, useFactory: () => createValkey(env.REDIS_URL, logger) },
        JobQueue,
        TaskRegistry,
        CoreLifecycle,
      ],
      exports: [LOGGER, CLOCK, PG_POOL, Database, MigrationStatus, VALKEY, JobQueue, TaskRegistry],
    };
  }
}
