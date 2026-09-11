import { Inject, Injectable } from '@nestjs/common';
import type { PolicyDefinition } from '@voltdrop/domain';
import { and, desc, eq, lte, sql } from 'drizzle-orm';
import type { z } from 'zod';
import { Database, type Transaction } from '../../../core/database/database.js';
import { validationProblem } from '../../../core/problems/problem.js';
import { CLOCK, type Clock } from '../../../core/time/clock.js';
import { policyVersions } from '../schema.js';

export interface PolicyValue<T> {
  readonly key: string;
  readonly version: number;
  readonly value: T;
  readonly effectiveFrom: Date;
}

export interface PublishPolicyInput {
  readonly effectiveFrom: Date;
  /** The staff user making the change; null for system changes. */
  readonly authorId: string | null;
  readonly reason: string;
}

/**
 * A policy has no version in force, or a stored value no longer fits its schema. Both are
 * deployment errors (a missing seed, a bad manual insert), never something a user can fix.
 */
export class PolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PolicyError';
  }
}

const CACHE_TTL_MS = 5_000;

interface StoredVersion {
  readonly version: number;
  readonly value: unknown;
  readonly effectiveFrom: Date;
}

const storedColumns = {
  version: policyVersions.version,
  value: policyVersions.value,
  effectiveFrom: policyVersions.effectiveFrom,
};

/** Reads and publishes versioned policy values (spec §3, §7). */
@Injectable()
export class PolicyService {
  private readonly cache = new Map<
    string,
    { readonly loadedAt: number; readonly stored: StoredVersion }
  >();

  constructor(
    private readonly database: Database,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * The version in force: the highest version whose `effective_from` has passed. Cached per process
   * for up to 5 seconds, so a published change takes effect everywhere within that time.
   */
  async current<TSchema extends z.ZodType>(
    policy: PolicyDefinition<TSchema>,
  ): Promise<PolicyValue<z.output<TSchema>>> {
    const now = this.clock.now();
    const cached = this.cache.get(policy.key);
    if (cached !== undefined && now.getTime() - cached.loadedAt < CACHE_TTL_MS) {
      return this.parse(policy, cached.stored);
    }
    const [stored] = await this.database.executor
      .select(storedColumns)
      .from(policyVersions)
      .where(and(eq(policyVersions.key, policy.key), lte(policyVersions.effectiveFrom, now)))
      .orderBy(desc(policyVersions.version))
      .limit(1);
    if (stored === undefined) {
      throw new PolicyError(`Policy "${policy.key}" has no version in force.`);
    }
    this.cache.set(policy.key, { loadedAt: now.getTime(), stored });
    return this.parse(policy, stored);
  }

  /** A specific version, for records that locked one (for example a cart's price lock). */
  async version<TSchema extends z.ZodType>(
    policy: PolicyDefinition<TSchema>,
    version: number,
  ): Promise<PolicyValue<z.output<TSchema>>> {
    const [stored] = await this.database.executor
      .select(storedColumns)
      .from(policyVersions)
      .where(and(eq(policyVersions.key, policy.key), eq(policyVersions.version, version)))
      .limit(1);
    if (stored === undefined) {
      throw new PolicyError(`Policy "${policy.key}" has no version ${String(version)}.`);
    }
    return this.parse(policy, stored);
  }

  /**
   * Adds the next version. Existing versions are never changed; a database trigger enforces it.
   * TODO(M2): write an audit entry with the author and reason (invariant 8).
   */
  async publish<TSchema extends z.ZodType>(
    tx: Transaction,
    policy: PolicyDefinition<TSchema>,
    value: z.input<TSchema>,
    { effectiveFrom, authorId, reason }: PublishPolicyInput,
  ): Promise<PolicyValue<z.output<TSchema>>> {
    const parsed = policy.schema.safeParse(value);
    if (!parsed.success) {
      throw validationProblem(
        parsed.error.issues.map((issue) => ({
          path: issue.path.map(String).join('.'),
          message: issue.message,
        })),
      );
    }
    const [stored] = await tx
      .insert(policyVersions)
      .values({
        key: policy.key,
        version: sql`(select coalesce(max(${policyVersions.version}), 0) + 1 from ${policyVersions} where ${policyVersions.key} = ${policy.key})`,
        value: parsed.data,
        effectiveFrom,
        authorId,
        reason,
      })
      .returning(storedColumns);
    if (stored === undefined) {
      throw new PolicyError(`Publishing policy "${policy.key}" returned no row.`);
    }
    this.cache.delete(policy.key);
    return { key: policy.key, version: stored.version, value: parsed.data, effectiveFrom };
  }

  private parse<TSchema extends z.ZodType>(
    policy: PolicyDefinition<TSchema>,
    stored: StoredVersion,
  ): PolicyValue<z.output<TSchema>> {
    const parsed = policy.schema.safeParse(stored.value);
    if (!parsed.success) {
      throw new PolicyError(
        `Policy "${policy.key}" version ${String(stored.version)} doesn't match its schema.`,
      );
    }
    return {
      key: policy.key,
      version: stored.version,
      value: parsed.data,
      effectiveFrom: stored.effectiveFrom,
    };
  }
}
