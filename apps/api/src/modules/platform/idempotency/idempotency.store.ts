import { Injectable } from '@nestjs/common';
import { newId } from '@voltdrop/domain';
import { and, eq, lte, sql } from 'drizzle-orm';
import { Database, type Transaction } from '../../../core/database/database.js';
import { idempotencyKeys } from '../schema.js';

/** How long a request holds its key before another attempt may take it over (ADR-0014). */
export const LEASE_SECONDS = 60;

export interface ClaimInput {
  readonly scope: string;
  readonly key: string;
  readonly fingerprint: string;
  readonly replayWindowHours: number;
}

export type Claim =
  | { readonly outcome: 'claimed'; readonly lockToken: string }
  | { readonly outcome: 'replay'; readonly status: number; readonly body: unknown }
  | { readonly outcome: 'reused' }
  | { readonly outcome: 'in_progress' };

export interface KeyRef {
  readonly scope: string;
  readonly key: string;
  readonly lockToken: string;
}

/** The request lost its key to another attempt (its lease ran out), so its work must not commit. */
export class IdempotencyLeaseLostError extends Error {
  constructor() {
    super('The idempotency lease expired and another attempt took the key over.');
    this.name = 'IdempotencyLeaseLostError';
  }
}

@Injectable()
export class IdempotencyStore {
  constructor(private readonly database: Database) {}

  /** Phase 1, in its own short transaction: claim the key, or say why the request can't run. */
  async claim({ scope, key, fingerprint, replayWindowHours }: ClaimInput): Promise<Claim> {
    const lockToken = newId();
    const fresh = {
      fingerprint,
      status: 'in_progress' as const,
      lockToken,
      lockedUntil: sql`now() + ${LEASE_SECONDS}::integer * interval '1 second'`,
      responseStatus: null,
      responseBody: null,
      createdAt: sql`now()`,
      completedAt: null,
      expiresAt: sql`now() + ${replayWindowHours}::integer * interval '1 hour'`,
    };
    const byKey = and(eq(idempotencyKeys.scope, scope), eq(idempotencyKeys.key, key));

    return this.database.root.transaction(async (tx): Promise<Claim> => {
      const inserted = await tx
        .insert(idempotencyKeys)
        .values({ scope, key, ...fresh })
        .onConflictDoNothing()
        .returning({ key: idempotencyKeys.key });
      if (inserted.length > 0) {
        return { outcome: 'claimed', lockToken };
      }

      const [existing] = await tx
        .select({
          fingerprint: idempotencyKeys.fingerprint,
          status: idempotencyKeys.status,
          responseStatus: idempotencyKeys.responseStatus,
          responseBody: idempotencyKeys.responseBody,
          expired: sql<boolean>`${idempotencyKeys.expiresAt} <= now()`,
          leaseActive: sql<boolean>`coalesce(${idempotencyKeys.lockedUntil} > now(), false)`,
        })
        .from(idempotencyKeys)
        .where(byKey)
        .for('update');
      if (existing === undefined) {
        // Deleted by the cleanup job a moment ago. Asking the client to retry is enough.
        return { outcome: 'in_progress' };
      }
      if (!existing.expired) {
        if (existing.fingerprint !== fingerprint) {
          return { outcome: 'reused' };
        }
        if (existing.status === 'completed' && existing.responseStatus !== null) {
          return {
            outcome: 'replay',
            status: existing.responseStatus,
            body: existing.responseBody,
          };
        }
        if (existing.leaseActive) {
          return { outcome: 'in_progress' };
        }
      }
      // Past the replay window, or an earlier attempt stopped without finishing: start afresh.
      await tx.update(idempotencyKeys).set(fresh).where(byKey);
      return { outcome: 'claimed', lockToken };
    });
  }

  /**
   * Phase 2, inside the handler's transaction: store the response. If another attempt has taken
   * the key over, this throws, which rolls the handler's work back.
   */
  async complete(
    tx: Transaction,
    { scope, key, lockToken, status, body }: KeyRef & { status: number; body: unknown },
  ): Promise<void> {
    const updated = await tx
      .update(idempotencyKeys)
      .set({
        status: 'completed',
        responseStatus: status,
        responseBody: body ?? null,
        completedAt: sql`now()`,
        lockToken: null,
        lockedUntil: null,
      })
      .where(
        and(
          eq(idempotencyKeys.scope, scope),
          eq(idempotencyKeys.key, key),
          eq(idempotencyKeys.lockToken, lockToken),
        ),
      )
      .returning({ key: idempotencyKeys.key });
    if (updated.length === 0) {
      throw new IdempotencyLeaseLostError();
    }
  }

  /** After a failure: remove the claim so the client can retry with the same key. */
  async release({ scope, key, lockToken }: KeyRef): Promise<void> {
    await this.database.root
      .delete(idempotencyKeys)
      .where(
        and(
          eq(idempotencyKeys.scope, scope),
          eq(idempotencyKeys.key, key),
          eq(idempotencyKeys.lockToken, lockToken),
          eq(idempotencyKeys.status, 'in_progress'),
        ),
      );
  }

  /** Deletes keys past their replay window (nightly job). Returns how many it deleted. */
  async deleteExpired(): Promise<number> {
    const result = await this.database.root
      .delete(idempotencyKeys)
      .where(lte(idempotencyKeys.expiresAt, sql`now()`));
    return result.rowCount ?? 0;
  }
}
