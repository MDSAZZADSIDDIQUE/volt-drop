# ADR-0012: Money representation and VAT rounding

- **Status:** Accepted
- **Date:** 2026-09-11
- **Deciders:** Claude Code, under the M0 plan approved by the founder (step 2)
- **Spec sections:** §6 (money and tax), §7 (invariants 2, 3, 9), ADR-0004, ADR-0005

## Context

Spec §6 requires integer pence handled only through `packages/domain/money`, no floating point anywhere, prices stored VAT-inclusive with their rate, and one documented rounding rule ("round half up at line level"). Refunds and reversals produce negative amounts, and splits (tips across trips, proportional refunds) must add up exactly.

## Decision

1. **Representation.** `Money` is `{ amountMinor, currency }`. `amountMinor` is a JavaScript `number` that must be a safe integer (magnitude ≤ 2⁵³ − 1 pence, about £90 trillion). Every intermediate product and quotient uses BigInt, and results outside the safe range throw `MoneyError` rather than lose precision. `-0` is stored as `0`. Currencies never mix: `GBP` is the only currency in Phase 1, but the check stays.
2. **Rounding.** Round to the nearest penny, with exact halves going **away from zero**. This is "round half up" applied to the magnitude, so a refund of −3p at 20% VAT carries −1p VAT, mirroring the 1p on the 3p charge. It is implemented once, in `divideRounded`.
3. **VAT from gross (prices).** For each line, VAT = round(line gross × rate ÷ (10,000 + rate)), and net = line gross − VAT. Net + VAT always equals gross. The line gross is unit gross × quantity, so VAT is never computed per unit.
   - 3 × £3.33 = £9.99 at 20% gives 166.5p, so £1.67 VAT and £8.32 net. Rounding per unit would have given £1.68.
4. **VAT on top (VoltDrop's fees).** VAT = round(net × rate ÷ 10,000), and gross = net + VAT. For example £15.00 commission plus £3.00 VAT (ADR-0005).
5. **Allocation.** Proportional splits use the largest remainder method. Leftover pence go to the largest remainders, ties go to the earlier part, zero weights get nothing, and a negative total is split like its positive counterpart and then negated.
6. **Formatting.** `formatMoney` produces en-GB strings ("£1,234.56", "-£0.05") with integer and string operations only, identically on every platform.
7. **Wire format.** `{ "amountMinor": 1999, "currency": "GBP" }`, validated by `MoneySchema`.

## Consequences

- Correctness is proven by exhaustive tests (every gross from 0 to 1,000,000 pence at 0%, 5% and 20%, checked against an independent rational oracle), fast-check properties and 100% branch coverage of the `money` and `vat` modules, enforced in CI.
- Database money columns are `bigint` mapped to `number` in the safe range (from M1).
- The accountant should confirm the line-level VAT rule and the away-from-zero treatment of refunds (`docs/open-questions.md`, A6).

## Alternatives considered

- **BigInt everywhere.** It doesn't serialise to JSON and is awkward in every frontend. Safe-integer `number`s with BigInt intermediates give the same exactness.
- **Decimal libraries.** They add a dependency and let decimals leak into places where only whole pence make sense.
- **Banker's rounding (half to even).** It isn't what the spec asks for, and it makes refunds harder to explain on receipts.
- **Rounding "half up" towards positive infinity for negatives.** A refund would then carry less VAT than the charge it reverses.
