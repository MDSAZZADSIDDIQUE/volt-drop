# ADR-0003: The quote caps the authorisation; the final charge follows the final fulfilment plan

- **Status:** Accepted
- **Date:** 2026-09-11
- **Deciders:** Founder (kickoff recommendation (c)2, approved 2026-09-11); Claude Code
- **Spec sections:** v1.1 §3 (Payment), §7 (fulfilment_plan_revisions, invariants 3–5), §8.4, §16 M5

## Context

In v1.0 each order references exactly one immutable quote, and payment is authorised for the quote total. But re-routing after a rejection can move lines to a different store, at a different price. v1.0 didn't say what the customer then pays, what the new merchant receives, or how a changed plan fits "one immutable quote per order". Silently charging the quoted price while paying the merchant less would leave VoltDrop with a hidden margin, and it would misstate the merchant's VAT receipt.

## Decision

1. The quote stays immutable, and its total is the authorisation amount. It is a **ceiling**.
2. Each re-route writes a `fulfilment_plan_revisions` row. The row records the order, reason, lines moved, previous and new store and offer, previous and new unit price, ETA change, actor and time. The final plan is the quote plus its revisions.
3. After a re-route, a line's unit price is the lower of the quoted unit price and the new offer's price. Lines are only re-routed to offers at or below the quoted price.
4. Each merchant is paid its own offer price for the lines it fulfils. Its VAT receipt shows that price.
5. The single capture is computed from the final plan, and never exceeds the quote in total or per line.
6. Invariant 4 now reads: *A quote never changes after creation. Each order references exactly one quote, which caps the authorisation. Re-routes are recorded as fulfilment plan revisions, and the capture, computed from the final plan, never exceeds the quote in total or per line.*

## Consequences

- Customers benefit when a cheaper store fulfils a line. VoltDrop never keeps a price difference.
- Ledger postings, receipts and settlements are all driven by the final plan, not the quote.
- `TODO(M5)`: capture computation from the final plan; property tests for invariants 3–5 across random re-route sequences.
- `TODO(M13)`: the admin timeline shows revisions.

## Alternatives considered

- **Charge the quoted price and pay the new merchant less.** This creates an undisclosed margin and inconsistent VAT documents.
- **Create a new quote per re-route.** This breaks "one quote per order", and it needs a new authorisation or customer confirmation for every re-route.
