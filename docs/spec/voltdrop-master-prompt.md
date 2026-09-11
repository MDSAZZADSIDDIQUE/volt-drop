# VoltDrop — Master Build Prompt for Claude Code

**Product:** VoltDrop, a UK technology quick-commerce marketplace
**Document:** Phase 1 build specification and operating instructions
**Audience:** Claude Code (primary); founder and reviewers (secondary)
**Status:** v1.1, living document. Changes go through ADRs (see §0 and the change log below).

---

## Change log

| Version | Date | Changes | ADRs |
|---|---|---|---|
| v1.1 | 2026-09-11 | Kickoff amendments approved by the founder: the delivery fee is set by policy and locked with the cart; the quote caps the authorisation and the final charge follows the final fulfilment plan; payment-confirmation and partial-fulfilment rules; commission basis, platform-fee timing and half-open time windows; faulty-goods claims are never rejected on age alone; compliance additions (Data (Use and Access) Act 2025, Product Regulation and Metrology Act 2025, right-to-work wording); merchant UK-establishment status and legal review items; Claude Code file protection; production homes for Typesense and Metabase, and SeaweedFS replacing MinIO locally; the merchant app milestone now comes before the customer app | ADR-0002 to ADR-0011 |
| v1.0 | 2026-09-11 | Initial specification | — |

---

## How to use this document (for the human)

1. Create an empty Git repository named `voltdrop` and save this file as `docs/spec/voltdrop-master-prompt.md`.
2. Open Claude Code at the repository root.
3. Send: `Read docs/spec/voltdrop-master-prompt.md in full, then follow §20 (Kickoff).`
4. Approve each milestone plan before Claude Code implements it, and review each milestone demo before approving the next.
5. Local development runs entirely on mock adapters (§10). Add real credentials (Stripe test mode, Uber Direct sandbox, Google Maps, Ideal Postcodes, Icecat, Companies House, Anthropic) as they become available.

The compliance rules in §11 encode a working understanding of UK law for engineering purposes. They are not legal advice. Confirm them with a UK solicitor and accountant before launch.

---

## 0. Your role and operating rules

You are the founding engineer and technical lead for VoltDrop. Build production-grade software that a small team can operate and extend. This is not a demo.

### Source of truth
- This document is the specification. If code and spec disagree, the spec wins unless an Architecture Decision Record (ADR) in `docs/adr/` changes it.
- Third-party capabilities described here (Stripe, Uber Direct, Better Auth, Typesense, Icecat, Ideal Postcodes, Companies House, Anthropic, Expo, Google Maps) are assumptions to verify, not facts. Before writing any adapter, read the provider's current official documentation and record the URLs and the date checked in the adapter's README.

### Milestone workflow (mandatory)
1. Read the milestone in §16 and every section it references.
2. Write `docs/plans/M<n>-plan.md` in plan mode: scope, schema changes, endpoints, screens, jobs, tests mapped to acceptance criteria, risks, open questions.
3. **STOP and wait for approval.**
4. Implement in small vertical steps. Commit after each green step using Conventional Commits.
5. Run the Definition of Done (§14) for the whole milestone.
6. Update `docs/PROGRESS.md`: status, what shipped, known gaps, next steps.
7. **STOP** with a summary, demo instructions, test results, deviations from the spec, and open questions.

Never start the next milestone without explicit approval.

### Decision rules
- If a detail is unspecified and does not affect architecture, money movement, legal compliance, security or data retention: choose the simplest option that keeps behaviour configurable, record it in an ADR, add it to `docs/open-questions.md`, and continue.
- If it does affect any of those: stop and ask.
- The stack in §4 is fixed. A new major dependency, a library swap or new infrastructure needs an ADR and approval. Small, well-maintained utility libraries under MIT, Apache-2.0, BSD or ISC licences are fine.
- Prefer boring, explicit code over clever abstractions. Optimise for the next engineer reading it.

### Honesty rules
- Never report stubbed, mocked or skipped work as done. Mark gaps as `TODO(M<n>): <reason>` and list them in `docs/PROGRESS.md`.
- Never weaken or delete a test to make it pass. If a test is flaky or skipped, say so.
- If you find a flaw or contradiction in this spec, raise it instead of silently working around it.

### Context hygiene
- Keep `CLAUDE.md` under 200 lines. Put detail in `.claude/rules/` and skills (§15).
- Use subagents for context-heavy side work: codebase research, reviews, running and triaging test suites.
- Before your context fills up, write progress into `docs/PROGRESS.md` so a fresh session can resume cleanly.

---

## 1. Product overview

VoltDrop lets people and businesses in the UK order everyday technology products from local independent tech stores and receive them in roughly 30–60 minutes. The range covers cables, chargers and power adapters, mobile and computer accessories, peripherals (mice, keyboards, webcams, headsets), networking kit, storage and small electronics.

### What makes VoltDrop different
1. **Product-first shopping.** Customers choose a product; VoltDrop chooses which store fulfils it. Stores are suppliers, not storefronts.
2. **Availability-aware search.** Customers only see what can actually reach their address within the delivery promise.
3. **Electronics-grade returns.** Serial capture at dispatch, inspection on return, and one linked chain from order to refund.
4. **Compatibility help.** An AI assistant grounded in structured product specs answers "will this work with my device?"
5. **Store operations that need no training.** One tablet app with big buttons and loud alerts.

**Phase 1 goal:** one launch zone, reliable end-to-end ordering, correct money, compliant returns, and an operations console good enough to run the service every day.

### Actors and roles
| Actor | Roles |
|---|---|
| Consumer | `customer` |
| Business buyer | organisation `owner`, `admin`, `buyer` |
| Merchant | merchant `owner`, `manager`; store `staff` |
| VoltDrop staff | `ops_agent`, `catalogue_moderator`, `support_agent`, `finance`, `super_admin` |
| Courier | External, via the delivery provider in Phase 1 |

---

## 2. Scope

### Phase 1: build now
- Customer iOS and Android app (Expo) and customer website (Next.js) with full shopping, checkout, tracking and returns.
- Merchant app (Expo) for store tablets in kiosk mode and for phones; merchant web portal.
- Admin console (web).
- API (modular monolith) and worker; PostgreSQL; Typesense; Redis-compatible cache.
- Consumer and business buyers (organisations, PO references, VAT documents).
- Delivery through a third-party provider (Uber Direct) behind VoltDrop's own delivery interface, plus a mock courier for development and tests.
- Payments through Stripe Connect; weekly merchant settlements computed from VoltDrop's own ledger.
- Returns, reverse deliveries, inspections and serial tracking.
- AI catalogue enrichment and a grounded shopping assistant.
- Notifications (push, email, SMS and automated voice escalation), receipts and VAT documents.
- Production infrastructure on AWS London (eu-west-2).

### Designed for, not built in Phase 1
The architecture must not block any of these:
- VoltDrop's own rider app, rider onboarding and dispatch (a second implementation of the delivery interface).
- Pay-on-invoice and credit terms for business buyers.
- Company-owned warehouses and micro-fulfilment centres (modelled later as a special store type).
- EPOS integrations for automatic stock sync (define an `InventorySync` interface only).
- Public partner API, additional languages, additional countries.
- Promotions engine, loyalty, ratings and reviews.
- ML-based recommendations and dynamic pricing.

### Out of scope
Cash on delivery, in-store point-of-sale sales, microservices, Kubernetes, in-app turn-by-turn navigation.

---

## 3. Product decisions and configurable policy

All policy values live in versioned, audited configuration (`policy_versions`, §7) that admins can edit. None of them are hard-coded constants. Every quote, order and return records the policy versions it used.

| Topic | Phase 1 default | Notes |
|---|---|---|
| Buyer types | Consumer and business both enabled | Business UI shows ex-VAT prices alongside VAT-inclusive totals |
| Launch zone | One zone. Seed data uses a demo polygon for Manchester city centre | Placeholder until the real launch area is chosen |
| Zone hours | Mon–Sat 08:00–21:00, Sun 10:00–18:00, Europe/London | Per zone; stores also have their own hours |
| Delivery promise | Show an ETA; target 60 minutes or less | ETA = store prep time + provider pickup and drop-off estimate |
| Delivery provider | `uber_direct` in production; `mock` in development and tests | Behind the `DeliveryProvider` interface |
| Store acceptance | Ring immediately; reminder push at 60 s; automated phone call at 120 s; auto-reject and re-route at 240 s | All timers configurable |
| Stock reservation | 10 minutes from checkout start; extended once when payment confirmation starts (including 3-D Secure), by a configurable hold | Released on expiry, cancellation or payment failure. An authorisation that arrives after its reservations lapsed follows §8.3 step 7 |
| Cart price lock | 30 minutes from adding an item. The delivery fee shown for the address is locked with the cart for the same period | See invariant 5 in §7 |
| Payment | Authorise the quote total at checkout; capture once every fulfilment is accepted or finally rejected (single partial capture). The capture is computed from the final fulfilment plan and never exceeds the quote in total or per line | Cancel the authorisation if nothing is accepted. See §8.4 |
| Delivery fee | One fee per order, computed by a policy fee rule from the zone, a distance band for the address and the basket value (base fee, distance adjustment, minimum, maximum, free-delivery threshold, small-basket surcharge). Provider quotes set VoltDrop's cost, not the customer's fee | Shown as soon as an address is known, together with the free-delivery threshold and the small-basket surcharge rule; locked with the cart; never first revealed at checkout. Provider cost above the fee is monitored as margin (§8.3) |
| Service fee | Disabled | If ever enabled, it must be folded into displayed item prices (§11.1) |
| Commission | 15% of item gross (the VAT-inclusive item price) per merchant, with category overrides. VAT is charged on top of the commission | Per merchant plan. Example: a £100.00 item carries £15.00 commission plus £3.00 VAT |
| Monthly platform fee | Per merchant plan; deducted on the first settlement statement generated in each calendar month (Europe/London) | Invoiced with VAT on the settlement statement |
| Settlement | Weekly periods from Monday 00:00 up to, but not including, the next Monday 00:00, Europe/London; statement generated Monday; transfer after admin approval | Negative balances carried forward |
| Tips | 100% passed to the courier. When an order has several courier trips, the tip is split evenly across them; the share for a trip that doesn't go ahead is not captured | Only offered if the delivery provider supports tip pass-through. Any lower share must be disclosed clearly before payment |
| Partial fulfilment | The delivery fee is charged in full when at least one fulfilment goes ahead, and refunded if nothing is delivered | Configurable. See §8.4 |
| Consumer returns | Change of mind: 14 days after delivery. Faulty: full refund within 30 days; after that, repair or replacement, then a refund if that fails. After 6 months the consumer must show the fault; claims can still be made for up to 6 years (England and Wales) or 5 years (Scotland). A faulty claim is never rejected on age alone: older claims go to review | Category exclusions for unsealed software or media and hygiene-sealed items |
| Business returns | Change of mind: 24 hours after delivery. Faulty: 30 days | Contractual terms; implied quality terms still apply |
| Return delivery cost | Consumer change of mind: customer pays (disclosed before purchase). Faulty, wrong or damaged: merchant pays | Configurable per reason |
| Refund without return | Suggested when item value is under £15 or return cost exceeds item value | The merchant decides |
| Serial capture | Required for categories flagged `serial_required` or unit price of £50 or more | At dispatch and at return inspection |
| Fraud limits | First order capped at £150; baskets of £250 or more require 3-D Secure | See §12 |
| Courier suitability | Items must weigh 7 kg or less and fit a courier bag (`courier_ok`) | Oversized items excluded in Phase 1 |
| Prohibited items | Loose lithium cells, e-bike and e-scooter batteries, second-hand or refurbished goods, anything without required safety marking | Admin-maintained list |
| Currency, locale, time | GBP, en-GB, Europe/London | Store UTC; apply business rules in Europe/London |
| Time windows | Every period is half-open: it includes its start and excludes its end. Day 1 is the day after delivery (Europe/London), and an N-day window closes at 00:00 Europe/London at the start of day N+1. Hour-based windows (for example 24 hours) run from the exact `delivered_at` | Applies to return windows, SLAs and settlement weeks |

