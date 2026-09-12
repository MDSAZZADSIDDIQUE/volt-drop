# Open questions

The live list of questions the spec can't answer by itself. Each entry says who needs to answer, what it blocks, and where it came from. When a question is answered, record the answer (or the ADR that captures it), and move the entry to "Answered" at the bottom.

Last updated: 2026-09-12 (M0 step 10).

## For the solicitor

| # | Question | Blocks | Source |
|---|---|---|---|
| L1 | With Stripe Connect separate charges and transfers, VoltDrop is the merchant of record and holds customer funds until the weekly transfer. What is our position under the Payment Services Regulations 2017, including the commercial-agent exclusion? Should we use Stripe's funds-segregation option? | M5 | ADR-0008, spec §11.6 |
| L2 | How should dispute and refund liability be allocated between VoltDrop and merchants in the merchant terms? | M5, M9 | ADR-0008 |
| L3 | When a consumer cancels part of an order, must the outbound delivery fee be refunded in proportion? | M10 | spec §8.7 |
| L4 | What evidence and limits apply to diminished-value deductions on change-of-mind returns? | M10 | spec §8.7, §11.2 |
| L5 | Confirm the delivery-fee display approach: a policy fee shown when the address is known, with the free-delivery threshold and small-basket surcharge alongside it. | M5 | ADR-0002, spec §11.1 |
| L6 | Does the Border Security, Asylum and Immigration Act 2025's extended labour-supply-chain liability mean the Uber Direct contract needs right-to-work assurances in Phase 1? | Launch | ADR-0007, spec §11.9 |
| L7 | Data (Use and Access) Act 2025: who owns the data-protection complaints process, and what wording do we use for the automated-decision safeguards (fraud blocks, store auto-rejects, auto-pausing)? | M2, launch | ADR-0007, spec §11.3 |
| L8 | How do we classify buyers who could be consumers or businesses (for example a sole trader buying on a business account for mixed use)? | M10, M11 | spec §3, §11.2 |
| L9 | Product Regulation and Metrology Act 2025: which online-marketplace duties apply to VoltDrop once regulations are made? (watch item) | Launch | ADR-0007, spec §11.4 |
| L10 | Terms and notices: how is VoltDrop identified as the marketplace operator, and what's in the merchant terms and the customer terms? | Launch | spec §11.2 |

## For the accountant

| # | Question | Blocks | Source |
|---|---|---|---|
| A1 | Is the delivery fee a separate supply by VoltDrop (standard-rated), or part of the merchant's supply of goods? This decides the §7 capture posting. | M5 | spec §7 |
| A2 | Is VAT on commission and the platform fee correct as proposed: 15% of item gross, with VAT added on top? What does this mean for merchants who aren't VAT-registered? Can the settlement statement serve as the VAT invoice? | M9 | ADR-0005 |
| A3 | Under the online-marketplace VAT rules, how should we treat sellers who aren't UK-established? Should they be blocked? | M5 | ADR-0008, spec §11.5 |
| A4 | What is the VAT and income-tax treatment of tips passed through to couriers? | M5, M8 | spec §3, §11.7 |
| A5 | HMRC digital platform reporting: which thresholds apply, and what export format and deadlines? | M9 | spec §11.5 |
| A6 | Confirm the chart of accounts and posting rules in spec §7. | M5, M9 | spec §7 |

## Product and operations (founder)

