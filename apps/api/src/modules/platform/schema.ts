// Platform tables (spec §5, §7; M0 plan §5). Only drizzle-orm imports here: drizzle-kit loads this file.
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

const timestamptz = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });

/**
 * Versioned policy values (spec §3). Append-only: migration 0002 adds a trigger that rejects
 * updates, deletes and truncation, so the history of every setting is kept.
 */
export const policyVersions = pgTable(
  'policy_versions',
  {
    key: text('key').notNull(),
    version: integer('version').notNull(),
    value: jsonb('value').notNull(),
    effectiveFrom: timestamptz('effective_from').notNull(),
    /** The staff user who made the change; null for system changes such as the version 1 seed. */
    authorId: uuid('author_id'),
    reason: text('reason').notNull(),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ name: 'policy_versions_pkey', columns: [table.key, table.version] }),
    check('policy_versions_version_positive', sql`${table.version} >= 1`),
    check('policy_versions_reason_present', sql`length(trim(${table.reason})) > 0`),
  ],
);

export const FLAG_SCOPE_TYPES = ['global', 'zone', 'merchant', 'user_segment'] as const;
export type FlagScopeType = (typeof FLAG_SCOPE_TYPES)[number];

/** Feature flags (spec §6, ADR-0016). A global row has an empty scope_id. */
export const featureFlags = pgTable(
  'feature_flags',
  {
    key: text('key').notNull(),
    scopeType: text('scope_type', { enum: FLAG_SCOPE_TYPES }).notNull(),
    scopeId: text('scope_id').notNull().default(''),
    enabled: boolean('enabled').notNull(),
    /** Optimistic locking: every change must name the version it replaces. */
    version: integer('version').notNull().default(1),
    updatedBy: uuid('updated_by'),
    reason: text('reason').notNull(),
    updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      name: 'feature_flags_pkey',
      columns: [table.key, table.scopeType, table.scopeId],
    }),
    check(
      'feature_flags_scope_type_known',
      sql`${table.scopeType} in ('global', 'zone', 'merchant', 'user_segment')`,
    ),
    check(
      'feature_flags_scope_id_matches_type',
      sql`(${table.scopeType} = 'global') = (${table.scopeId} = '')`,
    ),
  ],
);

/**
 * Domain events, written in the same transaction as the change they describe (ADR-0015). Payloads
 * carry identifiers, not personal data.
 */
export const outbox = pgTable(
  'outbox',
  {
    /** UUIDv7, so ordering by id is ordering by time. */
    id: uuid('id').primaryKey(),
    aggregateType: text('aggregate_type').notNull(),
    aggregateId: text('aggregate_id').notNull(),
    eventType: text('event_type').notNull(),
    eventVersion: integer('event_version').notNull(),
    payload: jsonb('payload').notNull(),
    correlationId: text('correlation_id'),
    occurredAt: timestamptz('occurred_at').notNull().defaultNow(),
    dispatchedAt: timestamptz('dispatched_at'),
  },
  (table) => [
    index('outbox_undispatched_idx')
      .on(table.id)
      .where(sql`${table.dispatchedAt} is null`),
  ],
);

/** One row per event and handler that has run, so a handler's database work happens once. */
export const outboxDeliveries = pgTable(
  'outbox_deliveries',
  {
    eventId: uuid('event_id')
      .notNull()
      .references(() => outbox.id, { onDelete: 'cascade' }),
    handler: text('handler').notNull(),
    deliveredAt: timestamptz('delivered_at').notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ name: 'outbox_deliveries_pkey', columns: [table.eventId, table.handler] }),
  ],
);

export const IDEMPOTENCY_STATUSES = ['in_progress', 'completed'] as const;

/** Replay protection for requests with an Idempotency-Key (spec §6, ADR-0014). */
export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    scope: text('scope').notNull(),
    key: text('key').notNull(),
    /** SHA-256 of the method, path and canonical body: detects a key reused for another request. */
    fingerprint: text('fingerprint').notNull(),
    status: text('status', { enum: IDEMPOTENCY_STATUSES }).notNull(),
    /** Identifies the request currently holding the lease. */
    lockToken: uuid('lock_token'),
    lockedUntil: timestamptz('locked_until'),
    responseStatus: integer('response_status'),
    responseBody: jsonb('response_body'),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    completedAt: timestamptz('completed_at'),
    expiresAt: timestamptz('expires_at').notNull(),
  },
  (table) => [
    primaryKey({ name: 'idempotency_keys_pkey', columns: [table.scope, table.key] }),
    index('idempotency_keys_expires_at_idx').on(table.expiresAt),
    check('idempotency_keys_status_known', sql`${table.status} in ('in_progress', 'completed')`),
    check(
      'idempotency_keys_completed_has_response',
      sql`(${table.status} = 'completed') = (${table.responseStatus} is not null)`,
    ),
  ],
);
