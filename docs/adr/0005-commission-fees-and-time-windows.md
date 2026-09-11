# ADR-0005: Commission basis, platform-fee timing and half-open time windows

- **Status:** Accepted
- **Date:** 2026-09-11
- **Deciders:** Founder (kickoff recommendation (c)4, approved 2026-09-11); Claude Code
- **Spec sections:** v1.1 §3 (Commission, Monthly platform fee, Settlement, Time windows), §7 (posting examples, invariant 6), §8.10, §16 M9 and M10

## Context

v1.0 had three ambiguities that affect money and deadlines:

- It said "15% of item gross" without saying whether VAT on the commission is included in or added to the 15%.
- The monthly platform fee comes off "the first weekly settlement of each calendar month", but a week can span two months.
- The settlement week ended at "Sunday 23:59", which loses the final minute. Return windows said "14 days after delivery" without saying when a day starts or ends.

## Decision

1. **Commission.** The commission is the plan rate × item gross (the VAT-inclusive item price). VAT at the standard rate is charged on top of the commission.
   - Example: a £100.00 item at 15% carries £15.00 commission plus £3.00 VAT, so £18.00 is deducted from the merchant.
   - Posting: debit `merchant_payable` £18.00, credit `revenue_commission` £15.00, credit `vat_output` £3.00.
2. **Platform fee timing.** The monthly platform fee is deducted on the first settlement statement *generated* in each calendar month (Europe/London), regardless of which days the statement's period covers.
3. **Half-open windows.** Every period includes its start and excludes its end.
   - A settlement week runs from Monday 00:00 up to, but not including, the next Monday 00:00, Europe/London.
   - For day-based windows, day 1 is the day after delivery (Europe/London), and an N-day window closes at 00:00 Europe/London at the start of day N+1.
     - Example: delivered 1 March at 18:00, day 1 is 2 March, and the 14-day change-of-mind window closes at 00:00 on 16 March.
   - Hour-based windows (for example 24 hours for business returns) run from the exact `delivered_at`.

## Consequences

- One rule for every deadline, so there are no off-by-one bugs at midnight or on BST/GMT changeover days.
- `TODO(M1/M3)`: Europe/London time helpers in `packages/domain`, with tests at both changeovers.
- `TODO(M9)`: settlement periods and platform-fee timing; golden scenario 10 covers a statement that carries the monthly fee.
- `TODO(M10)`: return windows use the day rule; golden scenarios 6 and 7 use it.
- The accountant should confirm VAT on commission for merchants who are not VAT-registered and can't reclaim it (`docs/open-questions.md`).

## Alternatives considered

- **Commission VAT-inclusive (15% including VAT).** This lowers the effective rate to 12.5% net, which differs from how marketplace fees are normally quoted.
- **Charge the platform fee on the settlement covering the 1st of the month.** This is harder to explain and to reconcile; "first statement generated" is unambiguous.
- **Closed intervals ending at 23:59:59.999.** These are error-prone, and they are wrong for timestamps with more precision.