---

## 4. Architecture and technology stack (fixed)

**Shape:** one modular NestJS backend deployed as two processes: `api` (HTTP and WebSocket) and `worker` (background jobs). Both share one PostgreSQL database. Modules communicate through exported service interfaces and domain events delivered by a transactional outbox. No microservices.

| Layer | Choice | Notes |
|---|---|---|
| Language and runtime | TypeScript (strict) on the current Node.js Active LTS | Confirm the version in M0 |
| Monorepo | pnpm workspaces + Turborepo | Shared packages for types, schemas and UI tokens |
| API framework | NestJS on the Fastify adapter | REST under `/v1`; OpenAPI 3.1 generated from code |
| Validation | zod at every boundary | Shared schemas in `packages/domain` |
| API client | orval-generated TypeScript client with TanStack Query hooks | Regenerated on every API change; CI fails on drift |
| Database | PostgreSQL (newest version AWS RDS supports) with PostGIS and pgvector | pgvector is enabled now for later use |
| ORM and migrations | Drizzle ORM + drizzle-kit; raw SQL for locking, ledger and geo queries | Forward-only, reviewed migrations |
| Jobs and scheduling | Graphile Worker (Postgres-backed), including cron | Jobs are enqueued in the same transaction as the state change |
| Events | Transactional outbox → dispatcher job → idempotent handlers | Search indexing, notifications, analytics |
| Cache and live state | Valkey (Redis-compatible) | Never the source of truth |
| Realtime | Socket.IO with Redis adapter; namespaces `customer`, `merchant`, `admin` | Authenticated connections only |
| Search | Typesense: typo tolerance, facets, geo filters, `group_by`, built-in embeddings for hybrid search | Fed from outbox events. Production: Typesense Cloud (ADR-0010); no personal data in the index |
| Auth | Better Auth mounted in the API: email OTP, phone OTP, organisations, two-factor, admin SSO via OIDC, Expo client support | Verify plugin APIs; write an ADR before replacing it |
| Dates and time zones | date-fns with `@date-fns/tz` | Europe/London for business rules |
| Mobile | Expo (React Native) with Expo Router, EAS Build/Submit/Update, NativeWind, TanStack Query | Two apps: `customer-app`, `merchant-app` |
| Customer web | Next.js (App Router), Tailwind, shadcn/ui | Server-rendered, indexable product, category and area pages |
| Internal web | Vite + React + TanStack Router, Query and Table + shadcn/ui + React Hook Form | `merchant-portal`, `admin` |
| Payments | Stripe Connect with Stripe-hosted onboarding and KYC, separate charges and transfers, manual capture, Radar; Payment Element on web, PaymentSheet on mobile | Card data never touches VoltDrop servers |
| Delivery | `DeliveryProvider` interface: `UberDirectProvider`, `MockCourierProvider` | §10 |
| Maps and geo | PostGIS for zones; Google Maps Platform (Routes API for ETAs, Maps SDKs for display) behind `GeoProvider`; Terra Draw or GeoJSON import for zone editing | Mock provider in development |
| Addresses | Ideal Postcodes (Royal Mail PAF) behind `AddressLookup` | Fixture postcodes in development |
| Files | S3 (SeaweedFS locally, ADR-0010), presigned uploads, `sharp` for resizing and metadata stripping | Separate private bucket for sensitive documents |
| Email, push, voice | Postmark with React Email templates (Mailpit locally); Expo push service (FCM/APNs); Twilio SMS and voice | All behind interfaces |
| PDFs | `@react-pdf/renderer` | Receipts, VAT invoices, settlement statements |
| Resilience | `cockatiel` for timeouts, retries and circuit breakers | Used by every adapter |
| AI | Anthropic API via the official TypeScript SDK; model IDs from env (§18) | `LlmClient` interface with a deterministic fake for tests |
| Product data | Icecat behind `ProductDataSource`; fixture catalogue in development | §10 |
| Observability | pino with PII redaction, OpenTelemetry, Sentry (API, web, mobile) | §13 |
| Product analytics | PostHog (EU cloud), loaded only after consent on web | Feature flags stay DB-backed in Phase 1 |
| Reporting | Metabase on a read-only replica and reporting views | Runs on ECS Fargate with its own application database in RDS (ADR-0010) |
| Infrastructure | AWS eu-west-2: ECS Fargate, RDS, ElastiCache (Valkey), S3, CloudFront + WAF, Secrets Manager, KMS; Terraform; GitHub Actions with OIDC. Search runs on Typesense Cloud (ADR-0010) | No Kubernetes |
| Local development | Docker Compose: Postgres (PostGIS + pgvector), Valkey, Typesense, SeaweedFS (S3 API), Mailpit, optional Metabase; Stripe CLI for webhooks | One command up and down |
| Testing | Vitest (with SWC for Nest decorators), Testcontainers, supertest, Playwright + axe, Maestro, k6, fast-check | §14 |
| Git hooks | lefthook: lint-staged formatting and affected-package typecheck on pre-commit | Applies to humans and Claude alike |

---

## 5. Repository layout

```
voltdrop/
├─ apps/
│  ├─ api/                 # NestJS modular monolith; entrypoints: main.ts (http), worker.ts (jobs)
│  │  ├─ src/modules/      # one folder per module (list below)
│  │  └─ evals/            # AI evaluation datasets and scorers
│  ├─ customer-app/        # Expo: iOS/Android shopping app
│  ├─ merchant-app/        # Expo: store tablet (kiosk) and phone
│  ├─ customer-web/        # Next.js: shopping website
│  ├─ merchant-portal/     # Vite + React: catalogue, finance, settings
│  └─ admin/               # Vite + React: operations console
├─ packages/
│  ├─ domain/              # shared enums, zod schemas, money/VAT, ids, state-machine helpers
│  ├─ api-client/          # generated from OpenAPI by orval (never edit by hand)
│  ├─ ui-tokens/           # design tokens (colour, type, spacing) for web and native
│  ├─ ui-web/              # shadcn-based components for customer-web, portal, admin
│  ├─ ui-native/           # React Native components (NativeWind)
│  └─ config/              # tsconfig, eslint, prettier, tailwind presets
├─ infra/
│  ├─ docker/              # docker-compose.yml and service config
│  └─ terraform/           # AWS eu-west-2: staging, production
├─ fixtures/               # catalogue, postcodes, recorded provider responses
├─ docs/
│  ├─ spec/                # this document
│  ├─ adr/                 # NNNN-title.md
│  ├─ plans/               # M<n>-plan.md
│  ├─ design/              # brand direction, tokens, wireframes
│  ├─ compliance/          # register.md, dpia-draft.md, retention.md, subprocessors.md
│  ├─ security/            # threat-model.md, permissions.md
│  ├─ runbooks/            # operational runbooks
│  ├─ PROGRESS.md
│  └─ open-questions.md
├─ .claude/                # rules/, skills/, agents/, settings.json (§15)
└─ CLAUDE.md
```

### API modules
Each module under `apps/api/src/modules/` owns its tables, services, controllers, events, tests and a short README.

| Module | Owns |
|---|---|
| `identity` | Users, sessions, Better Auth wiring |
| `organisations` | Organisations (business buyers and merchants) and membership |
| `access` | Roles, permissions, guards, resource scoping |
| `audit` | Append-only audit log |
| `platform` | Policy versions, feature flags, idempotency keys, outbox |
| `geo` | Zones, addresses, serviceability, ETAs |
| `merchants` | Onboarding, due diligence, plans |
| `stores` | Stores, hours, devices, staff PINs |
| `catalogue` | Categories, products, media, listing submissions, moderation |
| `inventory` | Offers, stock, reservations, stock movements |
| `search` | Indexing and query API |
| `checkout` | Carts, routing, pricing, quotes |
| `orders` | Orders, fulfilments, order lines |
| `delivery` | Delivery jobs, providers, tracking, proof of delivery |
| `payments` | Stripe, webhooks, refunds, disputes, transfers |
| `ledger` | Accounts, journal, balances |
| `settlements` | Statements, transfers, accounting exports, reconciliation |
| `returns` | Return cases, policy engine, inspections, serials |
| `notifications` | Templates, channels, preferences, consent |
| `documents` | Receipts, VAT invoices, PDFs |
| `support` | Support cases and notes |
| `ai` | Assistant, catalogue enrichment, evals |
| `admin` | Console-specific queries and audited interventions |

---

## 6. Engineering conventions (non-negotiable)

### Money and tax
- Money is integer minor units (pence) with currency `GBP`, handled only through `packages/domain/money`. No floating-point arithmetic on money anywhere, including frontends.
- VAT rates are basis points (`2000` = 20%). Prices are stored VAT-inclusive with their rate. Net and VAT are derived per line with one documented rounding rule (round half up at line level), tested exhaustively.
- Totals are always computed server-side. Clients send product IDs, quantities and quote IDs, never prices.

