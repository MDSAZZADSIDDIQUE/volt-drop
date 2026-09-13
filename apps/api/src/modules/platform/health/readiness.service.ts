import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { Redis } from 'ioredis';
import { ENV } from '../../../config/config.module.js';
import type { Env } from '../../../config/env.js';
import { Database } from '../../../core/database/database.js';
import { MigrationStatus } from '../../../core/database/migration-status.js';
import { pingValkey, VALKEY } from '../../../core/valkey/valkey.js';

export type CheckStatus = 'up' | 'down';

export interface ReadinessChecks {
  readonly postgres: CheckStatus;
  readonly migrations: CheckStatus;
  readonly valkey: CheckStatus;
  readonly typesense: CheckStatus;
}

export interface ReadinessReport {
  readonly status: 'ready' | 'degraded' | 'unavailable';
  readonly checks: ReadinessChecks;
}

/** Each check gives up after this long, so a hung dependency can't hang the probe. */
const CHECK_TIMEOUT_MS = 2_000;

async function runCheck(probe: () => Promise<boolean>): Promise<CheckStatus> {
  let timer: NodeJS.Timeout | undefined;
  const timedOut = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => {
      resolve(false);
    }, CHECK_TIMEOUT_MS);
  });
  try {
    return (await Promise.race([probe(), timedOut])) ? 'up' : 'down';
  } catch {
    return 'down';
  } finally {
    clearTimeout(timer);
  }
}

@Injectable()
export class ReadinessService {
  constructor(
    private readonly database: Database,
    private readonly migrations: MigrationStatus,
    @Inject(VALKEY) private readonly valkey: Redis,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async check(): Promise<ReadinessReport> {
    const [postgres, migrations, valkey, typesense] = await Promise.all([
      runCheck(async () => {
        await this.database.root.execute(sql`select 1`);
        return true;
      }),
      runCheck(() => this.migrations.isUpToDate()),
      runCheck(() => pingValkey(this.valkey)),
      runCheck(() => this.typesenseHealthy()),
    ]);
    const checks = { postgres, migrations, valkey, typesense };
    // Only PostgreSQL (with every migration applied) and Valkey are required (M0 plan §6). Without
    // Typesense, search is unavailable but orders still work, so the API reports itself degraded.
    if (postgres === 'down' || migrations === 'down' || valkey === 'down') {
      return { status: 'unavailable', checks };
    }
    return { status: typesense === 'up' ? 'ready' : 'degraded', checks };
  }

  private async typesenseHealthy(): Promise<boolean> {
    const response = await fetch(new URL('/health', this.env.TYPESENSE_URL), {
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    });
    if (!response.ok) {
      return false;
    }
    const body: unknown = await response.json();
    return typeof body === 'object' && body !== null && 'ok' in body && body.ok === true;
  }
}
