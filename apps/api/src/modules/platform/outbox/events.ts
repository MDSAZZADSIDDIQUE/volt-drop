import type { z } from 'zod';
import type { Transaction } from '../../../core/database/database.js';

/** A domain event type (spec §4, ADR-0015). Handlers depend on its type, version and payload. */
export interface EventDefinition<TPayload extends z.ZodObject = z.ZodObject> {
  /** `<aggregate>.<past_tense_verb>`, for example `order.placed`. */
  readonly type: string;
  /** Bumped for a breaking payload change. A handler subscribes to one version. */
  readonly version: number;
  /** Identifiers, not personal data. */
  readonly payload: TPayload;
}

const NAME = /^[a-z]+(?:_[a-z]+)*\.[a-z]+(?:_[a-z]+)*$/;

export function defineEvent<TPayload extends z.ZodObject>(
  type: string,
  version: number,
  payload: TPayload,
): EventDefinition<TPayload> {
  if (!NAME.test(type)) {
    throw new Error(`Invalid event type "${type}". Use <aggregate>.<past_tense_verb>.`);
  }
  if (!Number.isInteger(version) || version < 1) {
    throw new Error(`Invalid version ${String(version)} for event "${type}".`);
  }
  return { type, version, payload };
}

export interface PublishedEvent<TPayload> {
  readonly id: string;
  readonly type: string;
  readonly version: number;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly payload: TPayload;
  readonly correlationId?: string;
  readonly occurredAt: Date;
}

/** Reacts to one event type and version. Its database work commits exactly once per event. */
export interface OutboxHandler<TPayload extends z.ZodObject = z.ZodObject> {
  /** Unique and stable, for example `search.index_offer`. Stored with each delivery. */
  readonly name: string;
  readonly event: EventDefinition<TPayload>;
  /**
   * `tx` is the delivery's transaction. Anything outside the database (email, push, provider
   * calls) must be idempotent itself, because a failed delivery is retried.
   */
  handle(event: PublishedEvent<z.output<TPayload>>, tx: Transaction): Promise<void>;
}

export function isValidHandlerName(name: string): boolean {
  return NAME.test(name);
}
