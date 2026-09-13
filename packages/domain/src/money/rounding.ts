import { MoneyError } from './errors.js';

/**
 * Divides and rounds to the nearest whole number. Exact halves round away from zero: "round half
 * up" applied to the magnitude, so a refund rounds exactly like the charge it reverses (ADR-0012).
 */
export function divideRounded(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) {
    throw new MoneyError('The denominator must be positive.');
  }
  const magnitude = numerator < 0n ? -numerator : numerator;
  const quotient = magnitude / denominator;
  const remainder = magnitude % denominator;
  const rounded = remainder * 2n >= denominator ? quotient + 1n : quotient;
  return numerator < 0n ? -rounded : rounded;
}