### Identifiers and time
- UUIDv7 primary keys generated in the application. Human-friendly references for support, for example `VD-7K3Q9A` for orders and `RT-4MX2PB` for returns.
- All timestamps are `timestamptz` in UTC. Business rules (hours, return windows, settlement weeks) are evaluated in Europe/London. Test the BST/GMT changeovers.

### State and consistency
- Every stateful aggregate (checkout, order, fulfilment, delivery job, return case, inspection, settlement, merchant application, listing submission) has an explicit transition table in code, a `status` column and an append-only `<aggregate>_events` table. Illegal transitions throw. Property-based tests cover the invariants in §7.
- Stock reservations use conditional updates or row locks. Never read-modify-write stock without a lock.
- Records edited by humans (admin, merchant) use optimistic locking with a `version` column.
- Domain events are written to the outbox in the same transaction as the change. Handlers are idempotent.

### APIs
- REST under `/v1`; cursor pagination; errors as RFC 9457 `application/problem+json` with stable `type` codes; no internal details in errors.
- `Idempotency-Key` is required on endpoints that create checkouts, orders, payments, refunds, returns, transfers or stock movements. Responses are replayed for 24 hours.
- Webhooks: verify signatures, store the raw event keyed by provider event ID (unique), process asynchronously, and make replays safe. Handle out-of-order delivery.
- Deny by default: every endpoint declares its required permissions and resource scope, and has both allow and deny tests.

### Module boundaries
- A module may call another module's exported service or react to its events. It may not import another module's tables or repositories. Enforce this with dependency-cruiser in CI.

### Configuration
- Environment variables are validated with zod at start-up (§18). The app refuses to boot on invalid config.
- Business policy lives in `policy_versions`, not in code.
- Feature flags are DB-backed and scoped by zone, merchant or user segment.

### Logging and privacy
- Structured JSON logs with correlation IDs. Redact names, emails, phone numbers, addresses, tokens and free-text fields.
- Keep personal data out of search indexes, analytics events, error trackers and LLM prompts (beyond the minimum a task needs).

### Frontend
- All user-facing strings live in en-GB message catalogues so languages can be added later.
- WCAG 2.2 AA: semantic markup, labels, visible focus, contrast, reduced motion, and screen-reader support on native.
- Plain English, sentence case, active voice. An action keeps the same name through a flow: the "Accept order" button produces "Order accepted".

### Code quality
- TypeScript strict; no `any`; no non-null assertions without a justifying comment; ESLint + Prettier; small files; comments explain why, not what.
- Pin exact dependency versions. Every commit builds and passes tests.

---

## 7. Domain model

Design the exact schemas yourself. These entities, fields and invariants are required. Monetary fields end in `_minor`; rates end in `_bp`.

### Identity and access
- `users`, sessions and auth tables (Better Auth).
- `organisations` (`kind`: `business_buyer` | `merchant`; legal name; company number; VAT number) and `organisation_members` (role).
- `admin_role_assignments`.
- `store_staff` (display name, hashed 6-digit PIN, lockout counters).
- `devices` (paired store tablets: store, push token, app version, last seen).
- `audit_log` (append-only: actor, action, entity, before, after, reason, IP, user agent, timestamp).

### Geography
- `zones` (PostGIS polygon, status, hours, feature flags).
- `addresses` (PAF fields, UPRN if available, latitude/longitude, delivery instructions, owner).
- `store_service_areas` (store ↔ zone, optional maximum radius).
- `waitlist_entries` (email, postcode, consent record).

### Merchants and stores
- `merchants` (organisation, trading name, status, UK-establishment status with evidence, commission plan, platform fee plan, Stripe account ID, HMRC due-diligence data encrypted where sensitive, WEEE take-back arrangement) and `merchant_documents`.
- `stores` (merchant, address, location point, opening hours, prep time in minutes, status `online|paused|closed`, capabilities such as printer and hardware scanner).

### Catalogue and inventory
- `categories`: tree; JSON Schema for attributes (example in Appendix B); flags `serial_required`, `courier_ok`, `connectable_product` (PSTI); return exclusions; inspection checklist template.
- `products` (canonical): GTINs, brand, model, title, description, attributes JSONB validated against the category schema, per-attribute provenance (`icecat|merchant|llm|admin`), safety-marking confirmation, PSTI statement fields, status `draft|active|blocked`.
- `product_media`, `listing_submissions` (merchant raw input: GTIN, photos, proposed price and stock, status), `moderation_cases`.
- `offers` (store, product, `price_gross_minor`, `vat_rate_bp`, `stock_on_hand`, `stock_reserved`, `max_per_order`, status).
- `stock_reservations` (offer, checkout, quantity, `expires_at`, status) and `stock_movements` (append-only: delta, reason, reference).

### Checkout and orders
- `carts` (address, the delivery fee shown for it and its lock expiry) and `cart_items` (product, quantity, `display_price_minor` shown when added, price-lock expiry).
- `checkouts` (cart snapshot, routing plan, quote, payment intent, status, expiry).
- `quotes` (immutable: lines, VAT breakdown, delivery fee, tip, totals, policy versions, inputs).
- `orders` (buyer user, organisation, PO reference, address snapshot, contact, totals, status, human reference).
- `fulfilments` (order, store, status, acceptance deadline, bag code).
- `order_lines` (fulfilment, product, offer, quantity, unit gross, VAT rate, serial required, status).
- `fulfilment_plan_revisions` (order, reason, lines moved, previous and new store and offer, previous and new unit price, ETA change, actor, timestamp): one row per re-route. The final plan is the quote plus its revisions.

### Delivery
- `delivery_jobs` (fulfilment or return case, direction `forward|reverse`, provider, provider reference, status, provider cost, customer fee, pickup and drop-off snapshots, tracking URL, proof of delivery: PIN verified, photo key, timestamps) and `delivery_events`.
- Courier positions: latest position in Valkey; a sampled trail in Postgres with 30-day retention.

### Returns and serials
- `return_cases` (order, lines, channel `doorstep|in_app`, reason codes, buyer type, policy version, status, SLA deadlines, resolution, amounts).
- `return_evidence`, `return_decisions` (actor, decision, reason).
- `inspections` (checklist results, condition grade A–D, serial match, notes, photos, outcome).
- `serial_records` (order line, serial, stage `dispatch|return`, captured by, photo).

### Money
- `payment_intents` (provider IDs; authorised, captured and refunded amounts; status), `provider_webhook_events` (unique provider event ID), `refunds`, `disputes`, `transfers`.
- `ledger_accounts` (code, type, owner reference), `journal_entries` (reference, description, `occurred_at`), `postings` (entry, account, signed `amount_minor`).
- `settlements` (merchant, period, gross sales, refunds, commission net and VAT, platform fee net and VAT, adjustments, opening balance, net payable, status, statement file, transfer).

**Starter chart of accounts** (extend as needed, via ADR):
`stripe_clearing` (asset) · `merchant_payable:<merchant>` (liability) · `tips_payable` (liability) · `delivery_provider_payable` (liability) · `vat_output` (liability) · `revenue_commission`, `revenue_delivery`, `revenue_platform_fee` (revenue) · `expense_payment_fees`, `expense_delivery_provider`, `expense_goodwill` (expense).

**Posting examples** (merchants sell the goods; VoltDrop sells delivery and charges fees):
- Capture: debit `stripe_clearing` (total) · credit `merchant_payable` (goods gross) · credit `revenue_delivery` (delivery fee net) · credit `vat_output` (VAT on delivery fee) · credit `tips_payable` (tip).
- Commission: debit `merchant_payable` (commission plus its VAT) · credit `revenue_commission` (commission) · credit `vat_output` (VAT on the commission). The commission is the plan rate × item gross (§3).
- Stripe fee: debit `expense_payment_fees` · credit `stripe_clearing`.
- Delivery provider cost: debit `expense_delivery_provider` · credit `delivery_provider_payable`.
- Merchant transfer: debit `merchant_payable` · credit `stripe_clearing`.
- Refund of goods: reverse the goods and commission postings proportionally; refund leaves `stripe_clearing`.

Treat the tax treatment above as a starting assumption to confirm with an accountant (record in `docs/open-questions.md`).

### Platform
- `policy_versions` (key, version, JSON value, `effective_from`, author), `feature_flags`, `outbox`, `idempotency_keys`.
- `notifications`, `notification_preferences` (marketing consent with timestamp and source).
- `support_cases`, `case_notes`, `dsar_requests`.
- `assistant_sessions` and `assistant_messages` (redacted, 30-day retention), `enrichment_jobs`, `match_candidates`, `eval_runs`.

### Invariants (test all of them)
1. `0 ≤ stock_reserved ≤ stock_on_hand` for every offer.
2. Every journal entry's postings sum to zero.
3. Captured ≤ authorised; refunded ≤ captured, per payment and per line.
4. A quote never changes after creation. Each order references exactly one quote, which caps the authorisation. Re-routes are recorded as fulfilment plan revisions, and the capture, computed from the final plan, never exceeds the quote in total or per line.
5. A customer is never charged more than the price displayed when the item was added to the cart, or more than the delivery fee displayed for their address (within the lock), unless they explicitly confirm a new total before paying.
6. Return windows are computed from `delivered_at` in Europe/London, using the half-open day rule in §3 (Time windows).
7. A serial-required line cannot be marked collected without a dispatch serial record.
8. Every admin or merchant action that changes money, stock, status or policy writes an audit entry.
9. A merchant's settlement net payable equals its ledger postings for the period plus the opening balance.

---

## 8. Core workflows

### 8.1 Address and serviceability
Postcode → address lookup → customer picks an address → geocode → resolve zone by PostGIS containment. If the address is unserviceable, offer the waitlist (email, postcode, explicit consent). Otherwise store the zone and address in the session. Everything downstream (search, prices, ETA, delivery fee) is scoped to this address.

### 8.2 Search and product display
- Index one Typesense document per **offer**, with denormalised product fields (title, brand, attributes, category), store ID, store location, price, available stock and status.
- Query: find the stores that serve the customer's zone and are open → filter offers to those stores with available stock above zero and active status → `group_by` product → one card per product.
- Displayed price = the lowest price among eligible offers whose store can meet the delivery promise. Show "Delivery £X, about N min" as soon as the address is known. £X comes from the policy fee rule for the address (§3), and the free-delivery threshold and small-basket surcharge are stated alongside it.
- Facets come from category attribute schemas (connector, wattage, length, standard, brand, price). Maintain synonyms: lead/cable, type-c/usb-c, charger/power adapter, ethernet/network cable, and so on.
- If Typesense is unavailable, fall back to a limited Postgres full-text search.

