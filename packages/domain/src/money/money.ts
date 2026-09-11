import { MoneyError } from './errors.js';

/**
 * Money is a whole number of minor units (pence) plus a currency (spec §6). Amounts are safe
 * integers, intermediate arithmetic uses BigInt, and nothing ever goes through floating point.
 */
export type Currency = 'GBP';

export interface Money {
  /** Whole pence. Negative for refunds and reversals. */
  readonly amountMinor: number;
  readonly currency: Currency;
}

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);
const MIN_SAFE = BigInt(Number.MIN_SAFE_INTEGER);

export function assertSafeInteger(value: number, what: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new MoneyError(
      `${what} must be a whole number within the safe integer range, got ${String(value)}.`,
    );
  }
}

export function money(amountMinor: number, currency: Currency = 'GBP'): Money {
  assertSafeInteger(amountMinor, 'An amount');
  // Store -0 as 0 so equal amounts are always indistinguishable.
  return Object.freeze({ amountMinor: amountMinor === 0 ? 0 : amountMinor, currency });
}

/** Builds Money from a BigInt result, refusing anything outside the safe integer range. */
export function fromBigInt(amountMinor: bigint, currency: Currency): Money {
  if (amountMinor > MAX_SAFE || amountMinor < MIN_SAFE) {
    throw new MoneyError('The result is outside the safe integer range.');
  }
  return money(Number(amountMinor), currency);
}

export function zero(currency: Currency = 'GBP'): Money {
  return money(0, currency);
}

// Takes plain strings on purpose: with a single currency today, comparing the literal types would
// be a constant condition, but the runtime check must stay for when more currencies arrive.
function sameCurrency(a: string, b: string): boolean {
  return a === b;
}

function assertSameCurrency(a: Money, b: Money): void {
  if (!sameCurrency(a.currency, b.currency)) {
    throw new MoneyError(`Can't combine ${a.currency} with ${b.currency}.`);
  }
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return fromBigInt(BigInt(a.amountMinor) + BigInt(b.amountMinor), a.currency);
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return fromBigInt(BigInt(a.amountMinor) - BigInt(b.amountMinor), a.currency);
}

export function negate(a: Money): Money {
  return money(-a.amountMinor, a.currency);
}

/** Multiplies by a whole quantity, for example unit price × quantity on an order line. */
export function multiply(a: Money, quantity: number): Money {
  assertSafeInteger(quantity, 'A quantity');
  return fromBigInt(BigInt(a.amountMinor) * BigInt(quantity), a.currency);
}

export function sum(amounts: readonly Money[], currency: Currency = 'GBP'): Money {
  return amounts.reduce((total, amount) => add(total, amount), zero(currency));
}

export function compare(a: Money, b: Money): -1 | 0 | 1 {
  assertSameCurrency(a, b);
  if (a.amountMinor < b.amountMinor) {
    return -1;
  }
  return a.amountMinor > b.amountMinor ? 1 : 0;
}

export function equals(a: Money, b: Money): boolean {
  return compare(a, b) === 0;
}

export function min(a: Money, b: Money): Money {
  return compare(a, b) <= 0 ? a : b;
}

export function max(a: Money, b: Money): Money {
  return compare(a, b) >= 0 ? a : b;
}

export function isZero(a: Money): boolean {
  return a.amountMinor === 0;
}

export function isNegative(a: Money): boolean {
  return a.amountMinor < 0;
}
