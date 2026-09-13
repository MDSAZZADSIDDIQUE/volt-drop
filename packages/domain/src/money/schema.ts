import { z } from 'zod';

/** Money on the wire: whole pence plus currency (spec §6). Clients never send prices, only display them. */
export const MoneySchema = z.object({
  amountMinor: z.number().int(),
  currency: z.literal('GBP'),
});
