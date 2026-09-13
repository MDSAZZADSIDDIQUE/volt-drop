import type { Currency, Money } from './money.js';

const SYMBOLS: Readonly<Record<Currency, string>> = { GBP: '£' };

/** Groups digits in threes: "1234567" becomes "1,234,567". */
function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Formats money for display in en-GB, for example "£1,234.56" or "-£0.05". Uses integer and string
 * operations only, so it gives the same result on every platform and never touches floating point.
 */
export function formatMoney(value: Money): string {
  const magnitude = BigInt(Math.abs(value.amountMinor));
  const pounds = groupThousands((magnitude / 100n).toString());
  const pence = (magnitude % 100n).toString().padStart(2, '0');
  const sign = value.amountMinor < 0 ? '-' : '';
  return `${sign}${SYMBOLS[value.currency]}${pounds}.${pence}`;
}
