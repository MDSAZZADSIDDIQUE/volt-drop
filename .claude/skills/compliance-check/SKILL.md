---
name: compliance-check
description: The UK compliance rules VoltDrop's code must enforce (spec §11) and the register that tracks them. Use whenever a change touches pricing, fees, checkout, returns, refunds, payments, tips, personal data or consent, product safety, tax documents or accessibility.
---

# Compliance check

docs/compliance/register.md lists every rule from spec §11 with where it's enforced and which test proves it. It's an engineering register, not legal advice: open legal and tax questions live in docs/open-questions.md (L1 to L10 for the solicitor, A1 to A6 for the accountant). Rules are driven by policy config, so they can change after legal review.

## The rules in brief

- **Pricing (PRICE-1 to PRICE-4, §11.1):** every price in an invitation to purchase includes all mandatory charges, and no mandatory fee appears for the first time at checkout. The delivery fee shows as soon as an address is known, stays the same through checkout, and always appears with the free-delivery threshold and the small-basket surcharge rule. A service fee, if ever enabled, is folded into item prices.
- **Consumer contracts and rights (CCR-1 to CCR-5, CRA-1, B2B-1, §11.2):** pre-contract information (the selling merchant's identity and address, VoltDrop as marketplace operator, total price, delivery, cancellation rights, who pays return costs); confirmation on a durable medium; 14-day change of mind from delivery, with category exceptions; a refund within 14 days of getting the goods back; diminished-value deductions only with itemised reasons; faulty claims never rejected on age alone (ADR-0006); business buyers on contractual terms plus implied quality terms.
- **Privacy (PRIV-1 to PRIV-9, §11.3):** lawful bases and a privacy notice; a separate, recorded marketing opt-in and an unsubscribe in every marketing message; no non-essential cookies or analytics before consent; retention enforced by jobs (courier trails 30 days; photos 12 months or until a dispute closes; identity documents 30 days after verification; financial records 6 years; assistant transcripts 30 days); a DPIA; automated decisions that a person can review, with an appeal; the data-protection complaints process; a current sub-processor list; no personal data in logs, search, analytics, error reports or LLM prompts.
- **Product safety (SAFE-1 to SAFE-5, §11.4):** prohibited items blocked at listing and moderation; UKCA or CE marking confirmed, and PSTI fields for connectable products; a recall tool; each merchant's WEEE take-back arrangement shown to customers.
- **Tax (TAX-1 to TAX-5, §11.5):** VAT-inclusive consumer prices with one rounding rule; receipts and invoices in the merchant's name; VoltDrop invoices its own supplies with VAT; seller due-diligence data for HMRC platform reporting; each merchant's UK-establishment status recorded.
- **Payments (PAY-1, PAY-2, §11.6):** no card data on VoltDrop systems; customer funds move only through Stripe.
- **Tips (TIP-1, §11.7):** 100% to the courier, split evenly across trips; any lower share disclosed before payment.
- **Accessibility (A11Y-1, §11.8):** WCAG 2.2 AA on web and native.
- **Right to work (RTW-1, §11.9):** a watch item until the solicitor answers L6.

## When a change touches one of these

1. Read the rule in spec §11, its row in the register, and the ADRs the row cites.
2. Keep the values in policy (`policy_versions`), never in constants.
3. Enforce the rule in code, and prove it with a test that names the rule's ID where practical.
4. Update the register row: "Enforced in", "Proven by" and the status (Planned, Partial, Enforced or Watch).
5. If the change needs a legal or tax judgement the spec doesn't make, don't guess: add a question to docs/open-questions.md, then stop and ask (spec §0).
