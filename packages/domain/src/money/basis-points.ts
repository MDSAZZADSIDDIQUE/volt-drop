import { MoneyError } from './errors.js';
import { fromBigInt, type Money } from './money.js';
import { divideRounded } from './rounding.js';

/** 10,000 basis points = 100%. Rates such as VAT (2000 = 20%) and commission (1500 = 15%) use them. */
export const BASIS_POINTS_PER_WHOLE = 10_000;

export function assertBasisPoints(rateBp: number, what = 'A rate'): void {
  if (!Number.isSafeInteger(rateBp) || rateBp < 0 || rateBp > BASIS_POINTS_PER_WHOLE) {
    throw new MoneyError(
      `${what} must be a whole number of basis points from 0 to 10000, got ${String(rateBp)}.`,
    );
  }
}

/** `amount × rateBp ÷ 10,000`, rounded half away from zero (ADR-0012). */
export function percentage(amount: Money, rateBp: number): Money {
  assertBasisPoints(rateBp);
  return fromBigInt(
    divideRounded(BigInt(amount.amountMinor) * BigInt(rateBp), BigInt(BASIS_POINTS_PER_WHOLE)),
    amount.currency,
  );
}
