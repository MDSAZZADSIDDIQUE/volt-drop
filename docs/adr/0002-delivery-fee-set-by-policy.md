# ADR-0002: The customer delivery fee is set by policy, not by live courier quotes

- **Status:** Accepted
- **Date:** 2026-09-11
- **Deciders:** Founder (kickoff recommendation (c)1, approved 2026-09-11); Claude Code
- **Spec sections:** v1.1 §3 (Delivery fee, Cart price lock), §7 (carts, invariant 5), §8.2, §8.3, §11.1, §16 M5 and M8

## Context

Spec v1.0 derived the delivery fee from the delivery provider's quote. It also required the fee to be shown as soon as an address is known, and to stay the same through checkout. Those two requirements conflict:

- A provider quote is priced per store-to-customer trip, and only exists once routing has decided which stores fulfil the basket (at checkout).
- A split basket needs two or more trips, so there is no single quote to derive one fee from.
- Re-routing after a store rejects can change the trip, and therefore the quote, after payment.

Under the Digital Markets, Competition and Consumers Act 2024, a mandatory fee must not appear for the first time late in the journey. A fee that moves between the listing and payment undermines the "price shown = price charged" rule.

## Decision

1. The customer's fee comes from a versioned policy rule (`checkout.delivery_fee_rule` in `policy_versions`). Its inputs are the zone, a distance band from the address to the zone's reference point, and the basket value. Its outputs are the base fee, the distance adjustment, a minimum and maximum, the free-delivery threshold and the small-basket surcharge.
2. The fee is shown as soon as the address is known. Every place that shows it also shows the free-delivery threshold and the small-basket surcharge rule.
3. The cart stores the fee shown for its address, and locks it for the same period as prices (30 minutes by default). If the lock expires, the fee is recomputed and the customer confirms any change before paying, as prices already work (invariant 5).
4. Provider quotes are still requested per fulfilment at checkout, but only for ETA and VoltDrop's cost. They never change the customer's fee.
5. When the provider cost for an order exceeds the customer fee by more than a configured margin threshold, VoltDrop records it and alerts operations (margin monitoring). The fee goes to `revenue_delivery` (net) and `vat_output`; provider costs go to `expense_delivery_provider`.

## Consequences

- The fee a customer sees at the listing is the fee they pay, which removes a source of drip-pricing risk.
- VoltDrop carries the delivery cost risk, most visibly on split baskets. Routing already minimises the number of stores first, which limits this. Margin is monitored from M8 (alerts) and M13 (dashboards).
- New policy: `checkout.delivery_fee_rule`, with values set by the founder before launch (see `docs/open-questions.md`).
- `TODO(M5)`: the pricing engine implements the rule and the cart lock; property tests prove the fee is stable from listing to capture within the lock.
- `TODO(M8)`: provider cost ingestion and margin alerts.

## Alternatives considered

- **Keep deriving the fee from the quote, and show an estimate early.** The fee could change at checkout, which conflicts with §11.1 and invariant 5.
- **One fee per trip.** This is simple for accounting, but it charges customers for VoltDrop's routing choices and makes the listing fee unknowable.
- **A flat fee per zone.** This is the simplest option, but it can't reflect distance or basket size. The chosen rule can be configured as a flat fee (distance bands set to zero).
