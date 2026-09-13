# Compliance register

Every UK compliance rule from spec §11 (v1.1): where it's enforced in code and which test proves it. Rules are driven by policy config, so they can change after legal review. This is an engineering register, not legal advice; the open legal and tax questions are in `docs/open-questions.md`.

**Status values:**
- **Planned:** not built yet; the milestone column says when.
- **Partial:** some enforcement exists.
- **Enforced:** code and tests are in place.
- **Watch:** no engineering work yet; monitor for change.

Update this file whenever a change touches pricing, returns, privacy, payments or safety (the `compliance-check` skill).

## 11.1 Pricing transparency (Digital Markets, Competition and Consumers Act 2024)

| ID | Rule | Enforced in | Proven by | Milestone | Status |
|---|---|---|---|---|---|
| PRICE-1 | Every price in an invitation to purchase includes all mandatory charges; no mandatory fee appears for the first time at checkout | Search, product page, cart and pricing engine | Golden scenarios assert listing price = charged price | M1, M4, M5 | Planned |
| PRICE-2 | The delivery fee is shown as soon as an address is known and stays the same through checkout (policy fee locked with the cart, ADR-0002) | `checkout` pricing engine and cart lock | Property test: fee stable from listing to capture within the lock | M5 | Planned |
| PRICE-3 | Wherever the delivery fee is shown, the free-delivery threshold and small-basket surcharge rule are shown with it | Web and app UI components | UI tests and Playwright | M4, M5, M7 | Planned |
| PRICE-4 | A service fee, if ever enabled, is folded into item prices | Pricing engine | Unit tests on the pricing engine | M5 | Planned |

## 11.2 Consumer contracts and rights (Consumer Contracts Regulations 2013; Consumer Rights Act 2015)

| ID | Rule | Enforced in | Proven by | Milestone | Status |
|---|---|---|---|---|---|
| CCR-1 | Pre-contract information: the selling merchant's identity and address, VoltDrop as marketplace operator, total price, delivery, cancellation rights, who pays return costs | Product page and checkout | Playwright checks on product page and checkout | M4, M5 | Planned |
| CCR-2 | Order confirmation on a durable medium (email with PDF) | `notifications`, `documents` | Email snapshot tests | M11 | Planned |
| CCR-3 | Change of mind: 14 days from delivery, using half-open windows (ADR-0005), with category exceptions | Return policy engine | Table-driven policy tests; golden 6 | M10 | Planned |
| CCR-4 | Refund within 14 days of receiving the goods back or evidence of return | Refund SLA timers and alerts | SLA timer tests | M10 | Planned |
| CCR-5 | Diminished-value deductions only with itemised reasons | Inspection outcomes | Policy tests | M10 | Planned |
| CRA-1 | Faulty goods: 30-day refund, then repair or replacement, then refund; after 6 months the consumer shows the fault; never rejected on age alone (ADR-0006) | Return policy engine | Table-driven tests for every age band; golden 7 | M10 | Planned |
| B2B-1 | Business buyers: contractual terms (§3) plus implied quality terms | Return policy engine | Table-driven policy tests | M10 | Planned |

## 11.3 Privacy (UK GDPR, Data Protection Act 2018, PECR, Data (Use and Access) Act 2025)

| ID | Rule | Enforced in | Proven by | Milestone | Status |
|---|---|---|---|---|---|
| PRIV-1 | Lawful bases recorded; privacy notice published | Docs and web | Launch checklist | M14 | Planned |
| PRIV-2 | Marketing needs a separate, recorded opt-in; every marketing message has an unsubscribe | `notifications` preferences and consent records | Consent and unsubscribe tests | M11 | Planned |
| PRIV-3 | Web cookie consent before any non-essential cookies or analytics; analytics stays consent-first | Customer web consent banner; PostHog loaded after consent | Playwright: no analytics requests before consent | M1, M11 | Planned |
| PRIV-4 | Retention enforced by scheduled jobs: courier trails 30 days; delivery and return photos 12 months or until any dispute closes; identity documents 30 days after verification; financial records 6 years; assistant transcripts 30 days | Retention jobs | Job tests with seeded ages | M8, M12, M14 | Planned |
| PRIV-5 | DPIA draft; automated decisions that block orders or penalise stores can be reviewed by a human, with an appeal path | Fraud review queue; auto-reject and auto-pause review | Review and appeal flow tests | M2, M5, M6 | Planned |
| PRIV-6 | Data-protection complaints process (since 19 June 2026): electronic form and other channels, acknowledgement within 30 days, records of receipt, steps and outcome | `support` complaint intake and records | Intake and record tests | M2, M13 | Planned |
| PRIV-7 | Automated-decision safeguards: inform the person; let them make representations, get human intervention and contest | Notifications and review flows | Flow tests | M2, M5 | Planned |
| PRIV-8 | Sub-processor list kept current | `docs/compliance/subprocessors.md` | Launch checklist | M14 | Planned |
| PRIV-9 | No personal data in logs, search indexes, analytics events, error reports or LLM prompts (beyond the minimum a task needs) | Log redaction (M0); search documents (M4); analytics (M11); Sentry scrubbing (M1); LLM prompt building (M12) | Redaction tests capture real log output (M0), then per surface | M0 onwards | Partial (M0: logging) |

