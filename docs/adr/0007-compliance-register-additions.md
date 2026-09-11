# ADR-0007: Compliance additions: Data (Use and Access) Act 2025, product-safety watch item, right-to-work wording

- **Status:** Accepted
- **Date:** 2026-09-11
- **Deciders:** Founder (kickoff recommendation (c)7, approved 2026-09-11); Claude Code
- **Spec sections:** v1.1 §11.3, §11.4, §11.9

## Context

The kickoff review (2026-09-11) found three UK legal developments that v1.0 didn't reflect:

1. **Data (Use and Access) Act 2025.** It received Royal Assent on 19 June 2025. Most of its data-protection changes came into force on 5 February 2026, including reformed rules on automated decision-making. From 19 June 2026, controllers must have a process for handling data-protection complaints. It also adds a narrow exemption for statistics-only analytics cookies.
2. **Product Regulation and Metrology Act 2025.** It gives the government powers to place product-safety duties on online marketplaces. A consultation on the new framework ran from 31 March to 23 June 2026.
3. **Border Security, Asylum and Immigration Act 2025.** It received Royal Assent on 2 December 2025. Section 48 extends right-to-work checks to gig and platform workers from 1 October 2026. v1.0 said "since" 1 October 2026; the date is still in the future. The Act also extends liability along labour supply chains.

## Decision

1. **§11.3** gains Data (Use and Access) Act 2025 duties:
   - a complaints process: an electronic form and other channels, acknowledgement within 30 days, and records of receipt, the steps taken and the outcome;
   - the automated-decision safeguards: inform people, and let them make representations, get human intervention and contest the decision.

   Web analytics stays consent-first, even though the new exemption exists.
2. **§11.4** gains a watch item for the product-safety framework. The duties are added to the register when regulations are made.
3. **§11.9** is renamed "Couriers and right to work" and says "From 1 October 2026". It adds a Phase 1 legal question: does the delivery provider contract need right-to-work assurances?
4. `docs/compliance/register.md` gets a row for each of these when it's created in M0.

## Consequences

- `TODO(M2)`: data-protection complaint intake and records ship with the privacy skeleton (account deletion and data export). Support tooling for complaints follows in M13.
- The DPIA (§11.3) covers the automated-decision safeguards for fraud blocks, store auto-rejects and automatic store pausing.
- The solicitor questions are in `docs/open-questions.md`.

## Alternatives considered

- **Use the analytics-cookie exemption to load PostHog without consent.** PostHog features such as session replay go beyond statistics-only use, and consent-first is lower risk.
