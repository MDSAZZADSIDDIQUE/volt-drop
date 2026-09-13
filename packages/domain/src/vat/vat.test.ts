import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { add, money, MoneyError, negate, type Money } from '../money/index.js';
import { addVat, splitGross, splitLine, vatBreakdown } from './index.js';

const gbp = (amountMinor: number): Money => money(amountMinor);

/** The exact rational VAT, rounded half away from zero, computed independently of the implementation. */
function expectedVat(gross: bigint, rateBp: bigint): bigint {
  const denominator = 10_000n + rateBp;
  const magnitude = gross < 0n ? -gross : gross;
  const rounded = (2n * magnitude * rateBp + denominator) / (2n * denominator);
  return gross < 0n ? -rounded : rounded;
}

describe('splitGross()', () => {
  it('splits known examples', () => {
    // 100p at 20%: VAT is 16.67p, so 17p.
    expect(splitGross(gbp(100), 2000)).toMatchObject({ net: gbp(83), vat: gbp(17) });
    // 3p at 20%: VAT is exactly 0.5p, so it rounds up to 1p.
    expect(splitGross(gbp(3), 2000)).toMatchObject({ net: gbp(2), vat: gbp(1) });
    // £12.00 at 20% has exactly £2.00 VAT.
    expect(splitGross(gbp(1200), 2000)).toMatchObject({ net: gbp(1000), vat: gbp(200) });
    // 5% (reduced rate) and 0%.
    expect(splitGross(gbp(2100), 500)).toMatchObject({ net: gbp(2000), vat: gbp(100) });
    expect(splitGross(gbp(999), 0)).toMatchObject({ net: gbp(999), vat: gbp(0) });
  });

  it(
    'is exact for every gross amount from 0p to £10,000 at 0%, 5% and 20%',
    { timeout: 120_000 },
    () => {
      for (const rateBp of [0, 500, 2000]) {
        const rate = BigInt(rateBp);
        for (let gross = 0; gross <= 1_000_000; gross += 1) {
          const split = splitGross(gbp(gross), rateBp);
          if (BigInt(split.vat.amountMinor) !== expectedVat(BigInt(gross), rate)) {
            throw new Error(`VAT mismatch at ${String(gross)}p and ${String(rateBp)} bp`);
          }
          if (split.net.amountMinor + split.vat.amountMinor !== gross) {
            throw new Error(`Net + VAT isn't gross at ${String(gross)}p and ${String(rateBp)} bp`);
          }
        }
      }
    },
  );

  it('mirrors charges for refunds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100_000_000 }),
        fc.integer({ min: 0, max: 10_000 }),
        (gross, rateBp) => {
          const charge = splitGross(gbp(gross), rateBp);
          const refund = splitGross(gbp(-gross), rateBp);
          expect(refund.vat).toEqual(negate(charge.vat));
          expect(refund.net).toEqual(negate(charge.net));
        },
      ),
    );
  });

  it('refuses invalid rates', () => {
    expect(() => splitGross(gbp(100), -1)).toThrow(MoneyError);
    expect(() => splitGross(gbp(100), 10_001)).toThrow(MoneyError);
    expect(() => splitGross(gbp(100), 17.5)).toThrow(MoneyError);
  });
});

describe('addVat()', () => {
  it('adds VAT on top of a net amount', () => {
    // ADR-0005: £15.00 commission plus 20% VAT.
    expect(addVat(gbp(1500), 2000)).toEqual({
      net: gbp(1500),
      vat: gbp(300),
      gross: gbp(1800),
      rateBp: 2000,
    });
    expect(addVat(gbp(5), 2000)).toMatchObject({ vat: gbp(1), gross: gbp(6) });
  });
});

describe('splitLine()', () => {
  it('derives VAT from the line total, not per unit', () => {
    // 3 × £3.33 = £9.99. Per unit VAT would be 3 × 56p = £1.68; on the line it's 166.5p, so £1.67.
    expect(splitLine({ unitGross: gbp(333), quantity: 3, rateBp: 2000 })).toMatchObject({
      gross: gbp(999),
      net: gbp(832),
      vat: gbp(167),
    });
  });

  it.each([0, -1, 1.5])('refuses a quantity of %s', (quantity) => {
    expect(() => splitLine({ unitGross: gbp(100), quantity, rateBp: 2000 })).toThrow(MoneyError);
  });
});

describe('vatBreakdown()', () => {
  it('totals lines per rate, highest rate first', () => {
    const rows = vatBreakdown([
      splitGross(gbp(1200), 2000),
      splitGross(gbp(2100), 500),
      splitGross(gbp(600), 2000),
    ]);
    expect(rows).toEqual([
      { rateBp: 2000, gross: gbp(1800), net: gbp(1500), vat: gbp(300) },
      { rateBp: 500, gross: gbp(2100), net: gbp(2000), vat: gbp(100) },
    ]);
  });

  it('returns no rows for no lines', () => {
    expect(vatBreakdown([])).toEqual([]);
  });

  it('keeps each row internally consistent', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.integer({ min: 0, max: 1_000_000 }), fc.constantFrom(0, 500, 2000)), {
          maxLength: 20,
        }),
        (lines) => {
          for (const row of vatBreakdown(
            lines.map(([gross, rateBp]) => splitGross(gbp(gross), rateBp)),
          )) {
            expect(add(row.net, row.vat)).toEqual(row.gross);
          }
        },
      ),
    );
  });
});