## 11.4 Product safety and environment

| ID | Rule | Enforced in | Proven by | Milestone | Status |
|---|---|---|---|---|---|
| SAFE-1 | Prohibited-items list enforced at listing and moderation | `catalogue` listing and moderation | Moderation tests | M4 | Planned |
| SAFE-2 | UKCA or CE marking confirmed for electrical items; PSTI fields for connectable products | Product schema validation | Catalogue validation tests | M4 | Planned |
| SAFE-3 | Recall tool: block a product, notify affected buyers, report affected orders | Admin catalogue tools | Recall flow test | M4, M13 | Planned |
| SAFE-4 | Each merchant's WEEE take-back arrangement is captured and shown to customers | Merchant onboarding; product page | Onboarding and page tests | M4, M5 | Planned |
| SAFE-5 | Product Regulation and Metrology Act 2025: online-marketplace duties once regulations are made | — | — | — | Watch |

## 11.5 Tax and platform reporting

| ID | Rule | Enforced in | Proven by | Milestone | Status |
|---|---|---|---|---|---|
| TAX-1 | Consumer prices are VAT-inclusive; VAT is derived per line with one rounding rule | `packages/domain` money and VAT (ADR-0012) | Exhaustive and property-based tests, 100% branch coverage | M0 | Enforced (M0 step 2) |
| TAX-2 | VAT receipts and invoices in the merchant's name (plain receipts for merchants who aren't VAT-registered) | `documents` | Golden 5; PDF snapshot tests | M11 | Planned |
| TAX-3 | VoltDrop invoices its own supplies (delivery fee, commission, platform fee) with VAT | `documents`, `settlements` | Golden 5 and 10 | M9, M11 | Planned |
| TAX-4 | Seller due-diligence data captured for HMRC digital platform reporting, with an annual export | `merchants`, `settlements` export | Export tests | M5, M9 | Planned |
| TAX-5 | Each merchant's UK-establishment status recorded; applicants who aren't UK-established are flagged for review (ADR-0008) | Merchant onboarding | Onboarding tests | M5 | Planned |

## 11.6 Payments

| ID | Rule | Enforced in | Proven by | Milestone | Status |
|---|---|---|---|---|---|
| PAY-1 | No card data on VoltDrop systems (Stripe-hosted fields only) | Payment Element and PaymentSheet integrations | Security review; no card fields in the API | M1, M5, M7 | Planned |
| PAY-2 | Customer funds move only through Stripe; regulatory position confirmed before M5 (ADR-0008) | `payments` | Legal sign-off (open question L1) | M5 | Planned |

## 11.7 Tips

| ID | Rule | Enforced in | Proven by | Milestone | Status |
|---|---|---|---|---|---|
| TIP-1 | 100% of the tip to the courier, split evenly across trips (ADR-0004); any lower share disclosed before payment | Pricing engine; delivery provider adapter | Allocation property tests (M0); pass-through tests (M8) | M5, M8 | Partial (M0: allocation) |

## 11.8 Accessibility

| ID | Rule | Enforced in | Proven by | Milestone | Status |
|---|---|---|---|---|---|
| A11Y-1 | WCAG 2.2 AA across web and native | Every UI | axe in Playwright; manual screen-reader checklist per release | M1 onwards | Planned |

## 11.9 Couriers and right to work

| ID | Rule | Enforced in | Proven by | Milestone | Status |
|---|---|---|---|---|---|
| RTW-1 | From 1 October 2026, right-to-work checks for individual couriers. Phase 2 riders need a certified identity service provider; Phase 1 needs a legal view on delivery-provider contract assurances | — | Legal sign-off (open question L6) | Launch; Phase 2 | Watch |
