# M0 plan: Foundations and Claude Code setup

| | |
|---|---|
| Status | **Draft, awaiting approval.** Nothing in this plan has been implemented. |
| Date | 2026-09-11 |
| Spec | `docs/spec/voltdrop-master-prompt.md` v1.0: §4, §5, §6, §9 (design direction), §14, §15, §18 |
| Goal | The skeleton every later milestone builds on: monorepo, local infrastructure, API and worker foundations, money utilities, CI, Claude Code setup, docs, and two design directions for you to choose from |

M0 ships no product features: no sign-in, catalogue, checkout or real screens. Those start in M1.

---

## 1. Acceptance criteria and how each is proven

| Criterion (spec §16) | Proof |
|---|---|
| A fresh clone runs with `pnpm install && pnpm infra:up && pnpm db:migrate && pnpm dev` | A CI `smoke` job runs exactly these commands on a clean runner. I also run them on this Windows machine for the demo. |
| CI is green | `.github/workflows/ci.yml` passes on the M0 pull request. |
| The money package has 100% branch coverage | A Vitest coverage threshold on the money and VAT sources in `packages/domain` fails CI below 100%. |
| `/v1/health` returns OK | API end-to-end test (supertest) plus the smoke job. |
| OpenAPI is served | End-to-end test: `/docs/openapi.json` validates as OpenAPI 3.1 when not in production, and returns 404 when `APP_ENV=production`. |

---

## 2. Decisions I need from you

