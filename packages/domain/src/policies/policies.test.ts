import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  CartPriceLock,
  definePolicy,
  IdempotencyReplayWindow,
  PaymentConfirmationHold,
  SEEDED_POLICIES,
  StockReservationTtl,
  StoreAcceptanceTimers,
} from './policies.js';

describe('definePolicy', () => {
  it('accepts <area>.<snake_case_name> keys', () => {
    expect(definePolicy('cart.price_lock_seconds', z.number(), 'x').key).toBe(
      'cart.price_lock_seconds',
    );
  });

  it.each(['cart', 'Cart.lock', 'cart.priceLock', 'cart..lock', 'cart.lock_', '.lock'])(
    'rejects the malformed key %s',
    (key) => {
      expect(() => definePolicy(key, z.number(), 'x')).toThrow(/Invalid policy key/);
    },
  );
});

describe('seeded policies', () => {
  it('accept the spec v1.1 §3 defaults', () => {
    expect(StockReservationTtl.schema.parse(600)).toBe(600);
    expect(CartPriceLock.schema.parse(1_800)).toBe(1_800);
    expect(PaymentConfirmationHold.schema.parse(600)).toBe(600);
    expect(IdempotencyReplayWindow.schema.parse(24)).toBe(24);
    expect(
      StoreAcceptanceTimers.schema.parse({
        reminderPushSeconds: 60,
        phoneCallSeconds: 120,
        autoRejectSeconds: 240,
      }),
    ).toEqual({ reminderPushSeconds: 60, phoneCallSeconds: 120, autoRejectSeconds: 240 });
  });

  it('reject values of the wrong shape', () => {
    for (const policy of [StockReservationTtl, CartPriceLock, PaymentConfirmationHold]) {
      expect(policy.schema.safeParse(0).success).toBe(false);
      expect(policy.schema.safeParse(1.5).success).toBe(false);
      expect(policy.schema.safeParse('600').success).toBe(false);
    }
    expect(IdempotencyReplayWindow.schema.safeParse(169).success).toBe(false);
  });

  it('require store acceptance timers to escalate', () => {
    const result = StoreAcceptanceTimers.schema.safeParse({
      reminderPushSeconds: 120,
      phoneCallSeconds: 60,
      autoRejectSeconds: 240,
    });
    expect(result.success).toBe(false);
  });

  it('have unique keys', () => {
    const keys = SEEDED_POLICIES.map((policy) => policy.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