### 8.3 Cart, routing and checkout
1. **Cart:** each line stores `display_price_minor` and a price-lock expiry. The cart also stores the delivery fee shown for the address and locks it for the same period.
2. **Routing** (`checkout/routing`): the eligible offers for a line are those at in-zone, open, online stores with stock at or above the quantity, a price at or below the line's display price, and an ETA within the promise. Choose the assignment that minimises, in order: number of stores, latest ETA, total price. Greedy set cover with exhaustive search for small baskets is fine. Document the algorithm and test it with fixtures and property tests. If no assignment respects the display prices, show the customer the new total and require confirmation.
3. **Reserve** stock for every line atomically with a TTL. On conflict, re-plan once, then report which lines are unavailable. When payment confirmation starts (including 3-D Secure), extend the reservations once by the configured hold.
4. **Quote:** take the locked delivery fee from the cart (recompute it, with customer confirmation, only if the lock has expired), request a delivery quote per fulfilment for ETA and cost, compute the VAT breakdown and optional tip, and persist an immutable quote. If the provider cost exceeds the fee by more than a configured margin, record it and alert operations; the customer's fee does not change.
5. **Fraud checks** (§12) run before the payment is created.
6. **Payment:** a Stripe PaymentIntent with manual capture for the quote total, confirmed with Payment Element or PaymentSheet (3-D Secure when required).
7. **Order creation** happens on the authorisation webhook, not the client callback: create the order, fulfilments and lines, convert reservations, emit events, alert stores. If the authorisation arrives after its reservations lapsed, re-reserve; if stock is gone, re-route within the quote (§8.4); if that fails, cancel the authorisation and tell the customer.

### 8.4 Store acceptance, re-routing and capture
- Each fulfilment gets an acceptance deadline (§3 timers). The store accepts or rejects with a reason: out of stock, damaged, can't prepare in time.
- On rejection or timeout, try to re-route the affected lines to other stores at or below the quoted price and within the promise. Record each re-route as a fulfilment plan revision. The customer pays the new store's price when it is lower than the quoted price, and each merchant is paid its own offer price. If the ETA gets materially worse (configurable threshold), tell the customer.
- When every fulfilment is accepted or finally rejected, capture once, computed from the final plan: the accepted lines, plus the delivery fee (charged in full when at least one fulfilment goes ahead; §3 Partial fulfilment), plus the tip shares for the courier trips that go ahead. The capture never exceeds the quote in total or per line. If nothing was accepted, cancel the authorisation and notify the customer. Partial fulfilment is shown clearly on the order.

### 8.5 Preparation and handover
- Accepted → preparing: staff pick items; scanning the product barcode confirms the right item; serial-required lines need a serial scan (camera or hardware scanner).
- Ready: print a bag label with the fulfilment's QR code if the device has a printer; otherwise show a large bag code to write on the bag.
- Book the courier at acceptance using the estimated ready time (configurable alternative: book when ready).
- Handover: use the provider's pickup verification (for example a barcode scan) if supported; otherwise staff tap "Handed to courier". Status becomes collected.

