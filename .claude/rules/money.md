---
paths:
  - "apps/api/src/modules/payments/**"
  - "apps/api/src/modules/ledger/**"
  - "apps/api/src/modules/settlements/**"
  - "apps/api/src/modules/checkout/**"
  - "packages/domain/src/money/**"
  - "packages/domain/src/vat/**"
---

# Money rules (payments, ledger, settlements, checkout pricing)

Spec §3, §6 (Money and tax), §7 (Money, invariants), §8.3, §8.4, §8.10 and §11.1, §11.5 to §11.7; ADR-0002 to ADR-0005 and ADR-0012. The tax treatment is an assumption until the accountant answers A1 to A6 in docs/open-questions.md, so keep it in policy, not code.

## Amounts

- Money is integer minor units (pence) in GBP, handled only through `@voltdrop/domain/money` (`money`, `add`, `subtract`, `multiply`, `sum`, `allocate`, `formatMoney`). No floating-point arithmetic on money anywhere, including frontends and tests.
- Database columns holding money end in `_minor`; rates end in `_bp` (basis points: `2000` is 20%).
- Prices are stored VAT-inclusive with their rate. Derive net and VAT per line with `splitLine` or `splitGross` from `@voltdrop/domain` (round half up at line level, ADR-0012). Never compute VAT on a total.
- Split an amount with `allocate` or `allocateEvenly`, so no penny is lost or invented (tips across trips, proportional refunds).
- The server computes every total. Clients send product ids, quantities and quote ids, never prices.

## Quotes, authorisation and capture

- A quote never changes after creation. Each order references exactly one quote, which caps the authorisation (invariant 4).
- Re-routes are recorded as fulfilment plan revisions. The capture, computed from the final plan, never exceeds the quote in total or per line.
- Captured ≤ authorised, and refunded ≤ captured, per payment and per line (invariant 3).
- A customer is never charged more than the item price or delivery fee they were shown within the lock, unless they confirm a new total before paying (invariant 5). No mandatory fee appears for the first time at checkout (§11.1).
- Every quote, order and return records the policy versions it used.

## Ledger

- Double entry: every journal entry's postings sum to zero (invariant 2). Check it where the entry is written, not only in tests.
- Journal entries and postings are append-only. Never update or delete one; correct a mistake with a reversing entry.
- Use the chart of accounts and posting rules in spec §7. A new account or posting rule needs an ADR.
- A merchant's settlement net payable equals its ledger postings for the period plus the opening balance (invariant 9). A reconciliation difference raises an alert; never hide it with an adjustment.

## Payments and webhooks

- No card data on VoltDrop systems: Stripe-hosted fields only (§11.6).
- Webhooks: verify the signature, store the raw event keyed by the provider's event id (unique), process it asynchronously, make replays safe and handle out-of-order delivery.
- Money endpoints take an `Idempotency-Key` (`@Idempotent()`), and calls to the payment provider send an idempotency key too.

## Time

- Settlement weeks run from Monday 00:00 up to, but not including, the next Monday 00:00, Europe/London (half-open, §3). Test both clock changes.

## Tests

- Property tests (fast-check) for invariants 2 to 5 and 9. Money and VAT code keeps 100% branch coverage.
- Use the compliance-check skill whenever pricing, payments, refunds or settlements change.
