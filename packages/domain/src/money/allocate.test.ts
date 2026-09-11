import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  allocate,
  allocateEvenly,
  assertBasisPoints,
  money,
  MoneyError,
  percentage,
  sum,
  type Money,
} from './index.js';

const gbp = (amountMinor: number): Money => money(amountMinor);
const pence = (parts: readonly Money[]): number[] => parts.map((part) => part.amountMinor);

describe('allocate()', () => {
  it('gives leftover pence to the largest remainders, earlier parts first on ties', () => {
    expect(pence(allocate(gbp(100), [1, 1, 1]))).toEqual([34, 33, 33]);
    expect(pence(allocate(gbp(5), [1, 2]))).toEqual([2, 3]);
    expect(pence(allocate(gbp(10), [3, 3, 4]))).toEqual([3, 3, 4]);
    expect(pence(allocate(gbp(11), [5, 3]))).toEqual([7, 4]);
  });

  it('mirrors the positive split for negative totals', () => {
    expect(pence(allocate(gbp(-100), [1, 1, 1]))).toEqual([-34, -33, -33]);
  });

  it('gives nothing to zero weights', () => {
    expect(pence(allocate(gbp(100), [0, 1, 0]))).toEqual([0, 100, 0]);
  });

  it('refuses invalid weights', () => {
    expect(() => allocate(gbp(100), [])).toThrow(MoneyError);
    expect(() => allocate(gbp(100), [1, -1])).toThrow(MoneyError);
    expect(() => allocate(gbp(100), [1.5])).toThrow(MoneyError);
    expect(() => allocate(gbp(100), [0, 0])).toThrow(MoneyError);
  });

  it('always adds up exactly, with every part within a penny of its exact share', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -10_000_000, max: 10_000_000 }),
        fc.array(fc.integer({ min: 0, max: 1000 }), { minLength: 1, maxLength: 12 }),
        (total, weights) => {
          fc.pre(weights.some((weight) => weight > 0));
          const parts = allocate(gbp(total), weights);
          const weightSum = weights.reduce((acc, weight) => acc + weight, 0);
          expect(sum(parts)).toEqual(gbp(total));
          parts.forEach((part, index) => {
            const weight = weights[index] ?? 0;
            // |part × weightSum − total × weight| < weightSum, in exact integer arithmetic.
            const error =
              BigInt(part.amountMinor) * BigInt(weightSum) - BigInt(total) * BigInt(weight);
            expect(error < BigInt(weightSum) && error > -BigInt(weightSum)).toBe(true);
            if (weight === 0) {
              expect(part.amountMinor).toBe(0);
            }
          });
        },
      ),
    );
  });
});

describe('allocateEvenly()', () => {
  it('splits into equal shares', () => {
    expect(pence(allocateEvenly(gbp(10), 3))).toEqual([4, 3, 3]);
    expect(pence(allocateEvenly(gbp(300), 1))).toEqual([300]);
  });

  it('needs at least one whole part', () => {
    expect(() => allocateEvenly(gbp(10), 0)).toThrow(MoneyError);
    expect(() => allocateEvenly(gbp(10), 1.5)).toThrow(MoneyError);
  });
});

describe('percentage()', () => {
  it('works in basis points', () => {
    expect(percentage(gbp(10_000), 1500)).toEqual(gbp(1500));
    expect(percentage(gbp(1999), 0)).toEqual(gbp(0));
    expect(percentage(gbp(1999), 10_000)).toEqual(gbp(1999));
  });

  it('rounds exact halves away from zero', () => {
    expect(percentage(gbp(10), 1500)).toEqual(gbp(2));
    expect(percentage(gbp(-10), 1500)).toEqual(gbp(-2));
    expect(percentage(gbp(1), 1500)).toEqual(gbp(0));
  });

  it.each([-1, 10_001, 12.5, Number.NaN])('refuses a rate of %s basis points', (bad) => {
    expect(() => percentage(gbp(100), bad)).toThrow(MoneyError);
    expect(() => {
      assertBasisPoints(bad, 'Commission');
    }).toThrow(/Commission/);
  });
});