### 8.6 Delivery and confirmation
- Provider webhooks drive status and courier position. The customer sees a live map and ETA, with the provider tracking link as a fallback.
- Proof of delivery: a 4-digit PIN shown to the customer and verified by the courier (through the provider's PIN verification if available), plus a photo where supported.
- Delivered → return windows start → receipts are sent (a merchant VAT receipt per fulfilment and a VoltDrop receipt for the delivery fee).
- Failed delivery: the provider returns the item to the store → the store confirms receipt and condition → refund per policy → ledger.

### 8.7 Returns, reverse delivery and inspection
- **Doorstep refusal:** before PIN confirmation, the customer can refuse the item in the app (wrong item, visibly damaged, missing parts, or unopened and unwanted for consumers). The courier takes it back to the store through the provider's return flow, and a return case is created automatically.
- **In-app return:** the customer selects lines and a reason (changed mind, faulty, wrong item, damaged, missing parts), adds photos (required for faulty or damaged) and a serial if required. The policy engine decides eligibility, allowed resolutions, deadlines and who pays for return delivery.
- **Faulty claims by age:** a faulty claim is never rejected automatically because of its age. Within 30 days the consumer can reject the item for a full refund; after that the policy offers repair or replacement, then a refund if that fails; after 6 months the claim goes to review and the consumer must show the fault. Claims can be made for up to 6 years (England and Wales) or 5 years (Scotland).
- **Merchant decision** (tablet or portal) within the SLA (default 24 hours within store hours): refund without return, return then inspect, replacement, reject with a reason, or escalate. A missed SLA escalates to admin automatically.
- **Reverse delivery:** a `reverse` delivery job from the customer to the store through the same provider interface.
- **Inspection:** a category checklist (powers on, physical condition, accessories complete, packaging, serial matches the dispatch record), condition grade and photos. Outcomes: full refund; partial refund with an itemised diminished-value deduction (consumer change of mind only); replacement; reject and send the goods back to the customer; escalate.
- **A serial mismatch never auto-refunds.** It opens a dispute case for admin.
- **Refund execution:** refund the original payment, partially by line. Consumer cancellations must be refunded within 14 days of receiving the goods back or evidence of return; run SLA timers and alerts. Whole-order change-of-mind cancellations also refund the outbound delivery fee. Partial cases follow policy config, pending legal review (open question).
- **Replacement:** a new zero-priced fulfilment from the same store if stock exists; otherwise refund.
- The admin timeline shows the full chain: order → line → return case → reverse delivery → inspection → refund or replacement.

### 8.8 Merchant onboarding
Application (business details, stores, categories) → Companies House lookup → UK-establishment check (status and evidence recorded; applicants who are not UK-established are flagged for admin review) → document upload → Stripe-hosted onboarding (KYC) → HMRC due-diligence data → admin review and approval → store setup (hours, map pin, prep time) → device pairing (QR code with a single-use token) → go live (zone flag).

### 8.9 Listing products
The merchant scans a GTIN in the merchant app or portal. If a canonical product exists, create or update the offer (price, stock); it goes live if the product is active and the merchant is approved. Otherwise, create a listing submission with product and box photos → enrichment pipeline (§8.12) → moderation queue → approve, merge into an existing product, or reject. Bulk price and stock updates by GTIN are available via CSV in the portal.

### 8.10 Weekly settlement
Cron runs Monday 03:00 Europe/London:
1. Compute each merchant's period (Monday 00:00 up to, but not including, the next Monday 00:00, Europe/London) from the ledger.
2. Draft statements (PDF and CSV) showing sales, refunds, commission and platform fee with VAT, adjustments and carried-forward balance. The first statement generated in each calendar month carries the monthly platform fee.
3. Admin reviews and approves (bulk).
4. Make one Stripe transfer per merchant, then mark paid. Negative balances carry forward.
5. Notify merchants.

A separate daily reconciliation job compares the ledger with Stripe balance transactions and reports differences.

### 8.11 Store alerting and escalation
- The kiosk tablet keeps the merchant app in the foreground. The socket connection is the primary channel; push is the backup.
- New fulfilment → full-screen ringing alert until someone taps "Accept order" or "Can't fulfil" → reminder push at 60 s → automated Twilio phone call at 120 s → auto-reject at 240 s → re-route. All timers configurable.
- If the socket is disconnected for more than 30 s, show a red banner and play a warning tone. If the device has been unreachable for 5 minutes, the server sets the store to `paused`.

### 8.12 Catalogue enrichment (AI)
GTIN → Icecat lookup → if the product is missing or incomplete, LLM extraction from photos and text into the category attribute schema with per-field confidence and provenance → duplicate candidates via Typesense hybrid search → LLM adjudicates matches → anything below the confidence threshold goes to the moderation queue. Nothing is auto-published in Phase 1: the pipeline prepares, moderators approve.

### 8.13 Payment disputes
Stripe dispute webhook → support case → evidence pack assembled automatically (quote, receipt, delivery events, PIN verification, photo, serials) → admin reviews and submits → outcome → ledger entries according to the liability policy.

### 8.14 Privacy requests and account deletion
Provide in-app account deletion (required by both app stores) and data export. Deletion pseudonymises personal data but keeps financial records for the statutory period (6 years). Exports are a zip of JSON and CSV files, generated automatically and delivered well within the 30-day deadline.

---

## 9. Applications and key screens

### Design direction (applies to every app)
Create the VoltDrop design system in M0 (`docs/design/`, `packages/ui-tokens`) using a two-pass process:
1. Propose two distinct directions. For each, give 4–6 named colours (hex), typefaces and their roles, a type scale, a layout concept with ASCII wireframes, and guiding principles.
2. Check each direction against generic defaults and revise anything that would look the same for any other product. Then get approval before building UI.

Ground choices in the subject: cables and connectors, UK wiring colour codes, product packaging, speed, local high streets. Avoid these defaults:
- The obvious "electric" cliché: a near-black background with a neon green or yellow accent.
- The cream background with a terracotta accent.
- The generic SaaS kit of identical rounded cards, soft shadows and gradient washes.

Spend boldness in one place, such as the live delivery tracker, and keep everything else quiet. Copy is plain, specific and written in the user's language: customers "track their order" and merchants "accept orders". Nobody sees words like "fulfilment" or "webhook". Errors say what happened and how to fix it; empty screens tell people what to do next.

### Customer app and customer website
Both have the same flows; the website also serves search-indexable pages.
- **Address first:** postcode → address → serviceable, or join the waitlist.
- **Home:** search bar, categories, and task shortcuts ("Charge a device", "Connect to a screen", "Get online", "Desk setup").
- **Search results:** product cards with price and delivery context; filters built from attributes.
- **Product page:** images, key specs, compatibility notes, price, the selling store's identity, delivery fee and ETA to the chosen address, returns summary, and "Ask about compatibility".
- **Cart:** one delivery fee, the ETA, and any price changes clearly flagged.
- **Checkout:** address, contact, delivery instructions, business fields (organisation, PO reference, VAT documents), tip if offered, and Apple Pay, Google Pay or card.
- **Order tracking:** status timeline, live map, ETA, delivery PIN, contact support.
- **Orders, receipts and VAT documents.**
- **Returns:** start and track.
- **Account:** addresses; organisations and members; notification and marketing preferences; delete account.
- **Assistant panel:** product cards linking to product pages.
- **Web only:** server-rendered category, product and area landing pages with schema.org Product/Offer markup; sitemap; cookie consent with no non-essential cookies before consent.

### Merchant app
Built tablet-first for kiosk mode; also runs on phones.
- **Setup:** pair the device with a QR code, then switch staff with a PIN.
- **Orders board:** New (ringing), Preparing, Ready, Handed over. Touch targets at least 56 px, high contrast, audible alerts with a volume check.
- **Order detail:** large item list with images, scan to confirm each item, serial capture, print a label or show a bag code, "Ready for courier", "Handed to courier".
- **Returns inbox:** decisions and inspections with camera and checklist.
- **Stock:** scan a barcode to change stock or price, or pause an item.
- **Store status:** online, paused (with a reason), closed.
- **Offline behaviour:** queue actions locally and replay them idempotently; always show connection state.
- **Barcode input:** from the camera or a hardware scanner (keyboard-wedge input and vendor broadcast intents).

### Merchant portal (web)
- Onboarding.
- Catalogue: offers table, listing submissions, bulk CSV by GTIN.
- Order history and returns.
- Finance: settlement statements, payouts (Stripe's embedded Connect components where suitable), VoltDrop invoices.
- Stores, staff PINs and devices.
- Performance: acceptance time, rejection rate, return rate.
- Documents and support.

### Admin console (web)
- **Live operations:** order board and map, SLA breaches, interventions (cancel, re-route, refund, rebook courier). Every intervention requires a reason and is audited.
- **Merchants:** applications, KYC status, documents, plans, suspension; stores and devices.
- **Catalogue:** moderation queue, duplicate merge, product blocking and recall, category attribute schemas and checklists.
- **Returns and disputes;** support cases with SLAs.
- **Finance:** ledger explorer, settlements (review, approve, transfer), refunds, reconciliation report, Xero export.
- **Configuration:** versioned policy editors, zones (map editor), feature flags.
- **Access:** admin users and roles; audit log viewer.
- **AI:** enrichment review queue, redacted assistant transcripts, eval results.
- **System:** jobs, outbox backlog, webhook events and replays.

---

## 10. Integrations

Every external dependency sits behind a VoltDrop interface with a production adapter and a development/test adapter. Adapters apply timeouts, retries with exponential backoff and jitter (idempotent calls only) and circuit breaking via `cockatiel`, and they log structurally without personal data. CI never calls live providers; contract tests run against recorded fixtures in `fixtures/providers/`.

`MockCourierProvider` must support scripted scenarios: normal delivery, slow pickup, courier cancellation, failed delivery with return to store, and duplicate or out-of-order webhooks.

| Capability | Interface | Production | Development / test | Verify before building |
|---|---|---|---|---|
| Payments | `PaymentGateway` | Stripe | Stripe test mode; mocked in unit tests | Connect onboarding options, separate charges and transfers, manual and partial capture, Radar rules, embedded components |
| Delivery | `DeliveryProvider` | Uber Direct | `MockCourierProvider` | Quotes, create/cancel, webhooks, PIN/photo/barcode proof, return to pickup, tip pass-through, sandbox test couriers |
| Addresses | `AddressLookup` | Ideal Postcodes | Fixture postcodes for the launch zone | PAF fields, UPRN availability, licensing |
| Routing and ETA | `GeoProvider` | Google Maps Platform Routes API | Straight-line distance × 1.4 at 15 km/h | Route matrix limits, pricing, caching terms |
| Product data | `ProductDataSource` | Icecat | `fixtures/catalogue/*.json` (300 products) | Access tier, image usage rights |
| Company data | `CompanyRegistry` | Companies House API | Fixtures | Rate limits |
| LLM | `LlmClient` | Anthropic API | `FakeLlm` (scripted, deterministic) | Current model IDs, tool use, vision input, batch processing |
| Email | `Mailer` | Postmark | Mailpit (SMTP) | Transactional vs broadcast streams |
| Push | `PushSender` | Expo push service (FCM/APNs) | Log sink | Android channels, high priority, custom sounds |
| SMS and voice | `Telephony` | Twilio | Log sink | UK sender rules, voice call API |
| Files | `ObjectStore` | S3 | SeaweedFS (S3 API) | Presigned POST policies |
| Accounting | `AccountingExport` | Xero-compatible manual journal CSV | Same | Import format |
| Stock sync (later) | `InventorySync` | Interface only | — | — |
| Identity checks (Phase 2) | `IdentityVerification` | Certified identity service provider | — | Home Office right-to-work rules |

---

## 11. UK compliance requirements (engineering rules)

Track every rule in `docs/compliance/register.md`: the rule, where it is enforced in code, and the test that proves it. Rules are driven by policy config so they can change after legal review.

### 11.1 Pricing transparency (Digital Markets, Competition and Consumers Act 2024)
- Every price in an invitation to purchase (listings, search results, product page, cart, banners) includes all mandatory charges. No mandatory fee may appear for the first time at checkout.
- The delivery fee is shown as soon as an address is known and stays consistent through checkout.
- Wherever the delivery fee is shown, the free-delivery threshold and the small-basket surcharge rule are shown with it, so no fee appears for the first time later in the journey.
- A customer service fee, if ever enabled, is folded into item prices.
- Automated tests assert that the price on the listing equals the price charged in every golden scenario.

### 11.2 Consumer contracts and rights (Consumer Contracts Regulations 2013; Consumer Rights Act 2015)
- **Pre-contract information:** the selling merchant's identity and address on the product page and at checkout; VoltDrop identified as marketplace operator; total price; delivery; cancellation rights; who pays return costs.
- **Order confirmation** on a durable medium (email with PDF).
- **Change of mind:** 14 days from delivery, with category exceptions (unsealed software or media, hygiene-sealed goods once unsealed). Refund within 14 days of receiving the goods back or evidence of return. Diminished-value deductions only with itemised reasons.
- **Faulty goods:** full refund within 30 days; after that, repair or replacement, then a refund if that fails. Within 6 months, the merchant must show the item wasn't faulty at delivery; after that, the consumer must show the fault. Claims can be made for up to 6 years (England and Wales) or 5 years (Scotland), so a faulty claim is never rejected on age alone.
- **Business buyers** follow the contractual terms in §3 plus implied quality terms.

### 11.3 Privacy (UK GDPR, Data Protection Act 2018, PECR, Data (Use and Access) Act 2025)
- Record lawful bases and publish a privacy notice. Marketing needs a separate, recorded opt-in; every marketing message has an unsubscribe.
- Web cookie consent before any non-essential cookies or analytics. Analytics stays consent-first even though the Data (Use and Access) Act 2025 adds a narrow exemption for statistics-only cookies.
- Retention schedule in `docs/compliance/retention.md`, enforced by scheduled jobs:
  - courier location trails: 30 days;
  - delivery and return photos: 12 months, or until any dispute closes;
  - identity documents: deleted 30 days after verification;
  - financial records: 6 years;
  - assistant transcripts: 30 days.
- A DPIA draft covering location tracking, automated fraud decisions, store auto-rejects and AI features. Automated decisions that block orders or penalise stores must be reviewable by a human, with an appeal path.
- **Data (Use and Access) Act 2025:**
  - a data-protection complaints process (required since 19 June 2026): accept complaints through an electronic form and other channels, acknowledge them within 30 days, and record receipt, the steps taken and the outcome;
  - the reformed rules on automated decision-making: tell people about significant automated decisions, and let them make representations, get human intervention and contest the decision.
- Sub-processor list in `docs/compliance/subprocessors.md`.

### 11.4 Product safety and environment
- Enforce the prohibited-items list (§3) at listing and moderation.
- Electrical items require confirmation of UKCA or CE marking. Connectable products (routers, smart devices) require the PSTI compliance fields, such as the minimum security update period.
- Recall tool: block a product, notify affected buyers and report affected orders.
- Capture each merchant's WEEE take-back arrangement and show take-back information to customers.
- Watch item: the Product Regulation and Metrology Act 2025 lets the government impose product-safety duties on online marketplaces. Review the outcome of the 2026 consultation, and add the duties to the register when regulations are made.

### 11.5 Tax and platform reporting
- Consumer prices are VAT-inclusive.
- Merchants are the sellers of goods, so VAT receipts and invoices are generated in the merchant's name (plain receipts for non-VAT-registered merchants).
- VoltDrop's own supplies (delivery fee, commission, platform fee) are invoiced by VoltDrop with VAT.
- Capture seller due-diligence data for HMRC's digital platform reporting rules and provide an annual export.
- Record each merchant's UK-establishment status. Under the online-marketplace VAT rules, a marketplace can become liable for the VAT on goods sold through it by sellers who are not UK-established; confirm the treatment with the accountant.

### 11.6 Payments
No card data on VoltDrop systems (Stripe-hosted fields only). Customer funds move only through Stripe. With separate charges and transfers, VoltDrop is the merchant of record for card payments, and customer funds sit in its Stripe balance until the weekly transfer. Confirm the regulatory position (Payment Services Regulations 2017, including the commercial-agent exclusion), dispute liability and Stripe's funds-segregation option with a solicitor before M5.

### 11.7 Tips
Default 100% to the courier. Any other share must be disclosed clearly before payment.

### 11.8 Accessibility
WCAG 2.2 AA across web and native: axe checks in Playwright and a manual screen-reader checklist for each release.

### 11.9 Couriers and right to work
From 1 October 2026, platforms engaging individual couriers must run right-to-work checks (Border Security, Asylum and Immigration Act 2025, s.48). When VoltDrop adds its own riders (Phase 2), onboarding must integrate a certified identity service provider before a rider can accept work. For Phase 1, confirm with a solicitor whether the Act's extended liability for labour supply chains means the delivery provider contract needs right-to-work assurances.

---

## 12. Security, privacy engineering and fraud
- **Threat model:** write `docs/security/threat-model.md` (STRIDE) in M2 and update it every milestone.
- **Authentication:**
  - OTP rate limits and lockouts; secure session rotation.
  - Admin accounts require SSO and MFA.
  - Staff PINs hashed with argon2id, with lockout.
  - Device pairing tokens are single-use and short-lived.
  - Mobile tokens live in secure storage.
- **Authorisation:** a permission matrix in `docs/security/permissions.md`; guards plus resource scoping (organisation, merchant, store); generated allow/deny tests for every endpoint.
- **Web:** strict CSP, HSTS, secure cookies, CSRF protection, CORS allowlist.
- **API:** rate limiting per IP, user and route (backed by Valkey); request size limits; SSRF protection for any server-side URL fetch.
- **Files:**
  - Presigned uploads with size and type limits, plus magic-byte verification.
  - Images are re-encoded with EXIF (including GPS) stripped.
  - Sensitive documents go in a separate private bucket with lifecycle deletion.
- **Data:** encryption at rest (KMS) and in transit; application-level encryption for HMRC due-diligence identifiers and dates of birth.
- **Secrets:** never in the repo; AWS Secrets Manager in the cloud; a git-ignored `.env` locally.
- **Supply chain:** dependency audit that fails on high severity; CodeQL or Semgrep; container scanning; SBOM.
- **LLM safety:**
  - Treat merchant-supplied text and product data as untrusted input: delimit it, strip instructions, and never let it change tool permissions.
  - The assistant can only call read-only tools, plus "start return" and "contact support" deep links that the user confirms in the UI.
- **Fraud:**
  - Stripe Radar plus VoltDrop rules: first-order cap, velocity limits (per user, device, card fingerprint and address), 3-D Secure for high-value baskets, blocklists.
  - A manual review queue that holds capture.
  - Every fraud decision is logged with reasons and is reviewable.
- **Backups:** RDS point-in-time recovery, with a documented and rehearsed restore.

---

## 13. Non-functional requirements and observability
- **Capacity (Phase 1):** 2,000 orders a day, 300 stores, 100,000 offers, 50 concurrent staff users. Document the path to 10× without re-architecture.
- **Latency (p95):**
  - search API under 300 ms;
  - quote under 1.5 s including provider calls;
  - store alert delivered under 5 s from order creation;
  - API reads under 200 ms.
- **Availability:** 99.9% for the API and checkout.
- **Degradation:**
  - delivery provider down → pause ordering in the zone with a clear message;
  - Typesense down → Postgres fallback search;
  - Valkey down → sockets fall back to polling.
- **Mobile:** crash-free sessions above 99.5%; cold start under 2.5 s on a mid-range Android device; the merchant app tolerates flaky Wi-Fi.
- **Observability:**
  - OpenTelemetry traces across API and worker; Sentry everywhere; health and readiness endpoints.
  - Business metrics: orders, acceptance time, time to collection, delivery time, re-route rate, cancellation rate, refund rate, zero-result searches, checkout conversion.
  - Alerts for SLA breaches, webhook backlog, job failures and reconciliation differences.

---

## 14. Testing strategy and Definition of Done

### Test layers
- **Unit** (Vitest): money and VAT, pricing, routing, policy engine, state machines, ledger posting rules. Use fast-check property tests for the §7 invariants.
- **Integration** (Testcontainers with Postgres/PostGIS, Valkey, Typesense): repositories, locking, outbox, jobs, webhook handling and replay.
- **Contract:** every adapter against recorded fixtures. The mock and real delivery providers pass the same contract suite.
- **API end-to-end** (supertest): the golden scenarios.
- **Web end-to-end** (Playwright + axe): customer checkout, merchant portal, admin interventions.
- **Mobile end-to-end** (Maestro): customer order to delivery; merchant accept to handover.
- **Load** (k6): search and checkout at 3× Phase 1 peak.
- **Security:** authorisation matrix tests; OWASP ZAP baseline against staging nightly.

### Golden scenarios (automated; must always pass)
1. Consumer order from one store, delivered with PIN; the price on the listing equals the price charged.
2. A two-item basket that could be split is consolidated into one store whose prices are at or below the displayed prices.
3. An unavoidable split into two fulfilments; one store rejects; re-route succeeds; one correct capture.
4. Every store rejects → authorisation cancelled → customer notified.
5. Business buyer with a PO reference → correct merchant VAT invoice and VoltDrop delivery invoice.
6. Consumer changes their mind on day 13 → reverse delivery → inspection passes → refund within SLA → ledger updated → next settlement nets the refund.
7. Faulty, low-value item on day 25 → refund without return.
8. Merchant rejects a return → auto-escalation → admin overrides → refund.
9. Serial mismatch at inspection → dispute case, no automatic refund.
10. Weekly settlement with commission, monthly platform fee, refunds and a negative carry-forward → correct transfers.
11. Store ignores the alert → reminder → automated call → auto-reject → re-route.
12. Unserviceable postcode → waitlist entry with recorded consent.
13. Failed delivery (customer unreachable) → return to store → refund per policy.
14. A webhook delivered twice and out of order → one correct outcome.

### Definition of Done (every task and milestone)
- [ ] Code and tests written; `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm test:int` are green.
- [ ] Migrations generated, reviewed and applied; seeds updated.
- [ ] OpenAPI regenerated; API client updated; no drift.
- [ ] Authorisation allow/deny tests exist for every new endpoint.
- [ ] No personal data in logs, search, analytics or error reports.
- [ ] New UI meets WCAG 2.2 AA (axe clean; keyboard and screen reader checked).
- [ ] Policies are configurable, not hard-coded; the compliance register is updated if a rule was touched.
- [ ] Module README, ADRs and `docs/PROGRESS.md` updated.
- [ ] The `code-reviewer` subagent reviewed the change; findings resolved or recorded.
- [ ] Committed with a Conventional Commit message.

---

## 15. Claude Code setup (create in M0)

Check every configuration format against the current Claude Code documentation (https://code.claude.com/docs) before creating files. Run `/doctor` afterwards.

### `CLAUDE.md`
- Start from Appendix A and keep it under 200 lines.
- Include only always-on facts: purpose, repo map, commands, non-negotiables, workflow, and where the spec and rules live.
- Do not `@import` this spec: imports load into every session. Reference it by path and read the relevant section when needed.

### Path-scoped rules (`.claude/rules/`, with `paths` frontmatter)
| File | Paths | Contents |
|---|---|---|
| `api.md` | `apps/api/**` | Module boundaries, controller/service/repository pattern, problem+json errors, idempotency, authorisation guards |
| `money.md` | Payments, ledger, settlements and checkout pricing code | Integer pence, posting rules, never mutate journal entries, reconciliation |
| `database.md` | Schema and migration folders | Forward-only migrations, locking patterns, indexes, PostGIS usage |
| `web.md` | `customer-web`, `merchant-portal`, `admin` | Data fetching via generated hooks, forms, accessibility, copy rules |
| `mobile.md` | `customer-app`, `merchant-app` | Expo conventions, offline queue, secure storage, accessibility |
| `tests.md` | Test files | Fixtures, factories, no live network, property tests for invariants |

### Skills (`.claude/skills/`)
| Skill | What it does |
|---|---|
| `start-milestone` | Reads §16 and the referenced sections, drafts `docs/plans/M<n>-plan.md`, stops for approval |
| `finish-milestone` | Runs the Definition of Done, updates PROGRESS, writes demo steps, stops. Set `disable-model-invocation: true` |
| `new-module` | Scaffolds an API module with the conventions, tests and README |
| `adr` | Creates a numbered ADR from the template |
| `compliance-check` | Reference skill summarising §11 and the register; use it whenever pricing, returns, privacy or payments change |
| `golden-scenarios` | Runs the golden scenario suite and summarises failures |

### Subagents (`.claude/agents/`)
| Subagent | Tools | Job |
|---|---|---|
| `code-reviewer` | Read-only | Reviews diffs against §6, the rules and the spec; returns prioritised findings |
| `security-reviewer` | Read-only | Looks for authorisation gaps, injection, secrets, personal-data exposure and LLM prompt-injection paths |
| `test-triager` | Can run tests | Runs suites, isolates failures, returns concise root-cause notes |

### Hooks and permissions (`.claude/settings.json`)
- Block edits to `.env` and `.env.*` (except `.env.example`), `*.pem`, `*.key`, Terraform state files and the generated API client (`packages/api-client/src/generated/**`). Use a hook script: permission deny rules can't carry exceptions.
- Deny reads of real env files (`.env`, `.env.local`) so secrets never enter Claude's context.
- After edits to TypeScript files, run Prettier on the edited file.
- Git-level checks (lint, typecheck) live in lefthook so they apply to every contributor.

---

## 16. Milestones

Work through these in order. Each ends with a demo and a STOP. Don't reorder or merge milestones without approval.

### M0: Foundations and Claude Code setup
**Refs:** §4, §5, §6, §9 (design direction), §14, §15, §18

Build:
- Monorepo with every app and package scaffolded and building. TypeScript strict, ESLint, Prettier, dependency-cruiser boundaries, lefthook.
- Docker Compose services with `pnpm infra:up` and `pnpm infra:down`. Env validation and `.env.example`.
- API skeleton:
  - health and readiness endpoints;
  - problem+json errors;
  - pino with redaction;
  - OpenTelemetry bootstrap;
  - API reference UI at `/docs` (non-production only);
  - OpenAPI generation and the orval client.
- Data and jobs:
  - Drizzle setup with a migration enabling PostGIS and pgvector;
  - Graphile Worker process;
  - outbox table and dispatcher;
  - idempotency middleware;
  - `policy_versions` and `feature_flags` tables with typed accessors.
- Domain utilities:
  - `packages/domain/money` and VAT utilities with exhaustive and property-based tests;
  - UUIDv7 and human-reference generators;
  - a state-machine helper.
- GitHub Actions: install, lint, typecheck, unit, integration (Testcontainers), build, OpenAPI drift check, dependency audit.
- Claude Code setup (§15).
- Docs skeleton: PROGRESS, ADR template, ADR-0001 recording the §4 stack, open questions, compliance register skeleton.
- Two design directions in `docs/design/` for approval (§9).

Acceptance:
- A fresh clone runs with `pnpm install && pnpm infra:up && pnpm db:migrate && pnpm dev`.
- CI is green; the money package has 100% branch coverage; `/v1/health` returns OK; OpenAPI is served.

### M1: Walking skeleton (thin end-to-end slice)
**Refs:** §8.1–§8.6 (minimal versions)

Build deliberately minimal versions; later milestones replace them.
- Seed data: one zone, two stores, 30 products with offers.
- Dev-only login with seeded users, excluded from non-local builds.
- Customer web flow:
  - pick a fixture address;
  - Postgres-backed product list;
  - product page and cart;
  - checkout with Stripe test mode and manual capture;
  - order status page (polling).
- Merchant portal: order list with "Accept order", "Ready for courier" and "Handed to courier".
- `MockCourierProvider` completes the delivery lifecycle via webhooks. Capture on acceptance.
- Admin: read-only order list with event timeline.
- Minimal state machines for checkout, order, fulfilment and delivery job.

Acceptance:
- Golden scenario 1 passes as an API end-to-end test and as a Playwright test.
- `pnpm demo:order` works.

### M2: Identity, organisations, access control, audit
**Refs:** §6, §7 (identity), §12

Build:
- Better Auth: email OTP, phone OTP, sessions for web and mobile.
- Organisations (business buyers and merchants), membership and roles.
- Admin SSO via OIDC with MFA; staff PINs; device pairing tokens.
- Permission matrix, guards and resource scoping, with generated allow/deny tests.
- Audit log with a viewer API; rate limiting.
- Account deletion and data-export skeleton; threat model v1.
- Remove dev login outside local environments.

Acceptance:
- Every existing endpoint is protected and tested.
- The permission matrix document matches the tests.
- Every privileged action writes an audit entry.

### M3: Geography and serviceability
**Refs:** §8.1, §10 (addresses, geo)

Build:
- Zones (polygons, hours, status) and zone feature flags.
- `AddressLookup` (Ideal Postcodes and fixtures), geocoding, zone resolution API.
- Store service areas; waitlist with consent.
- `GeoProvider` (Routes API and mock) with ETA caching.
- Admin zone editor (Terra Draw or GeoJSON import).

Acceptance:
- Tests cover containment, zone hours across BST/GMT changes, and the unserviceable flow (golden 12).
- An admin can create, edit and activate a zone.

### M4: Catalogue, offers, moderation and search
**Refs:** §7 (catalogue), §8.2, §8.9, §11.4, Appendix B

Build:
- Catalogue model:
  - category tree with attribute JSON Schemas and inspection checklists for the Phase 1 categories (§17);
  - canonical products;
  - offers.
- Listing and moderation:
  - listing flow (GTIN scan → offer, or a submission);
  - moderation queue (approve, merge, reject, block);
  - prohibited list; safety and PSTI fields;
  - media pipeline (`sharp`, EXIF stripping).
- Search:
  - Typesense collections, indexer via outbox, synonyms;
  - availability-aware search API with facets;
  - Postgres fallback search.
- Portal CSV bulk updates.
- `ProductDataSource` with fixtures and an Icecat adapter skeleton.

Acceptance:
- Only in-zone, open, in-stock offers appear.
- The displayed price is the best eligible offer; synonyms work.
- Search p95 is under 300 ms with 100,000 seeded offers (k6).
- Moderation actions are audited.

### M5: Cart, routing, pricing, checkout, payments and ledger core
**Refs:** §3, §7 (checkout, money), §8.3, §8.4, §11.1, §12 (fraud)

Build:
- Checkout:
  - carts with price locks;
  - routing engine;
  - reservations with TTL and an expiry job;
  - pricing engine (VAT, policy delivery-fee rule locked with the cart, optional folded service fee, tips);
  - immutable quotes;
  - fraud rules and review queue.
- Payments:
  - Stripe PaymentIntents with manual capture;
  - Payment Element on web;
  - webhook ingestion with dedupe;
  - merchant onboarding via Stripe-hosted flow.
- Order lifecycle:
  - order creation on authorisation, including late authorisations after reservations lapsed;
  - accept, reject and timeout handling with re-routing and fulfilment plan revisions;
  - single partial capture computed from the final plan; authorisation cancellation.
- Ledger core: chart of accounts, journal and postings, with posting rules for capture, cancellation and refunds.

Acceptance:
- Golden 2, 3, 4 and 14 pass.
- Invariants 1–5 are property-tested.
- Reservation expiry releases stock.
- The price on the listing equals the price charged.

### M6: Merchant app and store operations
**Refs:** §8.5, §8.11, §9 (merchant app)

Build:
- Expo merchant app with tablet and phone layouts; device pairing; staff PIN switching.
- EAS profiles (development, staging, production) and update channels, shared by both Expo apps.
- Orders board with ringing alerts (socket primary, push backup).
- Escalation job: reminder → Twilio call → auto-reject → re-route.
- Preparation: pick-and-scan confirmation; serial capture; label printing where supported, or an on-screen bag code; handover.
- Store status; stock edits by scan; offline action queue; hardware scanner input.
- Runbook `docs/runbooks/store-device.md` covering MDM, kiosk mode and hardware requirements (devices must be Google Mobile Services certified, or push won't work).

Acceptance:
- Golden 11 passes.
- Alert latency is under 5 s in an integration test.
- The offline queue replays exactly once.

### M7: Customer mobile app
**Refs:** §9 (customer)

Build an Expo app with Expo Router:
- Address onboarding, search, product, cart.
- Checkout with PaymentSheet (Apple Pay and Google Pay).
- Live tracking (socket plus map), orders, receipts, account.
- Notification permissions, deep links, accessibility.
- Uses the EAS profiles and update channels set up in M6.

Acceptance:
- A Maestro flow goes from order to delivered with the mock courier.
- Every interactive element has a screen-reader label.
- Works on small screens (iPhone SE, compact Android).

### M8: Delivery provider integration and live tracking
**Refs:** §8.5, §8.6, §10 (delivery)

Build:
- The final `DeliveryProvider` interface.
- Uber Direct adapter covering quotes, create, cancel, webhooks, proof of delivery, return to pickup, and tip pass-through if supported. Contract tests use recorded fixtures.
- Booking strategy; provider cost and margin monitoring against the policy delivery fee.
- Courier position ingestion pushed to customer sockets.
- Failed-delivery flow; reverse delivery jobs; zone pause on provider outage.

Acceptance:
- The mock and Uber Direct adapters pass the same contract suite (Uber Direct against its sandbox when credentials exist, otherwise recorded fixtures).
- Golden 13 passes.

### M9: Settlements and finance operations
**Refs:** §3, §7 (money), §8.10, §11.5

Build:
- Complete posting rules: commission, platform fee, delivery revenue and VAT, tips payable, Stripe fees, disputes, adjustments.
- Weekly settlement job; statements (PDF and CSV) with VAT on VoltDrop fees.
- Admin approval and Stripe transfers; carry-forward.
- Daily reconciliation against Stripe balance transactions.
- Xero manual-journal CSV export.
- Finance screens in admin; statements and payouts in the portal.

Acceptance:
- Golden 10 passes.
- Invariants 2 and 9 are property-tested.
- Reconciliation shows zero unexplained differences for a seeded month.

### M10: Returns, reverse logistics, inspection and serials
**Refs:** §3, §8.7, §11.2

Build:
- Versioned return policy engine: buyer type × category × reason → eligibility, windows, resolutions, return-cost payer.
- Doorstep refusal and in-app returns.
- Merchant decisions with SLA timers and escalation; reverse deliveries.
- Inspection checklists and grading; serial matching.
- Partial refunds with itemised deductions; replacements; refund SLA timers.
- Dispute cases; the full chain timeline.

Acceptance:
- Golden 6, 7, 8 and 9 pass.
- Table-driven tests cover every policy combination.
- Refund SLA alerts fire.

### M11: Notifications, documents and business buyers
**Refs:** §8.6, §9, §11.2, §11.3, §11.5

Build:
- Notification service with templates, channels, preferences and consent records; React Email templates.
- PDF receipts and VAT invoices.
- Business organisations: invites, roles, PO references, invoice downloads, order history, spend export.
- Waitlist notifications when a zone opens.

Acceptance:
- Golden 5 passes.
- Email snapshot tests pass.
- Unsubscribe works and consent records are verified.

### M12: AI catalogue enrichment and shopping assistant
**Refs:** §8.12, §12 (LLM safety)

Build:
- Enrichment pipeline: Icecat adapter, extraction, duplicate candidates, adjudication, review queue.
- Shopping assistant:
  - tools `search_products`, `get_product`, `compare_products`, `check_compatibility`, `get_order_status`, `start_return_link`, `contact_support`;
  - streaming responses with product cards;
  - never states prices or stock that did not come from a tool;
  - prompt-injection defences, rate limits and cost tracking.
- Eval harness (`pnpm eval`) with datasets in `apps/api/evals/`.

Acceptance:
- Extraction reaches at least 90% field accuracy on the fixture set.
- The assistant returns a relevant product in the top 3 for at least 85% of the query set.
- Evals show zero invented prices or stock.
- Injection test cases pass.

### M13: Admin console and support
**Refs:** §9 (admin), §12

Build:
- The full admin console from §9: live operations board and map, audited interventions, merchant review, catalogue tools, returns and disputes, support cases with SLAs, finance views, policy editors, feature flags, access management, audit viewer, system health.
- Metabase with reporting views and starter dashboards.

Acceptance:
- A scripted walkthrough of a full operating day passes.
- Every intervention is audited and admin roles are enforced.

### M14: Production readiness
**Refs:** §11, §12, §13, §14

Build:
- Infrastructure and deployment:
  - Terraform for staging and production (AWS eu-west-2);
  - CI/CD deploys with migration gates and rollback;
  - WAF and secrets;
  - backups with a rehearsed restore;
  - observability dashboards and alerts.
- Verification:
  - k6 load tests;
  - security review (threat model update, ZAP, dependency audit, authorisation matrix);
  - accessibility audit.
- Compliance:
  - retention jobs;
  - complete data export and deletion;
  - compliance register linked to tests.
- Runbooks: provider outage, store unreachable, payment webhook backlog, refund failures.
- App stores:
  - EAS production builds;
  - store listings (privacy labels, data safety forms, account deletion, review notes);
  - launch checklist.

Acceptance:
- Every golden scenario passes nightly on staging.
- The restore drill is documented.
- The founder signs off the launch checklist.

---

## 17. Seed data and demo

### `pnpm db:seed`
- **Zone:** a demo polygon for Manchester city centre.
- **Stores:** five fictional stores inside the zone, with realistic hours, prep times and coordinates.
- **Catalogue:** 300 fixture products across the Phase 1 categories below. Use valid GTIN check digits, full attribute data and placeholder images. No scraped content.
- **Offers:** varied prices and stock levels, so routing, splits and out-of-stock cases occur naturally.
- **Users:**
  - one consumer;
  - one business organisation with an owner and a buyer;
  - merchant owners;
  - store staff with PINs;
  - one admin per admin role.

### Phase 1 categories and key attributes
| Category | Key attributes and flags |
|---|---|
| Charging (wall, car, wireless, power banks) | Output watts, ports, USB PD/PPS, Qi/Qi2, UK plug, capacity (mAh and Wh) |
| Cables | Connectors, length, maximum power, data standard, video support, e-marker (see Appendix B) |
| Adapters and hubs | Host connector, outputs (HDMI, DisplayPort, USB, Ethernet, SD), maximum resolution and refresh rate, PD pass-through watts |
| Mobile accessories (cases, screen protectors, mounts) | Device compatibility list, material |
| Peripherals (mice, keyboards, webcams, headsets) | Connection type, UK ISO layout for keyboards, resolution and frame rate for webcams, microphone |
| Audio (earphones, speakers) | Connection type; in-ear products flagged hygiene-sealed |
| Networking (routers, mesh, switches, Wi-Fi adapters, powerline) | Wi-Fi standard, ports, speeds; flagged `connectable_product` |
| Storage (USB drives, memory cards, external SSDs) | Capacity, interface, speed class |
| Small electronics (smart plugs, sealed retail battery packs) | Smart devices flagged `connectable_product`; loose lithium cells prohibited |

### Demo scripts
- `pnpm demo:order` drives golden scenario 1 through the API with the mock courier and prints each state transition.
- `pnpm demo:return` drives golden scenario 6.
- `pnpm demo:settlement` generates a settlement week from seeded orders.

---

## 18. Environment variables

Document every variable in `.env.example` and validate all of them with zod at start-up. Defaults point at mock adapters, so a fresh clone runs without any external accounts.

```dotenv
# Core
APP_ENV=local                      # local | staging | production
NODE_ENV=development
API_BASE_URL=http://localhost:4000
CUSTOMER_WEB_URL=http://localhost:3000
ADMIN_URL=http://localhost:5173
MERCHANT_PORTAL_URL=http://localhost:5174

# Data
DATABASE_URL=postgres://voltdrop:voltdrop@localhost:5432/voltdrop
DATABASE_READONLY_URL=
REDIS_URL=redis://localhost:6379
TYPESENSE_URL=http://localhost:8108
TYPESENSE_API_KEY=
S3_ENDPOINT=http://localhost:9000  # SeaweedFS S3 API locally
S3_REGION=eu-west-2
S3_BUCKET_PUBLIC=voltdrop-public
S3_BUCKET_PRIVATE=voltdrop-private
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
FIELD_ENCRYPTION_KEY=              # local only; KMS in cloud environments

# Auth
AUTH_SECRET=
AUTH_TRUSTED_ORIGINS=
ADMIN_OIDC_ISSUER=
ADMIN_OIDC_CLIENT_ID=
ADMIN_OIDC_CLIENT_SECRET=

# Payments
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Delivery
DELIVERY_PROVIDER=mock             # mock | uber_direct
UBER_DIRECT_CUSTOMER_ID=
UBER_DIRECT_CLIENT_ID=
UBER_DIRECT_CLIENT_SECRET=
UBER_DIRECT_WEBHOOK_SECRET=

# Geo and addresses
GEO_PROVIDER=mock                  # mock | google
GOOGLE_MAPS_SERVER_KEY=
GOOGLE_MAPS_WEB_KEY=
GOOGLE_MAPS_ANDROID_KEY=
GOOGLE_MAPS_IOS_KEY=
ADDRESS_PROVIDER=fixture           # fixture | ideal_postcodes
IDEAL_POSTCODES_API_KEY=

# Product and company data
PRODUCT_DATA_PROVIDER=fixture      # fixture | icecat
ICECAT_USERNAME=
ICECAT_API_KEY=
COMPANY_REGISTRY_PROVIDER=fixture  # fixture | companies_house
COMPANIES_HOUSE_API_KEY=

# AI (verify current model IDs in the Anthropic documentation)
LLM_PROVIDER=fake                  # fake | anthropic
ANTHROPIC_API_KEY=
ASSISTANT_MODEL=claude-haiku-4-5-20251001
CATALOGUE_MODEL=claude-sonnet-5

# Messaging
EMAIL_PROVIDER=smtp                # smtp | postmark
SMTP_URL=smtp://localhost:1025
POSTMARK_SERVER_TOKEN=
EMAIL_FROM="VoltDrop <orders@voltdrop.example>"
PUSH_PROVIDER=log                  # log | expo
EXPO_ACCESS_TOKEN=
TELEPHONY_PROVIDER=log             # log | twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

# Observability and analytics
SENTRY_DSN_API=
SENTRY_DSN_WEB=
SENTRY_DSN_MOBILE=
OTEL_EXPORTER_OTLP_ENDPOINT=
POSTHOG_KEY=
POSTHOG_HOST=                      # PostHog EU cloud host
```

---

## 19. Glossary

| Term | Meaning |
|---|---|
| Canonical product | The single product record shared by every store, keyed by GTIN |
| Offer | One store's price and stock for a canonical product |
| Fulfilment | The part of an order that one store prepares; one courier trip |
| Zone | The area (polygon) where VoltDrop delivers |
| Quote | The immutable price breakdown behind a checkout |
| Price lock | The period during which a cart line's displayed price is honoured |
| Reverse delivery | A courier trip from the customer back to the store for a return |
| Inspection | The store's recorded check of a returned item |
| Serial record | A serial number captured at dispatch or at return |
| Settlement | The weekly statement and transfer for a merchant |
| GTIN | Global Trade Item Number: the EAN/UPC barcode number |
| PAF | Royal Mail's Postcode Address File |
| UPRN | Unique Property Reference Number |
| MDM | Mobile device management: remote control of store tablets |
| Kiosk mode | A device locked to a single app through MDM |

---

## 20. Kickoff (do this first)

1. Read this document in full.
2. Reply with:
   - (a) your understanding, in at most 15 bullet points;
   - (b) the 10 biggest risks or ambiguities you see;
   - (c) any changes you recommend to this spec, with reasons. Do not apply them yet.
3. Check the current versions and documentation for Node.js LTS, Expo SDK, NestJS, Next.js, Drizzle, Better Auth, Typesense, Graphile Worker, the Stripe APIs and Claude Code configuration. Note anything that changes a choice in §4.
4. Write `docs/plans/M0-plan.md` and **stop for approval**.

---

## Appendix A: `CLAUDE.md` starting point

Adapt as the project grows. Keep it under 200 lines and keep it factual.

```markdown
# VoltDrop

UK tech quick-commerce marketplace. Customers order tech essentials; VoltDrop routes each order
to a local store and a courier delivers in about 30–60 minutes.

Spec (source of truth): docs/spec/voltdrop-master-prompt.md. Read the relevant section before
changing a module. Do not @import it.
Status: docs/PROGRESS.md. Plans: docs/plans/. Decisions: docs/adr/. Open questions: docs/open-questions.md.

## Workflow
- Work in milestones, in order (spec §16): plan → STOP for approval → small commits →
  Definition of Done (spec §14) → update PROGRESS → STOP with demo steps.
- Use /start-milestone and /finish-milestone. Run the code-reviewer subagent before finishing.
- If an unclear detail doesn't touch architecture, money, compliance, security or retention:
  pick the simplest configurable option, write an ADR, continue. Otherwise ask.

## Commands
- pnpm infra:up / pnpm infra:down: local services (Docker)
- pnpm dev: all apps. pnpm dev:api: API and worker only
- pnpm db:generate, pnpm db:migrate, pnpm db:seed
- pnpm api:generate: regenerate OpenAPI and the client
- pnpm lint, pnpm typecheck, pnpm test, pnpm test:int, pnpm e2e, pnpm golden, pnpm eval
- pnpm demo:order, pnpm demo:return, pnpm demo:settlement

## Repo map
- apps/api: NestJS modular monolith (http + worker); modules in src/modules
- apps/customer-app, apps/merchant-app: Expo
- apps/customer-web: Next.js
- apps/merchant-portal, apps/admin: Vite + React
- packages/domain: money, VAT, schemas, ids, state machines
- packages/api-client: generated. Never edit by hand
- packages/ui-tokens, ui-web, ui-native, config
- infra/, fixtures/, docs/

## Non-negotiables
- Money is integer pence via packages/domain/money. Never floats. The server computes all totals.
- Store UTC; evaluate business rules in Europe/London.
- Change state only through the aggregate's transition table, and append an event.
- Side effects go through the outbox; handlers are idempotent. Idempotency-Key on money and stock endpoints.
- Deny-by-default authorisation; every endpoint has allow and deny tests.
- A module never touches another module's tables.
- Policy values come from policy_versions, never constants.
- No personal data in logs, search, analytics, LLM prompts or Sentry.
- Price shown = price charged. No fee appears for the first time at checkout.
- Never report stubs as done. Never weaken tests to make them pass.
- Never edit .env files (except .env.example) or generated clients by hand.

## External services
All sit behind interfaces with mock adapters (spec §10). Read the provider's current docs before
coding an adapter and cite them in the adapter README. CI never calls live services.
```

---

## Appendix B: Example category attribute schema

Every category defines its attributes as JSON Schema. Products are validated against it, search facets are generated from it, and the AI extraction pipeline targets it.

```json
{
  "$id": "voltdrop/categories/cables",
  "title": "Cables",
  "type": "object",
  "required": ["connector_a", "connector_b", "length_m", "data_standard"],
  "properties": {
    "connector_a": { "enum": ["usb_c", "usb_a", "lightning", "micro_usb", "hdmi", "mini_hdmi", "displayport", "rj45"] },
    "connector_b": { "enum": ["usb_c", "usb_a", "lightning", "micro_usb", "hdmi", "mini_hdmi", "displayport", "rj45"] },
    "length_m": { "type": "number", "minimum": 0.1, "maximum": 15 },
    "max_power_w": { "type": "integer", "enum": [15, 60, 100, 240] },
    "data_standard": {
      "enum": ["usb2", "usb3_2_gen1", "usb3_2_gen2", "usb4_20", "usb4_40", "usb4_80",
               "thunderbolt_3", "thunderbolt_4", "thunderbolt_5", "hdmi_2_0", "hdmi_2_1",
               "dp_1_4", "dp_2_1", "cat6", "cat6a", "none"]
    },
    "video_support": { "type": ["string", "null"], "description": "Maximum video output, e.g. \"4K@60Hz\"; null if none" },
    "e_marker": { "type": "boolean" },
    "courier_ok": { "type": "boolean", "default": true }
  },
  "x-voltdrop": {
    "facets": ["connector_a", "connector_b", "length_m", "max_power_w", "data_standard"],
    "serial_required": false,
    "inspection_checklist": ["connectors undamaged", "charges or transfers data", "original packaging present"]
  }
}
```
