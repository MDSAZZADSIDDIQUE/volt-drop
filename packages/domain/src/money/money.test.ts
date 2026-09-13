import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  add,
  compare,
  divideRounded,
  equals,
  formatMoney,
  fromBigInt,
  isNegative,
  isZero,
  max,
  min,
  money,
  MoneyError,
  MoneySchema,
  multiply,
  negate,
  subtract,
  sum,
  zero,
  type Money,
} from './index.js';

const gbp = (amountMinor: number): Money => money(amountMinor);
const amounts = fc.integer({ min: -1_000_000_000_000, max: 1_000_000_000_000 });
// A value typed as Money but in another currency, to prove the runtime currency guard.
const euros = { amountMinor: 100, currency: 'EUR' } as unknown as Money;

describe('money()', () => {
  it('creates a frozen GBP amount', () => {
    const value = gbp(1234);
    expect(value).toEqual({ amountMinor: 1234, currency: 'GBP' });
    expect(Object.isFrozen(value)).toBe(true);
  });

  it('stores -0 as 0', () => {
    expect(Object.is(gbp(-0).amountMinor, 0)).toBe(true);
  });

  it.each([1.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 53])('rejects %s', (bad) => {
    expect(() => gbp(bad)).toThrow(MoneyError);
  });
});

describe('fromBigInt()', () => {
  it('accepts the safe integer limits', () => {
    expect(fromBigInt(BigInt(Number.MAX_SAFE_INTEGER), 'GBP').amountMinor).toBe(
      Number.MAX_SAFE_INTEGER,
    );
    expect(fromBigInt(BigInt(Number.MIN_SAFE_INTEGER), 'GBP').amountMinor).toBe(
      Number.MIN_SAFE_INTEGER,
    );
  });

  it('refuses results beyond them', () => {
    expect(() => fromBigInt(BigInt(Number.MAX_SAFE_INTEGER) + 1n, 'GBP')).toThrow(MoneyError);
    expect(() => fromBigInt(BigInt(Number.MIN_SAFE_INTEGER) - 1n, 'GBP')).toThrow(MoneyError);
  });
});

describe('arithmetic', () => {
  it('adds and subtracts', () => {
    expect(add(gbp(250), gbp(1999))).toEqual(gbp(2249));
    expect(subtract(gbp(250), gbp(1999))).toEqual(gbp(-1749));
  });

  it('refuses to mix currencies', () => {
    expect(() => add(gbp(1), euros)).toThrow(MoneyError);
    expect(() => subtract(gbp(1), euros)).toThrow(MoneyError);
    expect(() => compare(gbp(1), euros)).toThrow(MoneyError);
  });

  it('refuses overflow instead of losing precision', () => {
    expect(() => add(gbp(Number.MAX_SAFE_INTEGER), gbp(1))).toThrow(MoneyError);
    expect(() => subtract(gbp(Number.MIN_SAFE_INTEGER), gbp(1))).toThrow(MoneyError);
  });

  it('negates without producing -0', () => {
    expect(negate(gbp(125))).toEqual(gbp(-125));
    expect(Object.is(negate(gbp(0)).amountMinor, 0)).toBe(true);
  });

  it('multiplies by whole quantities only', () => {
    expect(multiply(gbp(333), 3)).toEqual(gbp(999));
    expect(multiply(gbp(-250), 2)).toEqual(gbp(-500));
    expect(() => multiply(gbp(100), 1.5)).toThrow(MoneyError);
    expect(() => multiply(gbp(Number.MAX_SAFE_INTEGER), 2)).toThrow(MoneyError);
  });

  it('sums a list, and an empty list to zero', () => {
    expect(sum([gbp(100), gbp(250), gbp(-50)])).toEqual(gbp(300));
    expect(sum([])).toEqual(zero());
  });

  it('keeps addition commutative and subtraction its inverse', () => {
    fc.assert(
      fc.property(amounts, amounts, (a, b) => {
        expect(add(gbp(a), gbp(b))).toEqual(add(gbp(b), gbp(a)));
        expect(subtract(add(gbp(a), gbp(b)), gbp(b))).toEqual(gbp(a));
      }),
    );
  });
});

describe('comparison', () => {
  it('orders amounts', () => {
    expect(compare(gbp(1), gbp(2))).toBe(-1);
    expect(compare(gbp(2), gbp(1))).toBe(1);
    expect(compare(gbp(2), gbp(2))).toBe(0);
    expect(equals(gbp(2), gbp(2))).toBe(true);
    expect(equals(gbp(2), gbp(3))).toBe(false);
  });

  it('picks the smaller and larger amount', () => {
    expect(min(gbp(1), gbp(2))).toEqual(gbp(1));
    expect(min(gbp(3), gbp(2))).toEqual(gbp(2));
    expect(max(gbp(1), gbp(2))).toEqual(gbp(2));
    expect(max(gbp(3), gbp(2))).toEqual(gbp(3));
  });

  it('recognises zero and negative amounts', () => {
    expect(isZero(zero())).toBe(true);
    expect(isZero(gbp(1))).toBe(false);
    expect(isNegative(gbp(-1))).toBe(true);
    expect(isNegative(gbp(0))).toBe(false);
  });
});

describe('divideRounded()', () => {
  it('rounds exact halves away from zero', () => {
    expect(divideRounded(5n, 2n)).toBe(3n);
    expect(divideRounded(-5n, 2n)).toBe(-3n);
    expect(divideRounded(7n, 2n)).toBe(4n);
    expect(divideRounded(4n, 3n)).toBe(1n);
    expect(divideRounded(-4n, 3n)).toBe(-1n);
    expect(divideRounded(0n, 7n)).toBe(0n);
  });

  it('refuses a zero or negative denominator', () => {
    expect(() => divideRounded(1n, 0n)).toThrow(MoneyError);
    expect(() => divideRounded(1n, -2n)).toThrow(MoneyError);
  });

  it('matches exact rational rounding', () => {
    fc.assert(
      fc.property(amounts, fc.integer({ min: 1, max: 1_000_000 }), (n, d) => {
        const numerator = BigInt(n);
        const denominator = BigInt(d);
        const magnitude = numerator < 0n ? -numerator : numerator;
        // Nearest integer with halves away from zero: floor((2|n| + d) / 2d), then restore the sign.
        const expected = (2n * magnitude + denominator) / (2n * denominator);
        expect(divideRounded(numerator, denominator)).toBe(numerator < 0n ? -expected : expected);
      }),
    );
  });
});

describe('formatMoney()', () => {
  it.each([
    [0, '£0.00'],
    [5, '£0.05'],
    [99, '£0.99'],
    [100, '£1.00'],
    [123_456, '£1,234.56'],
    [100_000_000, '£1,000,000.00'],
    [-5, '-£0.05'],
    [-123_456, '-£1,234.56'],
  ])('formats %i pence as %s', (pence, expected) => {
    expect(formatMoney(gbp(pence))).toBe(expected);
  });
});

describe('MoneySchema', () => {
  it('accepts whole pence in GBP', () => {
    expect(MoneySchema.parse({ amountMinor: 1999, currency: 'GBP' })).toEqual(gbp(1999));
  });

  it('rejects fractions and other currencies', () => {
    expect(MoneySchema.safeParse({ amountMinor: 19.99, currency: 'GBP' }).success).toBe(false);
    expect(MoneySchema.safeParse({ amountMinor: 1999, currency: 'EUR' }).success).toBe(false);
  });
});
