# ADR-0008: Record merchant UK-establishment status; legal review items for the payment model

- **Status:** Accepted
- **Date:** 2026-09-11
- **Deciders:** Founder (kickoff recommendation (c)5, approved 2026-09-11); Claude Code
- **Spec sections:** v1.1 §7 (merchants), §8.8, §11.5, §11.6

## Context

- **Payments.** With Stripe Connect separate charges and transfers, VoltDrop is the merchant of record for card payments. Customer money sits in VoltDrop's Stripe balance until the weekly transfer. Meanwhile merchants are the legal sellers of the goods, for VAT and consumer law. Three things need a solicitor's view: the regulatory position under the Payment Services Regulations 2017 (including the commercial-agent exclusion), who is liable for disputes, and whether Stripe's funds-segregation option for this charge type should be used.
- **VAT.** Under the UK online-marketplace VAT rules, a marketplace can become liable for the VAT on goods sold through it by sellers who are not UK-established. VoltDrop works with local stores, but a store's owning business could still be established abroad.

## Decision

1. Merchant onboarding records UK-establishment status with evidence. The evidence is the Companies House registered office and trading address, plus the VAT registration where there is one. `merchants` gains the field.
2. Applicants who are not UK-established are flagged for admin review. They aren't rejected automatically; the accountant decides the policy.
3. These questions go to the solicitor and accountant, and must be answered before M5 ships payments:
   - the Payment Services Regulations position;
   - dispute liability;
   - funds segregation;
   - the treatment of sellers who aren't UK-established.

## Consequences

- `TODO(M5)`: the onboarding data model includes establishment status and evidence.
- The founder's legal and accounting review is on the critical path for M5 (payments).

## Alternatives considered

- **Block sellers who aren't UK-established.** This is safe, but it may be stricter than necessary. Flagging keeps the decision with a person until the accountant advises.
- **Switch to destination charges with `on_behalf_of`.** This doesn't work for multi-store baskets, because one charge can only be on behalf of one merchant.
