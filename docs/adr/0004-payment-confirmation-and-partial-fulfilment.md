# ADR-0004: Payment-confirmation and partial-fulfilment rules

- **Status:** Accepted
- **Date:** 2026-09-11
- **Deciders:** Founder (kickoff recommendation (c)3, approved 2026-09-11); Claude Code
- **Spec sections:** v1.1 §3 (Stock reservation, Tips, Partial fulfilment), §8.3 steps 3 and 7, §8.4, §16 M5

## Context

v1.0 left four money-affecting cases open:

1. Stock is reserved for 10 minutes from checkout start, but 3-D Secure challenges and slow banks can push the authorisation past that.
2. The order is created on the authorisation webhook, which may arrive after the reservations have lapsed.
3. One tip is taken per order, but a split order has several courier trips.
4. It wasn't stated whether the delivery fee changes when some stores reject.

## Decision

1. **Reservation hold.** When payment confirmation starts, including 3-D Secure, the reservations are extended once, by `checkout.payment_confirmation_hold_seconds` (default 600).
2. **Late authorisation.** If an authorisation arrives after its reservations lapsed, VoltDrop tries these in order:
   1. re-reserve the same offers;
   2. re-route within the quote (ADR-0003);
   3. cancel the authorisation and tell the customer.

   Each outcome is recorded on the checkout's event log.
3. **Tip split.** The tip is split evenly across the courier trips (delivery jobs) in the final plan, with pence allocated by largest remainder. The share for a trip that doesn't go ahead is not captured. The tip is still 100% passed to couriers (§3, §11.7).
4. **Delivery fee on partial fulfilment.** The fee is charged in full when at least one fulfilment goes ahead, and refunded if nothing is delivered (for example, after a failed delivery with return to store). This is configurable through `checkout.partial_fulfilment_fee_rule`.

## Consequences

- Customers are never charged for stock they didn't get, or for trips that never happened.
- New policies: `checkout.payment_confirmation_hold_seconds` and `checkout.partial_fulfilment_fee_rule`.
- `TODO(M5)`: implement and test late authorisation (including a webhook arriving after expiry), tip allocation and fee handling. These extend golden scenarios 3 and 4.
- `TODO(M8)`: pass each trip's tip share to the provider when creating the delivery.

## Alternatives considered

- **A longer reservation for everyone.** This ties up stock for abandoned checkouts; the hold only applies once payment is under way.
- **Give the whole tip to the first courier.** This is unfair to the other couriers, and it would contradict "100% to the courier" in spirit.
- **Pro-rate the delivery fee by trips completed.** This is more complex and harder to explain. It can be configured later if the founder prefers it.
