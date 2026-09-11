import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { Database, type Transaction } from '../../../core/database/database.js';
import { PROBLEMS, ProblemException } from '../../../core/problems/problem.js';
import { CLOCK, type Clock } from '../../../core/time/clock.js';
import { featureFlags } from '../schema.js';
import {
  resolveFlag,
  type FlagContext,
  type FlagDefinition,
  type FlagScope,
  type FlagSetting,
} from './flags.js';

export interface SetFlagInput {
  readonly enabled: boolean;
  /** The version being replaced. Omit it only to create a setting that doesn't exist yet. */
  readonly expectedVersion?: number;
  /** The staff user making the change; null for system changes. */
  readonly updatedBy: string | null;
  readonly reason: string;
}

const CACHE_TTL_MS = 5_000;

/** Database-backed feature flags (spec §4, §6; ADR-0016). */
@Injectable()
export class FeatureFlagService {
  private readonly cache = new Map<
    string,
    { readonly loadedAt: number; readonly settings: readonly FlagSetting[] }
  >();

  constructor(
    private readonly database: Database,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Cached per process for up to 5 seconds, so a change takes effect everywhere within that time. */
  async isEnabled(flag: FlagDefinition, context: FlagContext = {}): Promise<boolean> {
    return resolveFlag(flag, await this.settings(flag.key), context);
  }

  /**
   * Creates or changes the setting for one scope, with optimistic locking: a stale
   * `expectedVersion` fails with a conflict. TODO(M2): write an audit entry (invariant 8).
   */
  async set(
    tx: Transaction,
    flag: FlagDefinition,
    scope: FlagScope,
    { enabled, expectedVersion, updatedBy, reason }: SetFlagInput,
  ): Promise<{ version: number }> {
    const scopeId = scope.type === 'global' ? '' : scope.id;
    if (scope.type !== 'global' && scopeId === '') {
      throw new Error(`A ${scope.type} flag setting needs a scope id.`);
    }
    const rows =
      expectedVersion === undefined
        ? await tx
            .insert(featureFlags)
            .values({ key: flag.key, scopeType: scope.type, scopeId, enabled, updatedBy, reason })
            .onConflictDoNothing()
            .returning({ version: featureFlags.version })
        : await tx
            .update(featureFlags)
            .set({
              enabled,
              updatedBy,
              reason,
              version: sql`${featureFlags.version} + 1`,
              updatedAt: sql`now()`,
            })
            .where(
              and(
                eq(featureFlags.key, flag.key),
                eq(featureFlags.scopeType, scope.type),
                eq(featureFlags.scopeId, scopeId),
                eq(featureFlags.version, expectedVersion),
              ),
            )
            .returning({ version: featureFlags.version });
    const [row] = rows;
    if (row === undefined) {
      throw new ProblemException({
        ...PROBLEMS.conflict,
        detail: 'This flag was changed by someone else. Reload it and try again.',
      });
    }
    this.cache.delete(flag.key);
    return row;
  }

  private async settings(key: string): Promise<readonly FlagSetting[]> {
    const now = this.clock.now().getTime();
    const cached = this.cache.get(key);
    if (cached !== undefined && now - cached.loadedAt < CACHE_TTL_MS) {
      return cached.settings;
    }
    const settings = await this.database.executor
      .select({
        scopeType: featureFlags.scopeType,
        scopeId: featureFlags.scopeId,
        enabled: featureFlags.enabled,
      })
      .from(featureFlags)
      .where(eq(featureFlags.key, key));
    this.cache.set(key, { loadedAt: now, settings });
    return settings;
  }
}
