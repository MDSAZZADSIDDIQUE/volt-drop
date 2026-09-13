import { MoneyError } from './errors.js';
import { fromBigInt, type Money } from './money.js';

interface Share {
  readonly index: number;
  readonly floor: bigint;
  readonly remainder: bigint;
}

function byLargestRemainderThenIndex(a: Share, b: Share): number {
  if (a.remainder !== b.remainder) {
    return a.remainder > b.remainder ? -1 : 1;
  }
  return a.index - b.index;
}

/**
 * Splits `total` into parts proportional to `weights`, so the parts always add up to `total`
 * exactly (largest remainder method). Leftover pence go to the parts with the largest remainders,
 * and ties go to the earlier part, so the result is deterministic. A negative total is split like
 * its positive counterpart, then negated, so reversals mirror the original split (ADR-0012).
 */
export function allocate(total: Money, weights: readonly number[]): Money[] {
  if (weights.length === 0) {
    throw new MoneyError('Allocation needs at least one weight.');
  }
  for (const weight of weights) {
    if (!Number.isSafeInteger(weight) || weight < 0) {
      throw new MoneyError(`Weights must be whole numbers of zero or more, got ${String(weight)}.`);
    }
  }
  const weightSum = weights.reduce((acc, weight) => acc + BigInt(weight), 0n);
  if (weightSum === 0n) {
    throw new MoneyError('Allocation needs at least one weight above zero.');
  }

  const magnitude = BigInt(Math.abs(total.amountMinor));
  const shares: Share[] = weights.map((weight, index) => {
    const product = magnitude * BigInt(weight);
    return { index, floor: product / weightSum, remainder: product % weightSum };
  });

  const allocated = shares.reduce((acc, share) => acc + share.floor, 0n);
  const extraPenny = new Set(
    [...shares]
      .sort(byLargestRemainderThenIndex)
      .slice(0, Number(magnitude - allocated))
      .map((share) => share.index),
  );

  const sign = total.amountMinor < 0 ? -1n : 1n;
  return shares.map((share) =>
    fromBigInt(sign * (share.floor + (extraPenny.has(share.index) ? 1n : 0n)), total.currency),
  );
}

/** Splits `total` into `parts` equal shares, for example a tip across several courier trips (ADR-0004). */
export function allocateEvenly(total: Money, parts: number): Money[] {
  if (!Number.isSafeInteger(parts) || parts < 1) {
    throw new MoneyError(`An even split needs at least one part, got ${String(parts)}.`);
  }
  return allocate(
    total,
    Array.from({ length: parts }, () => 1),
  );
}
