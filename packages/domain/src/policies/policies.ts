import { z } from 'zod';

/**
 * A versioned, audited business setting (spec §3, §7). Values live in the `policy_versions` table and
 * are edited by admins; code only defines each policy's key and the shape its value must have, so a
 * bad value is caught when it is written and again when it is read.
 */
export interface PolicyDefinition<TSchema extends z.ZodType = z.ZodType> {
  /** `<area>.<snake_case_name>`, for example `inventory.reservation_ttl_seconds`. Never renamed. */
  readonly key: string;
  readonly schema: TSchema;
  readonly description: string;
}

const POLICY_KEY = /^[a-z]+(?:_[a-z]+)*\.[a-z0-9]+(?:_[a-z0-9]+)*$/;

export function definePolicy<TSchema extends z.ZodType>(
  key: string,
  schema: TSchema,
  description: string,
): PolicyDefinition<TSchema> {
  if (!POLICY_KEY.test(key)) {
    throw new Error(`Invalid policy key "${key}". Use <area>.<snake_case_name>.`);
  }
  return { key, schema, description };
}

const seconds = (max: number) => z.number().int().min(1).max(max);

export const StockReservationTtl = definePolicy(
  'inventory.reservation_ttl_seconds',
  seconds(3_600),
  'How long stock stays reserved from checkout start (spec §3).',
);

export const CartPriceLock = definePolicy(
  'cart.price_lock_seconds',
  seconds(86_400),
  "How long a cart line's price, and the delivery fee shown for the address, are honoured (spec §3, invariant 5).",
);

export const PaymentConfirmationHold = definePolicy(
  'checkout.payment_confirmation_hold_seconds',
  seconds(3_600),
  'The one-off extension of stock reservations when payment confirmation starts, including 3-D Secure (ADR-0004).',
);

export const StoreAcceptanceTimers = definePolicy(
  'fulfilment.store_acceptance_timers',
  z
    .object({
      reminderPushSeconds: seconds(3_600),
      phoneCallSeconds: seconds(3_600),
      autoRejectSeconds: seconds(3_600),
    })
    .refine(
      (timers) =>
        timers.reminderPushSeconds < timers.phoneCallSeconds &&
        timers.phoneCallSeconds < timers.autoRejectSeconds,
      { message: 'Timers must escalate: reminder push, then phone call, then auto-reject.' },
    ),
  'When a store is reminded, phoned and finally skipped after a new order starts ringing (spec §3).',
);

export const IdempotencyReplayWindow = definePolicy(
  'platform.idempotency_replay_window_hours',
  z.number().int().min(1).max(168),
  'How long a completed request with an Idempotency-Key is replayed (spec §6, ADR-0014).',
);

/** The policies whose version 1 is seeded by migration (M0 plan, step 6). */
export const SEEDED_POLICIES = [
  StockReservationTtl,
  CartPriceLock,
  PaymentConfirmationHold,
  StoreAcceptanceTimers,
  IdempotencyReplayWindow,
] as const;
