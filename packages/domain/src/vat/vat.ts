import { assertBasisPoints, BASIS_POINTS_PER_WHOLE, percentage } from '../money/basis-points.js';
import { MoneyError } from '../money/errors.js';
import { add, money, multiply, subtract, type Currency, type Money } from '../money/money.js';
import { divideRounded } from '../money/rounding.js';

/** One amount broken into its net and VAT parts, at a single VAT rate. */
export interface VatSplit {
  readonly gross: Money;
  readonly net: Money;
  readonly vat: Money;
  /** 2000 = 20%. */
  readonly rateBp: number;
}

/**
 * Splits a VAT-inclusive amount (spec §6: prices are stored VAT-inclusive). The VAT is
 * gross × rate ÷ (10,000 + rate), rounded half away from zero, and net is whatever remains, so
 * net + VAT always equals gross exactly (ADR-0012).
 */
export function splitGross(gross: Money, rateBp: number): VatSplit {
  assertBasisPoints(rateBp, 'A VAT rate');
  const vatMinor = divideRounded(
    BigInt(gross.amountMinor) * BigInt(rateBp),
    BigInt(BASIS_POINTS_PER_WHOLE + rateBp),
  );
  // The VAT is never larger than the gross amount, so it's always a safe integer.
  const vat = money(Number(vatMinor), gross.currency);
  return { gross, net: subtract(gross, vat), vat, rateBp };
}

/** Adds VAT on top of a net amount, as on VoltDrop's commission and platform fee (ADR-0005). */
export function addVat(net: Money, rateBp: number): VatSplit {
  const vat = percentage(net, rateBp);
  return { gross: add(net, vat), net, vat, rateBp };
}

export interface VatLine {
  readonly unitGross: Money;
  readonly quantity: number;
  readonly rateBp: number;
}

/** VAT is derived from the whole line (unit gross × quantity), never per unit (spec §6: rounding at line level). */
export function splitLine(line: VatLine): VatSplit {
  if (!Number.isSafeInteger(line.quantity) || line.quantity < 1) {
    throw new MoneyError(
      `A line quantity must be a whole number of at least 1, got ${String(line.quantity)}.`,
    );
  }
  return splitGross(multiply(line.unitGross, line.quantity), line.rateBp);
}

export interface VatBreakdownRow {
  readonly rateBp: number;
  readonly gross: Money;
  readonly net: Money;
  readonly vat: Money;
}

/** Totals line-level splits by VAT rate for receipts and invoices, highest rate first. */
export function vatBreakdown(splits: readonly VatSplit[]): VatBreakdownRow[] {
  const byRate = new Map<number, VatBreakdownRow>();
  for (const split of splits) {
    const row = byRate.get(split.rateBp);
    byRate.set(
      split.rateBp,
      row
        ? {
            rateBp: split.rateBp,
            gross: add(row.gross, split.gross),
            net: add(row.net, split.net),
            vat: add(row.vat, split.vat),
          }
        : { rateBp: split.rateBp, gross: split.gross, net: split.net, vat: split.vat },
    );
  }
  return [...byRate.values()].sort((a, b) => b.rateBp - a.rateBp);
}

export type { Currency };
