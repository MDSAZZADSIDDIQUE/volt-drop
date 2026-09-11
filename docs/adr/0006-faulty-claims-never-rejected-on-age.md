# ADR-0006: Faulty-goods claims are never rejected on age alone

- **Status:** Accepted
- **Date:** 2026-09-11
- **Deciders:** Founder (kickoff recommendation (c)6, approved 2026-09-11); Claude Code
- **Spec sections:** v1.1 §3 (Consumer returns), §8.7, §11.2, §16 M10

## Context

v1.0 said that faulty goods allow "repair, replacement or escalation up to 6 months". A policy engine could read that as "reject faulty claims after 6 months", which would breach the Consumer Rights Act 2015:

- 30 days gives a short-term right to reject for a full refund.
- After that, the consumer is entitled to one repair or replacement, and a price reduction or final right to reject if that fails.
- Within 6 months, the trader must prove the goods weren't faulty at delivery; after 6 months, the consumer must prove the fault.
- Claims can be brought for up to 6 years in England and Wales, or 5 in Scotland.

## Decision

1. The return policy engine never rejects a faulty claim automatically because of its age.
2. Consumer faulty claims:
   - within 30 days (half-open, ADR-0005): full refund;
   - after 30 days: repair or replacement, then a refund if that fails;
   - after 6 months: the claim goes to human review, with the burden of proof on the consumer.
3. Business faulty claims: the 30-day contractual window applies, then human review (implied quality terms still apply).
4. The decision on any old claim is made by a person, and recorded with reasons.

## Consequences

- There is no automated path to a non-compliant rejection.
- `TODO(M10)`: table-driven tests cover every age band for consumer and business buyers; the compliance register row links to them.
- More claims reach merchant or admin review. This is expected to be a small volume for accessories.

## Alternatives considered

- **Hard cut-offs by age.** Non-compliant.
- **Let merchants configure the cut-offs.** This would still allow non-compliant settings; the engine enforces the legal floor instead.