| # | Question | Blocks | Source |
|---|---|---|---|
| P1 | Where is the real launch zone? (Seed data uses a Manchester city-centre demo polygon.) | Launch | spec §3 |
| P2 | Uber Direct: does it cover the launch zone? In the UK, does it support PIN verification, tip pass-through, return-to-pickup and collections from customers for returns? When do we get sandbox access? | M8 | kickoff risk 5 |
| P3 | Delivery-fee policy values: base fee, distance bands, minimum and maximum, free-delivery threshold, small-basket surcharge and margin alert threshold. | M5 | ADR-0002 |
| P4 | Typesense Cloud region, data-processing terms and budget (reconfirm before M14). | M14 | ADR-0010 |
| P5 | Which domain name will we use for the email sender and web apps? (Error `type` codes use a URN, so they don't depend on it.) | M11 | M0 plan |
| P6 | Is the GitHub repository private? This affects CodeQL availability and Actions minutes. | M0 CI, M14 | M0 plan |
| P7 | Do you want Dependabot or Renovate for dependency update pull requests? | M0 | M0 plan |
| P8 | How long should dispatched outbox events be kept? They hold identifiers, not personal data, and help when investigating incidents. Until you decide, nothing is deleted. A suggested default is 30 days after dispatch. | M13 | ADR-0015 |

## Engineering decisions made under the §0 decision rule

Details that don't affect architecture, money, compliance, security or retention are decided by Claude Code, recorded in an ADR, and listed here so the founder can review them.

| Decision | ADR | Milestone |
|---|---|---|
| Local pgvector is 0.8.6 (prebuilt, pinned) rather than RDS's 0.8.1, and local PostGIS is 3.6.4 against 3.6.3 on RDS. Both are patch-level differences. | ADR-0001 | M0 |
| Only install npm package versions at least a day old (pnpm 11's minimum release age). Where the newest release is younger, the one before it is pinned and listed in `docs/PROGRESS.md` until it can be bumped; vite was held at 8.2.2 this way until 8.3.0 qualified | ADR-0001 | M0 |
| S3 clients send checksums only when an operation requires them, because the AWS SDK default breaks presigned uploads to S3-compatible stores | ADR-0010 (implementation notes) | M0, M4 |
| Added `API_PORT` and `LOG_LEVEL` to the environment variables | ADR-0001 | M0 |
| Idempotency fingerprints use the request path (with its query), not the route template, and a lock token stops a request that lost its lease from committing | ADR-0014 | M0 |
| Feature flags: when a caller's user segments disagree, disabled wins | ADR-0016 | M0 |
| Readiness needs PostgreSQL (fully migrated) and Valkey; without Typesense the API reports itself `degraded` but keeps taking traffic | M0 plan §6 | M0 |
| Policy keys follow ADR-0004's naming (`area.snake_case_name`); version 1 of five M0 policies is seeded by migration with the spec v1.1 §3 defaults | M0 plan step 6 | M0 |
| Every route sets an explicit verb-noun operation id (`getHealth`), which names the generated client's functions and hooks (`useGetHealth`) | ADR-0013 | M0 |
| Client apps read the API address from `EXPO_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_API_BASE_URL` or `VITE_API_BASE_URL`, because each bundler only exposes its own prefix; documented in `.env.example` | M0 plan step 8 | M0 |
| No `eslint-plugin-jsx-a11y` yet: its newest release (6.10.2) doesn't support ESLint 10. Components are tested for roles, names, keyboard use and focus instead, and the plugin is re-checked before M1 | M0 plan step 8 | M0 |
| The spec's CORS allowlist (§12) is exactly the three web apps' origins from the environment (`CUSTOMER_WEB_URL`, `ADMIN_URL`, `MERCHANT_PORTAL_URL`), with no credentials until sign-in (M2). `AUTH_TRUSTED_ORIGINS` stays for the auth library | M0 plan step 8 | M0 |
| Turbo runs cached tasks in strict environment mode. The apps' public variables (`NEXT_PUBLIC_*`, `VITE_*`, `EXPO_PUBLIC_*`) need no declaration: Turbo's framework inference hashes and passes them (checked with a dry run). The telemetry opt-outs and `CI` pass through without affecting cache keys. `dev` and `test:int` are never cached, so they run in loose mode and see the whole shell environment | M0 plan step 9 | M0 |
| CI runs on `ubuntu-latest` only, with actions pinned to commit SHAs, `permissions: contents: read`, and superseded runs cancelled, because the private repository's Actions minutes are metered | M0 plan step 9 | M0 |
| The Claude Code file protection goes slightly beyond ADR-0009's minimum. The hook blocks a tool call it can't read (it fails closed). Reads of `.env.*.local` files are denied as well as `.env` and `.env.local`. The protected patterns that have no exceptions also get `Edit` deny rules, which cover shell redirections too | ADR-0009 (implementation notes) | M0 |
| When an AI agent runs `next dev`, Next.js writes `AGENTS.md`, and a `CLAUDE.md` that imports it, into `apps/customer-web`; there's no setting to turn this off. Both are committed unchanged: they point agents at the docs for the installed Next.js version, and the web rules refer to them | M0 plan step 10 | M0 |
| Every local service publishes its port on `127.0.0.1` rather than all interfaces, so Valkey (which needs no password) and PostgreSQL aren't reachable from whatever network the laptop is on. Found by the M0 security review | M0 step 12 (security review) | M0 |

## Answered

| # | Answer | Date |
|---|---|---|
| Kickoff (c)1 to (c)11 | Adopted in spec v1.1, see ADR-0002 to ADR-0011 | 2026-09-11 |
| M0 decisions D1 to D10 | Approved as recommended in `docs/plans/M0-plan.md` | 2026-09-11 |