| # | Decision | My recommendation | Why | Main alternative |
|---|---|---|---|---|
| D1 | Node.js version | **24.x now** (today's Active LTS, already installed). Add an ADR to move to 26 after it becomes Active LTS on 28 Oct 2026, before launch. | The spec says "current Active LTS". Node 24 enters maintenance on 20 Oct 2026 but gets security fixes until Apr 2028. | Start on 26 now (it stays "Current" until 28 Oct). |
| D2 | TypeScript version | **6.0.3** | TypeScript 7.0 (the native compiler) became npm `latest` in July, but typescript-eslint 8.70 only supports `<6.1`. | 7.0 without type-aware linting. |
| D3 | NestJS version | **NestJS 12.0.x** on Fastify 5 with ESM. zod v4 schemas validate through Nest's built-in Standard Schema pipe, and `@nestjs/swagger` 12 turns the same schemas into OpenAPI 3.1. A half-day spike (step 5a) proves this first. | No extra validation library, and no NestJS major upgrade in the middle of the build. | NestJS 11.1 + nestjs-zod 5.5. nestjs-zod doesn't support Nest 12 yet, and it's a new major dependency, so I'd ask first. |
| D4 | Drizzle version | **drizzle-orm 0.45.2 + drizzle-kit 0.31.10** (stable). Add an ADR to adopt 1.0 once it's final. | 1.0 has been a release candidate since June 2026. The upgrade path is `drizzle-kit up`. | Start on 1.0 RC. |
| D5 | pnpm version | **11.26.0**, pinned through `packageManager` | 12.0 only shipped on 26 Aug 2026. | 12.3.4 |
| D6 | Local S3 service | **SeaweedFS** (Apache-2.0) replaces MinIO, if it passes a presigned PUT and POST-policy smoke test. RustFS is the fallback. | MinIO stopped publishing community Docker images in Oct 2025. LocalStack now needs an account, and commercial use needs a paid plan (since Mar 2026). | Build and maintain our own MinIO image from source. |
| D7 | i18n library (§6 requires en-GB message catalogues; §4 names no library) | **`next-intl`** for customer-web, and **`use-intl`** (same library family, same ICU message format) for the portal, admin and both Expo apps | One message format and one API across five apps. | FormatJS `react-intl` everywhere. |
| D8 | React and styling versions | **React 19.2.x in every app.** Expo SDK 57 ships 19.2, and Expo breaks on duplicate React versions. Web apps use Tailwind 4.3. Native apps use NativeWind 4.2 on Tailwind 3.4. `packages/ui-tokens` generates both from one source. | NativeWind's Tailwind 4 version (v5) is still a preview. | NativeWind 5 preview, or Uniwind (a library swap, so ADR and approval). |
| D9 | Git workflow | First commit on `main` holds only the spec and this plan. Then a `m0-foundations` branch, one Conventional Commit per green step, and a pull request at the end. **I ask before every push.** | `main` has no commits yet, and CI needs a pushed branch. | Commit straight to `main`. |
| D10 | Spec fix M0 depends on | Let the `.env*` edit block exempt `.env.example`, and add the generated API client to the protected files. | M0 must create `.env.example` (§18), and Appendix A says never edit the generated client by hand. | None |

Anything else that doesn't touch architecture, money, compliance, security or retention, I'll decide, record in an ADR and add to `docs/open-questions.md`, as §0 says.

---

## 3. Before I start (your side)

1. **Start Docker Desktop.** The Docker daemon wasn't running when I checked. `pnpm infra:up` and the Testcontainers integration tests both need it.
2. **Install pnpm 11.26.0** for your user with `npm install -g pnpm@11.26.0`, or tell me to run it.
3. **Confirm I may push** to `origin` (`MDSAZZADSIDDIQUE/volt-drop`) when CI needs to run. The GitHub CLI isn't installed. It's only needed if you want me to open the pull request from here.
4. If pnpm or Metro hits Windows path-length errors, you may need to enable long paths in Windows. That's a system setting, so it's your call.

---

## 4. Implementation steps

Each step ends with lint, typecheck and tests green, then a Conventional Commit. If a spike fails, I stop and ask instead of improvising.

### Step 1: Repository and toolchain
- `.gitattributes` forcing LF line endings (this machine has `core.autocrlf=true`), `.editorconfig`, `.gitignore`, `.node-version`.
- Root `package.json` with `packageManager`, `engines` and scripts. `pnpm-workspace.yaml` covers `apps/*` and `packages/*`, turns on exact version saving, and allowlists only the packages that need install scripts (for example `@swc/core`, `esbuild`, `sharp`). Plus `turbo.json`.
- `packages/config`: tsconfig bases (Node ESM, React web, Next.js, React Native), an ESLint flat-config preset, Prettier config, and Tailwind presets (Tailwind 4 CSS for web, Tailwind 3 JS for NativeWind).
- `lefthook.yml`:
  - pre-commit runs Prettier on staged files and `turbo run typecheck --affected`;
  - commit-msg checks the Conventional Commit format with a tiny Node script (no extra dependency).
- dependency-cruiser base rules:
  - packages never import apps;
  - `packages/domain` imports no framework code.

### Step 2: `packages/domain` (written test-first)
- **money**: amounts are integer pence (`number`, guarded by `Number.isSafeInteger`) with `currency: 'GBP'`.
  - Operations: add, subtract, multiply by quantity, basis-point percentages, and largest-remainder allocation (for proportional refunds and commission reversals).
  - Intermediate products use BigInt. No floating-point arithmetic anywhere.
  - `formatGBP` uses integer and string maths.
  - Negative amounts (refunds, reversals) round symmetrically, so a refund mirrors its charge.
- **vat**: `splitGross(grossMinor, rateBp)` returns net and VAT per line. VAT = round-half-up(gross × rate ÷ (10,000 + rate)), and net = gross − VAT. ADR-0002 documents this rule with worked examples.
- **Tests**:
  - Exhaustive: every gross from 0 to 1,000,000 pence at 0%, 5% and 20%, checked against an exact BigInt rational oracle.
  - fast-check properties: net + VAT = gross; allocations sum to the total and differ by at most 1p; monotonicity.
  - 100% branch coverage enforced.
- **ids**: UUIDv7 generation and parsing (`uuid` v14), with branded ID types.
- **refs**: human references `VD-XXXXXX` and `RT-XXXXXX` from a cryptographic random source. They use the Crockford base32 alphabet (no I, L, O or U), which gives about a billion combinations. A database unique index plus retry guarantees uniqueness from M1.
- **state-machine**: `defineMachine({ transitions })` gives a typed `assertTransition(from, to)` that throws `IllegalTransitionError`, plus `can(from, to)`. A property test checks that random walks never leave the table.
- Shared zod schemas: money, UUIDv7, problem details.

### Step 3: Local infrastructure (`infra/docker`)
- `docker-compose.yml` services, each with a healthcheck and a named volume:
  - **postgres**: a small custom image (`postgis/postgis` 18 with PostGIS 3.6, plus `postgresql-18-pgvector` 0.8.1). This matches what RDS supports for PostgreSQL 18.
  - **valkey** 9.1 (ElastiCache supports 9.1).
  - **typesense** 30.2.
  - **s3** (D6), plus a one-shot job that creates `voltdrop-public` and `voltdrop-private` and sets CORS for the local web origins.
  - **mailpit**.
  - **metabase**, behind an optional `reporting` profile.
- Image tags pinned with digests.
- Scripts: `pnpm infra:up` (`docker compose … up -d --wait`), `pnpm infra:down`, `pnpm infra:reset` (drops volumes; local only), `pnpm infra:logs`.
- `infra/docker/README.md`, including Stripe CLI webhook forwarding (needed from M1).
- **Done when:** everything comes up healthy on this Windows machine (Docker Desktop) and on the Linux CI runner.

### Step 4: Configuration
- `apps/api/src/config/env.ts` holds a zod schema for every §18 variable, with conditional rules:
  - `DELIVERY_PROVIDER=uber_direct` requires the Uber Direct credentials;
  - `APP_ENV=production` rejects `mock`, `fake`, `log` and `fixture` providers and local default secrets.
- On invalid config the process exits non-zero and lists the bad keys, never their values.
- `.env.example` documents every variable. Defaults point at mock adapters, and local-only non-secret placeholders (for example the local Typesense key) are included, so a fresh clone needs no accounts.
- Each frontend gets its own small env schema (public URLs only).
- **Tests:**
  - `.env.example` passes validation unchanged;
  - each conditional rule rejects bad input;
  - error output never contains secret values.

### Step 5: API skeleton (`apps/api`, NestJS on Fastify)
- **5a. Spike (half a day, time-boxed).**
  - Prove that NestJS 12, Fastify and zod v4, going through `StandardSchemaValidationPipe` and `@nestjs/swagger`'s `standardSchemaConverter`, produce a valid OpenAPI 3.1 document that orval 8 turns into TanStack Query hooks.
  - Also check that NestJS decorators work under Vitest with SWC, and that OpenTelemetry loads under ESM.
  - ADR-0003 records the outcome. If the spike fails, I propose the D3 alternative and ask.
- **Entrypoints:** `src/main.ts` (HTTP, and later WebSockets) and `src/worker.ts` (Graphile Worker, no HTTP server). Both share one module graph.
- **Health endpoints:**
  - `GET /v1/health` (liveness: no dependency checks);
  - `GET /v1/ready` (readiness): returns 503 if Postgres is unreachable, migrations are missing or Valkey is unreachable. A Typesense outage is reported as degraded but still ready, because search has a Postgres fallback.
- **Errors:** a global filter returns RFC 9457 `application/problem+json` with stable `type` codes (proposed format `urn:voltdrop:problem:<code>`, so codes don't depend on a domain we don't have yet). Validation errors list the failing fields. No stack traces or internal details leave the API.
- **Logging:**
  - pino through Fastify, with a small Nest logger adapter (no extra dependency).
  - Correlation IDs: `X-Request-Id` is accepted when well-formed, otherwise generated. AsyncLocalStorage carries it into logs, outbox rows and jobs.
  - Redaction covers names, emails, phone numbers, addresses, tokens, auth headers, cookies and free-text fields. Tests capture real log output to prove it.
- **OpenTelemetry:** an `instrumentation.ts` preloaded with `node --import`. It exports only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set, and instruments HTTP, pg and ioredis.
- **API reference:** Swagger UI (bundled with `@nestjs/swagger`, supports OpenAPI 3.1) at `/docs`, with the document at `/docs/openapi.json`. Both are registered only when `APP_ENV` isn't `production`, and tests cover both cases.
- **Deny-by-default groundwork:**
  - every route must declare `@Public()` or `@RequirePermissions(...)`;
  - a global guard rejects undeclared routes;
  - a test enumerates every route and fails on a missing declaration.

  M2 adds real permission checks behind the same decorators. This lives in a skeleton `access` module. Health, readiness and docs are declared public.
- **Modules:** only `platform` and the `access` skeleton exist in M0. The other §5 modules arrive with their milestones.
- **Module boundary rule (dependency-cruiser):** code in `modules/<a>` may import only `modules/<b>/index.ts` (exported services, events and types), never another module's schema, repositories or internals.

### Step 6: Database, jobs and platform tables
- **Drizzle setup:**
  - Drizzle with node-postgres. Each module owns a `schema.ts`, and drizzle-kit collects them.
  - Migrations are SQL in `apps/api/drizzle/`, reviewed like code, and forward-only: a CI script fails if a migration that's already on `main` changes.
  - `pnpm db:migrate` runs the Drizzle migrations and then installs Graphile Worker's schema, so production can run migrations as a separate step.
- **Migrations:** `0000` enables `postgis` and `vector`. `0001` creates the platform tables in §5.
- **Policies:**
  - `PolicyService.get(key)` returns `{ value, version }`, validated against a zod schema registered in code.
  - The current version is the highest one whose `effective_from` has passed. Results are cached in-process for 5 seconds or less.
  - Policy rows are append-only, enforced by a database trigger that rejects UPDATE and DELETE.
  - Version 1 is seeded for the §3 policies whose shape is already fixed: stock reservation TTL, cart price lock, store acceptance timers, and the idempotency replay window. The rest arrive with their milestones.
- **Feature flags:** `FeatureFlagService.isEnabled(key, { zoneId, merchantId, segment })`. The most specific scope wins (segment, then merchant, then zone, then global), and code-registered defaults apply otherwise. ADR-0006 documents this.
- **Audit:** audit entries for policy and flag changes are `TODO(M2)`. The audit module lands in M2, and M0 has no endpoints that change policies or flags.
- **Outbox:**
  - `OutboxService.publish(tx, event)` writes the event row and, in the same transaction, enqueues an `outbox.dispatch` job through `graphile_worker.add_job` (a job key merges bursts).
  - The dispatcher claims rows with `FOR UPDATE SKIP LOCKED` and fans out one job per event and handler.
  - Each handler run records itself in `outbox_deliveries` within its own transaction, so redelivery does nothing.
  - A cron sweep every minute catches anything missed. Failures retry with backoff, and events that keep failing are marked failed and logged (the admin view arrives in M13).
  - ADR-0005 documents this.
- **Jobs:** `JobQueue.enqueue(tx, task, payload, options)` is the only way modules enqueue jobs, always inside the caller's transaction.
- **Idempotency:** an `@Idempotent()` route decorator plus an interceptor.
  - Missing key: 400 `idempotency-key-required`.
  - Same key with a different payload: 422 `idempotency-key-reused`.
  - Concurrent duplicate: 409 `idempotency-key-in-progress`.
  - Completed: the stored status, headers and body replay with `Idempotent-Replayed: true` for 24 hours (a policy value).
  - The handler's database work and the stored response commit in one transaction. A nightly job deletes expired keys.
  - Until M2 adds authentication, keys are scoped to an anonymous client. ADR-0004 documents the design.
  - M0 exercises it through a test-only controller that isn't registered outside tests.

### Step 7: OpenAPI and the generated client
- `pnpm api:generate`:
  - boots the API in document-only mode (no database or Valkey connections);
  - writes `packages/api-client/openapi.json` with stable key order;
  - runs orval to produce a fetch client and TanStack Query v5 hooks in `packages/api-client/src/generated/`.
- A small custom fetch wrapper handles the base URL and turns problem+json responses into a typed `ApiProblem` error.
- **Drift check in CI:** regenerate, then `git diff --exit-code packages/api-client`.
- **Protection for the generated folder:** it's ignored by ESLint, carries a "generated, do not edit" header, and the Claude hook in step 10 blocks edits.

### Step 8: App and UI package scaffolds (building, no product screens)
- **customer-web:** Next.js 16.3 App Router, Tailwind 4 and shadcn/ui. One placeholder page shows the API health through the generated client (server-side fetch).
- **merchant-portal and admin:** Vite 8, React 19.2, TanStack Router (file routes), TanStack Query, Tailwind 4, shadcn/ui and React Hook Form. One placeholder route shows the API health through the generated hook.
- **customer-app and merchant-app:** Expo SDK 57, Expo Router, NativeWind 4.2 and TanStack Query, with one placeholder screen.
  - "Building" in M0 means typecheck, lint and `expo export` for Android and iOS (the Metro bundle, no native compile). EAS profiles are M6.
  - I spike NativeWind on SDK 57 first, and stop and ask if it fails (see D8).
- **ui-tokens:** tokens are defined once in TypeScript. The build emits CSS variables and a Tailwind 4 `@theme` file for web, and a Tailwind 3 preset for NativeWind. Values stay neutral placeholders until you choose a design direction.
- **ui-web and ui-native:** package setup with one accessible Button each, using the tokens.
- **i18n (D7):** every placeholder string comes from an `en-GB` catalogue from day one.
- **Done when:**
  - `pnpm build` passes for every app and package;
  - `pnpm dev` starts the API, the worker, all three web apps, and both Metro servers (on ports 8081 and 8082).

### Step 9: CI (GitHub Actions)
- `ci.yml` runs on pull requests and pushes to `main`:
  1. install (frozen lockfile, with pnpm store and Turbo caching);
  2. lint;
  3. typecheck;
  4. unit tests with coverage thresholds;
  5. integration tests (Testcontainers on the Ubuntu runner, using the same Postgres image as compose);
  6. build;
  7. OpenAPI drift check;
  8. dependency-cruiser;
  9. migration immutability check;
  10. `pnpm audit --audit-level high`.
- A `smoke` job runs the acceptance commands literally, then checks `/v1/health`, `/v1/ready` and `/docs/openapi.json`.
- Actions are pinned to commit SHAs. The workflow gets `permissions: contents: read`, and superseded runs are cancelled.
- CodeQL or Semgrep, container scanning and an SBOM (all §12) wait for M14. On a private repository, CodeQL needs GitHub Advanced Security.

### Step 10: Claude Code setup (§15, checked against code.claude.com/docs on 2026-09-11)
- **`CLAUDE.md`** from Appendix A, under 200 lines, with the real commands.
- **`.claude/rules/`:** `api.md`, `money.md`, `database.md`, `web.md`, `mobile.md` and `tests.md`, each with `paths:` globs in frontmatter.
- **`.claude/skills/<name>/SKILL.md`:** `start-milestone`, `finish-milestone`, `new-module`, `adr`, `compliance-check` and `golden-scenarios`.
  - `finish-milestone` sets `disable-model-invocation: true`.
  - `golden-scenarios` stays a marked stub until M1 creates the suite: `TODO(M1)`.
- **`.claude/agents/`:**
  - `code-reviewer` and `security-reviewer` get `tools: Read, Grep, Glob`, which makes them genuinely read-only. The calling skill writes the diff to a file for them to read.
  - `test-triager` also gets Bash.
- **`.claude/settings.json`:**
  - A PreToolUse hook (matcher `Edit|Write|NotebookEdit`) runs `node .claude/hooks/protect-files.mjs`. It uses exec form so it works on Windows and Linux. It blocks `.env` and `.env.*` except `.env.example`, plus `*.pem`, `*.key`, Terraform state (`*.tfstate*`, `.terraform/**`) and `packages/api-client/src/generated/**`.
    - This has to be a hook: the docs say deny rules are evaluated first and can't carry exceptions, so a `.env*` deny rule would also block `.env.example`.
  - A PostToolUse hook (matcher `Edit|Write`) runs Prettier on the edited `.ts` or `.tsx` file.
  - `permissions.deny` gets `Read(.env)` and `Read(.env.local)`, so real secrets never enter the model's context. A Read deny also blocks edits to those paths.
- **`/doctor`:** you'll need to run it in an interactive `claude` terminal. It isn't available in this desktop session.

### Step 11: Docs skeleton and design directions
- **Progress and questions:** `docs/PROGRESS.md`, and `docs/open-questions.md` seeded from the kickoff review.
- **ADRs:**
  - `docs/adr/0000-template.md`;
  - ADR-0001: the stack and the pinned versions, including the D1–D8 outcomes;
  - ADR-0002: money and VAT rounding;
  - ADR-0003: API validation and OpenAPI;
  - ADR-0004: idempotency;
  - ADR-0005: outbox and jobs;
  - ADR-0006: feature-flag precedence;
  - ADR-0007: local S3 service;
  - ADR-0008: i18n;
  - ADR-0009: design-token pipeline.
- **Compliance register:** a `docs/compliance/register.md` skeleton listing every §11 rule, with "enforced in" and "proven by" columns pointing at the milestone that will fill them.
- **Module docs:** a `platform` module README and a module README template (used by the `new-module` skill).
- **`docs/design/directions.md`,** following the two-pass process in §9:
  - two directions, each with 4–6 named colours (hex), typefaces and their roles, a type scale, a layout concept with ASCII wireframes (live tracker, merchant orders board, product card), and principles;
  - a second pass that checks each direction against the defaults §9 rules out, and revises it;
  - colour pairs checked against WCAG 2.2 AA;
  - typefaces open-licensed and self-hosted (no third-party font CDN, which would reveal visitor IP addresses before consent).
  - Optionally, a private rendered page so you can compare both directions in colour.

### Step 12: Definition of Done and stop
- Run the §14 Definition of Done.
- The `code-reviewer` and `security-reviewer` subagents review the milestone diff. Findings are fixed, or recorded with reasons.
- Update `docs/PROGRESS.md`, then stop with demo steps, test results, deviations and open questions.

---

## 5. Schema changes

| Table | Purpose | Notes |
|---|---|---|
| Extensions `postgis`, `vector` | §4 | pgvector is enabled now for later use |
| `policy_versions` | Versioned policy values (§3) | Unique `(key, version)`. `value` is jsonb, validated in code. `effective_from`, `author_id`, `reason`. A trigger makes it append-only. |
| `feature_flags` | DB-backed flags (§6) | Unique `(key, scope_type, scope_id)`. Scope types: `global`, `zone`, `merchant`, `user_segment`. `version` column for optimistic locking. |
| `outbox` | Domain events | UUIDv7 id, aggregate type and id, event type and version, payload, correlation id, `occurred_at`, `dispatched_at`, attempts, last error |
| `outbox_deliveries` | Handler idempotency | Primary key `(event_id, handler)` |
| `idempotency_keys` | Replay protection (§6) | Unique `(scope, key)`. Stores method and route, request hash, status, stored response, `locked_until`, `expires_at`. |
| `graphile_worker.*` | Job queue | Installed by Graphile Worker's own migrations |

## 6. Endpoints

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/v1/health` | Public | Liveness |
| GET | `/v1/ready` | Public | Readiness; 503 when Postgres or Valkey is down |
| GET | `/docs` | Public, not in production | Swagger UI |
| GET | `/docs/openapi.json` | Public, not in production | OpenAPI 3.1 document |

No WebSocket namespaces yet: those arrive in M1 and M7.

## 7. Jobs

| Task | Trigger | Purpose |
|---|---|---|
| `outbox.dispatch` | Enqueued with each outbox write, plus a cron sweep every minute | Claim undispatched events and fan out to handlers |
| `outbox.handle` | One per event and handler | Run one handler, idempotently |
| `platform.idempotency_cleanup` | Nightly cron | Delete expired idempotency keys |

## 8. Screens

None beyond placeholders that show API health. The design directions are a document for you to choose from before any real UI is built (§9).

## 9. Tests

| Area | Layer | What it proves |
|---|---|---|
| Money and VAT | Unit, exhaustive and property-based | Correct rounding; net + VAT = gross; allocation; 100% branch coverage |
| IDs, references, state machine | Unit and property-based | Valid UUIDv7; reference format and alphabet; illegal transitions throw |
| Env validation | Unit | `.env.example` passes; conditional rules hold; no secrets in errors |
| Problem details and redaction | Unit and API end-to-end | RFC 9457 shape and stable codes; no internals; personal data redacted from logs |
| Health, readiness, docs | API end-to-end | `/v1/health` OK; readiness 503 when Postgres is stopped; docs served outside production only |
| Route declarations | API | Every route is `@Public()` or declares permissions |
| Outbox | Integration (Testcontainers) | Rollback emits nothing; exactly-once delivery with two concurrent dispatchers; retry after a handler failure |
| Idempotency | Integration | Replay, key reuse with a different payload, in-progress conflict, expiry |
| Policies and flags | Integration | Version resolution, including a future `effective_from`; scope precedence; append-only trigger |
| Migrations | Integration and CI | Extensions present; merged migrations unchanged |
| OpenAPI and client | CI | No drift between code, `openapi.json` and the generated client |
| Fresh clone | CI smoke job | The acceptance commands work end to end |

## 10. Risks

| Risk | Mitigation |
|---|---|
| NestJS 12 is two weeks old; the zod → OpenAPI 3.1 → orval path is unproven | Step 5a spike first; the D3 fallback is ready |
| Expo SDK 57 with NativeWind 4.2 and pnpm isolated installs on Windows | Spike before building further. Expo documents `nodeLinker: hoisted` as a fallback, but it loosens dependency isolation for the whole workspace, so I'd ask before switching. |
| Windows machine, Linux CI | LF line endings enforced, every script written in Node (no bash), Docker Desktop required |
| The replacement S3 service might not support presigned POST policies (needed in M4) | Smoke test in step 3; fallback per D6 |
| Graphile Worker cron time-zone handling around BST and GMT | Verify and document before the M9 settlement cron (Monday 03:00 Europe/London) |
| M0 is large (around 12 steps and 40 commits) | Every step is independently green. `docs/PROGRESS.md` records where I am, so a fresh session can resume. |

## 11. Deliberately not in M0

- Sign-in, roles and the audit log (M2; M0 adds only the route-declaration guard).
- Sentry (M1).
- Playwright and axe (M1).
- Real screens and token values (after you choose a direction).
- Europe/London time helpers (M1 and M3).
- WebSocket namespaces (M1 and M7).
- EAS (M6).
- Metabase dashboards (M13).
- Terraform, deploys, CodeQL or Semgrep, and an SBOM (M14).

## 12. Open questions for M0

1. Is the GitHub repository private? That affects CodeQL availability and Actions minutes.
2. Do you want Dependabot or Renovate to raise dependency update pull requests? The spec doesn't mention either. I recommend one, recorded as an ADR.
3. Where will Typesense and Metabase run in production? The spec doesn't say. It isn't needed until M4 and M13, but it shapes the M14 Terraform.

The spec-level questions from the kickoff review go into `docs/open-questions.md` in step 11.

## 13. Demo at the end of M0

```bash
pnpm install
pnpm infra:up
pnpm db:migrate
pnpm dev
```

Then:
- `http://localhost:4000/v1/health` returns `{"status":"ok"}`;
- `http://localhost:4000/docs` shows the API reference;
- the web apps on ports 3000, 5173 and 5174 show "API healthy";
- run `pnpm test` and `pnpm test:int` and open the coverage report;
- read `docs/design/directions.md` and choose a direction.

---

## 14. Version check (2026-09-11) and sources

Versions come from the npm registry unless a source is linked. Exact pins land in ADR-0001.

| Component | Current | Plan |
|---|---|---|
| Node.js | 24 Active LTS until 20 Oct 2026. 26 becomes LTS on 28 Oct 2026. From Node 27 there's one major release a year, and every release becomes LTS. | 24.x (D1) |
| pnpm, Turborepo | pnpm 12.3.4 (12.0 released 26 Aug), 11.26.0; Turborepo 2.10.12 | pnpm 11.26.0 (D5); Turborepo 2.10.12 |
| TypeScript | 7.0.2 is `latest`, 6.0.3; typescript-eslint 8.70 supports `<6.1` | 6.0.3 (D2) |
| NestJS | 12.0.1 (27 Aug): ESM core, Standard Schema validation, Node 20.19+; `@nestjs/swagger` 12 reflects Standard Schema into OpenAPI | 12.0.x (D3) |
| zod | 4.6.2 | 4.6.x |
| Drizzle | orm 0.45.2 and kit 0.31.10 stable; 1.0.0-rc.4 | Stable (D4) |
| Graphile Worker | 0.18.0 (8 Sep), Node ≥ 22.18 | 0.18.x, after reading its changelog |
| Next.js | 16.3.4 (Turbopack default, async params, Cache Components) | 16.3.x |
| Expo | SDK 57 (30 Jun; React Native 0.86, React 19.2, Reanimated 4.5). SDK 58 in preview. | SDK 57 (D8) |
| NativeWind, Tailwind | NativeWind 4.2.6 stable, 5.0 preview; Tailwind 4.3.3 and 3.4.19 | D8 |
| Vite, TanStack | Vite 8.3.0; Router 1.170.35; Query 5.102.8 | As listed |
| orval | 8.31.0 (Node ≥ 22.18) | 8.31.x |
| Vitest | 5.0.0 (released 3 Sep) and 4.1.11 | 4.1.x for now |
| ESLint, Prettier, lefthook, dependency-cruiser | 10.10.0; 3.9.6; 2.1.12; 18.2.0 | As listed |
| PostgreSQL on RDS | 18 supported, with pgvector 0.8.1 and PostGIS 3.6.3 | Local image to match |
| Valkey on ElastiCache | 9.0 and 9.1 supported | 9.1 |
| Typesense | v30.2 (19 Apr 2026). Synonyms and curations are now shared top-level sets. `group_max_candidates` gives accurate grouped counts. | 30.2 |
| Better Auth | 1.7.4, with Expo and SSO plugins. The NestJS integration is community-maintained, and its Fastify support is beta. | Verify in M2 |
| Stripe | API `2026-08-26.dahlia`; stripe-node 22.6.2. Accounts v2 is recommended for new Connect integrations. | Verify in M5 |
| Claude Code | Formats confirmed for rules `paths`, skill frontmatter, subagent frontmatter, hooks (exit code 2, exec form on Windows) and permission precedence | Step 10 |

Sources:
- [Node.js release schedule](https://raw.githubusercontent.com/nodejs/Release/main/schedule.json) and [the release-model change](https://nodejs.org/en/blog/announcements/evolving-the-nodejs-release-schedule)
- [NestJS 12 release notes](https://trilon.io/blog/nestjs-12-is-now-available), [`@nestjs/swagger` releases](https://github.com/nestjs/swagger/releases) and [NestJS validation docs](https://docs.nestjs.com/techniques/validation)
- [nestjs-zod](https://github.com/BenLorantfy/nestjs-zod)
- [Expo SDK 57](https://expo.dev/changelog/sdk-57) and [the Expo monorepo guide](https://docs.expo.dev/guides/monorepos/)
- [Next.js blog](https://nextjs.org/blog)
- [Better Auth NestJS integration](https://www.better-auth.com/docs/integrations/nestjs)
- [Typesense releases](https://github.com/typesense/typesense/releases)
- [Graphile Worker](https://worker.graphile.org/docs)
- [Stripe changelog](https://docs.stripe.com/changelog) and [Stripe Accounts v2](https://docs.stripe.com/connect/accounts-v2)
- [RDS for PostgreSQL 18](https://aws.amazon.com/about-aws/whats-new/2025/11/amazon-rds-postgresql-major-version-18) and [RDS PostgreSQL minor versions](https://aws.amazon.com/about-aws/whats-new/2026/05/amazon-rds-postgresql/)
- [ElastiCache Valkey 9.1](https://aws.amazon.com/about-aws/whats-new/2026/06/amazon-elasticache-valkey-9-1/)
- [MinIO images discontinued](https://github.com/lobehub/lobehub/issues/9845) and [LocalStack auth change](https://blog.localstack.cloud/the-road-ahead-for-localstack/)
- Claude Code docs: [memory and rules](https://code.claude.com/docs/en/memory), [skills](https://code.claude.com/docs/en/skills), [subagents](https://code.claude.com/docs/en/sub-agents), [hooks](https://code.claude.com/docs/en/hooks), [permissions](https://code.claude.com/docs/en/permissions)
