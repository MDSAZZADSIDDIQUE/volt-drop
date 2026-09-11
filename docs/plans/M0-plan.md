# M0 plan: Foundations and Claude Code setup

| | |
|---|---|
| Status | **Approved by the founder on 2026-09-11.** Decisions D1 to D10 were accepted as recommended. Implementation is in progress on branch `m0-foundations`; see `docs/PROGRESS.md`. |
| Date | 2026-09-11 |
| Spec | `docs/spec/voltdrop-master-prompt.md` v1.1: §4, §5, §6, §9 (design direction), §14, §15, §18 |
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

## 2. Decisions (approved 2026-09-11)

| # | Decision | Outcome | Why | Alternative kept in reserve |
|---|---|---|---|---|
| D1 | Node.js version | **24.x now** (today's Active LTS). An ADR to move to 26 once it's Active LTS on 28 Oct 2026, before launch. | The spec says "current Active LTS". Node 24 gets security fixes until April 2028. | Node 26 |
| D2 | TypeScript version | **6.0.3** | TypeScript 7.0 (the native compiler) is npm `latest`, but typescript-eslint 8.70 supports only `<6.1`. | 7.0 once linting supports it |
| D3 | NestJS version | **NestJS 12.0.x** on Fastify 5 with ESM. zod v4 validates through Nest's Standard Schema pipe; `@nestjs/swagger` 12 generates OpenAPI 3.1 from the same schemas. A spike (step 5a) proves it first. | No extra validation library, and no major upgrade in the middle of the build. | NestJS 11.1 + nestjs-zod 5.5, after asking you |
| D4 | Drizzle version | **drizzle-orm 0.45.2 + drizzle-kit 0.31.10.** An ADR to adopt 1.0 once it's final. | 1.0 is still a release candidate. | 1.0 RC |
| D5 | pnpm version | **11.26.0**, pinned in `packageManager` (installed on this machine) | 12.0 only shipped on 26 Aug 2026. | 12.3.x |
| D6 | Local S3 service | **SeaweedFS** replaces MinIO, subject to the step 3 smoke test (ADR-0010) | MinIO no longer publishes images; LocalStack needs an account. | RustFS |
| D7 | i18n library | **`next-intl`** for customer-web; **`use-intl`** for the portal, admin and Expo apps | One ICU message format across five apps. | FormatJS |
| D8 | React and styling versions | **React 19.2.x everywhere.** Web apps use Tailwind 4.3; native apps use NativeWind 4.2 on Tailwind 3.4. Tokens are generated for both. | Expo SDK 57 constraint; NativeWind 5 is still a preview. | NativeWind 5 or Uniwind, after asking you |
| D9 | Git workflow | Spec and plan committed on `main`. M0 work on `m0-foundations`: one Conventional Commit per green step, and a pull request at the end. Pushing is approved. | `main` had no commits. | — |
| D10 | Spec fix M0 depends on | Adopted in spec v1.1 (ADR-0009): the `.env*` edit block exempts `.env.example`, and the generated client is protected. | M0 creates `.env.example`. | — |

Spec v1.1 also adopted every kickoff recommendation (ADR-0002 to ADR-0011). Two of them affect this plan:
- **ADR-0010:** SeaweedFS locally, Typesense Cloud and Metabase on ECS in production.
- **ADR-0011:** the merchant app milestone is now M6 and the customer app is M7.

---

## 3. Prerequisites

1. **Docker Desktop** must be running. `pnpm infra:up` and the Testcontainers integration tests need it. It wasn't running at kickoff.
2. **pnpm 11.26.0:** installed on 2026-09-11.
3. **Pushing to `origin`:** approved. The GitHub CLI isn't installed, so I push with git. Pull requests can be opened from the GitHub web page (or from here if you install `gh`).
4. If pnpm or Metro hits Windows path-length errors, enabling long paths in Windows (a system setting) is your call.

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
- `docs/PROGRESS.md`, updated after every step so a fresh session can resume.

### Step 2: `packages/domain` (written test-first)
- **money**: amounts are integer pence (`number`, guarded by `Number.isSafeInteger`) with `currency: 'GBP'`.
  - Operations: add, subtract, multiply by quantity, basis-point percentages, and largest-remainder allocation.
  - Intermediate products use BigInt. No floating-point arithmetic.
  - `formatGBP` uses integer and string maths.
  - Negative amounts round symmetrically, so a refund mirrors its charge.
- **vat**: `splitGross(grossMinor, rateBp)` returns net and VAT per line. VAT = round-half-up(gross × rate ÷ (10,000 + rate)), and net = gross − VAT. ADR-0012 documents this with worked examples.
- **Tests**:
  - Exhaustive: every gross from 0 to 1,000,000 pence at 0%, 5% and 20%, checked against an exact BigInt oracle.
  - fast-check properties.
  - 100% branch coverage enforced.
- **ids**: UUIDv7 generation and parsing (`uuid` v14), with branded ID types.
- **refs**: `VD-XXXXXX` and `RT-XXXXXX` from a cryptographic random source, using the Crockford base32 alphabet (no I, L, O or U). A database unique index plus retry guarantees uniqueness from M1.
- **state-machine**: `defineMachine({ transitions })` gives a typed `assertTransition` that throws `IllegalTransitionError`, plus `can`. Property tests cover it.
- Shared zod schemas: money, UUIDv7, problem details.

### Step 3: Local infrastructure (`infra/docker`)
- `docker-compose.yml` services, each with a healthcheck and a named volume:
  - **postgres**: a small custom image (PostgreSQL 18 with PostGIS 3.6 and pgvector 0.8.1), matching what RDS supports for PostgreSQL 18;
  - **valkey** 9.1;
  - **typesense** 30.2;
  - **seaweedfs**, with its S3 API on host port 9000 (ADR-0010), plus a one-shot job that creates `voltdrop-public` and `voltdrop-private` and sets CORS for the local web origins;
  - **mailpit**;
  - **metabase**, behind an optional `reporting` profile.
- Image tags pinned with digests.
- Scripts: `pnpm infra:up` (`docker compose … up -d --wait`), `pnpm infra:down`, `pnpm infra:reset` (drops volumes; local only), `pnpm infra:logs`.
- A smoke test proves the S3 features M4 needs: bucket creation, CORS, presigned PUT, and a presigned POST with a content-length-range policy. If SeaweedFS fails, I record a superseding ADR for RustFS.
- `infra/docker/README.md`, including Stripe CLI webhook forwarding (needed from M1).
- **Done when:** everything comes up healthy on this Windows machine and on the Linux CI runner.

### Step 4: Configuration
- `apps/api/src/config/env.ts` holds a zod schema for every §18 variable, with conditional rules:
  - `DELIVERY_PROVIDER=uber_direct` requires the Uber Direct credentials;
  - `APP_ENV=production` rejects mock, fake, log and fixture providers and local default secrets.
- On invalid config the process exits non-zero and lists the bad keys, never their values.
- With `APP_ENV=local`, local defaults apply, so a fresh clone boots without a `.env` file (§18).
- `.env.example` documents every variable.
- Each frontend gets its own small env schema (public URLs only).
- **Tests:**
  - `.env.example` passes validation;
  - each conditional rule rejects bad input;
  - error output never contains secret values.

### Step 5: API skeleton (`apps/api`, NestJS on Fastify)
- **5a. Spike (half a day, time-boxed).**
  - Prove that NestJS 12, Fastify and zod v4, going through `StandardSchemaValidationPipe` and `@nestjs/swagger`'s `standardSchemaConverter`, produce a valid OpenAPI 3.1 document that orval 8 turns into TanStack Query hooks.
  - Also check that NestJS decorators work under Vitest with SWC, and that OpenTelemetry loads under ESM.
  - ADR-0013 records the outcome. If the spike fails, I propose the D3 alternative and ask.
- **Entrypoints:** `src/main.ts` (HTTP, and later WebSockets) and `src/worker.ts` (Graphile Worker, no HTTP server).
- **Health endpoints:**
  - `GET /v1/health` (liveness);
  - `GET /v1/ready` (readiness): returns 503 if Postgres, the migrations or Valkey aren't ready. A Typesense outage is reported as degraded but still ready.
- **Errors:** RFC 9457 problem+json with stable `urn:voltdrop:problem:<code>` types. No internal details leave the API.
- **Logging:** pino through Fastify, with correlation IDs carried in AsyncLocalStorage. Personal-data redaction is proven by tests that capture log output.
- **OpenTelemetry:** preloaded with `node --import`, and exporting only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set.
- **API reference:** Swagger UI at `/docs` and the document at `/docs/openapi.json`, both outside production only.
- **Deny-by-default groundwork:**
  - every route must declare `@Public()` or `@RequirePermissions(...)`;
  - a global guard rejects undeclared routes;
  - a test enumerates every route.

  This lives in a skeleton `access` module, and M2 adds real permission checks.
- **Modules:** only `platform` and the `access` skeleton exist in M0.
- **Module boundary rule (dependency-cruiser):** code in `modules/<a>` may import only `modules/<b>/index.ts`.

### Step 6: Database, jobs and platform tables
- **Drizzle setup:**
  - Drizzle with node-postgres. Each module owns a `schema.ts`.
  - Migrations are SQL in `apps/api/drizzle/`, reviewed like code, and forward-only: a CI script fails if a migration that's already on `main` changes.
  - `pnpm db:migrate` applies the Drizzle migrations, then installs Graphile Worker's schema, with no build step needed.
- **Migrations:** `0000` enables `postgis` and `vector`. `0001` creates the platform tables (§5).
- **Policies:** `PolicyService.get(key)` returns `{ value, version }`, validated by zod.
  - The current version is the highest one whose `effective_from` has passed.
  - Results are cached in-process for 5 seconds or less.
  - A database trigger makes policy rows append-only.
  - Version 1 is seeded for the §3 policies whose shape is already fixed: stock reservation TTL, cart price lock, store acceptance timers, idempotency replay window, and the payment-confirmation hold from ADR-0004.
- **Feature flags:** `FeatureFlagService.isEnabled(key, context)`. The most specific scope wins: segment, then merchant, then zone, then global. ADR-0016 documents this.
- **Audit:** audit entries for policy and flag writes are `TODO(M2)`. M0 has no endpoints that change policies or flags.
- **Outbox:**
  - `OutboxService.publish(tx, event)` writes the event and enqueues `outbox.dispatch` through `graphile_worker.add_job` in the same transaction.
  - The dispatcher uses `FOR UPDATE SKIP LOCKED` and fans out one job per event and handler.
  - `outbox_deliveries` makes each handler idempotent.
  - A cron sweep every minute catches anything missed.
  - ADR-0015 documents this.
- **Jobs:** `JobQueue.enqueue(tx, task, payload, options)` is the only way modules enqueue jobs.
- **Idempotency:** an `@Idempotent()` decorator plus an interceptor.
  - Missing key: 400. Key reused with a different payload: 422. Concurrent duplicate: 409.
  - Completed requests replay their stored response for 24 hours (a policy value). The handler's database work and the stored response commit in one transaction.
  - ADR-0014 documents this.
  - M0 exercises it through a test-only controller.

### Step 7: OpenAPI and the generated client
- `pnpm api:generate`:
  - boots the API in document-only mode;
  - writes `packages/api-client/openapi.json`;
  - runs orval, producing a fetch client and TanStack Query v5 hooks in `packages/api-client/src/generated/`.
- A small fetch wrapper turns problem+json responses into a typed `ApiProblem` error.
- **Drift check in CI:** regenerate, then `git diff --exit-code packages/api-client`.
- **Protection for the generated folder:** it's ignored by ESLint, carries a "do not edit" header, and the step 10 hook blocks edits.

### Step 8: App and UI package scaffolds (building, no product screens)
- **customer-web:** Next.js 16.3 App Router, Tailwind 4 and shadcn/ui. A placeholder page shows the API health.
- **merchant-portal and admin:** Vite 8, React 19.2, TanStack Router and Query, Tailwind 4, shadcn/ui and React Hook Form. A placeholder route shows the API health.
- **customer-app and merchant-app:** Expo SDK 57, Expo Router, NativeWind 4.2 and TanStack Query.
  - "Building" in M0 means typecheck, lint and `expo export` for Android and iOS. The EAS profiles are M6 (ADR-0011).
  - I spike NativeWind on SDK 57 first.
- **ui-tokens:** tokens defined once in TypeScript. The build emits CSS variables and a Tailwind 4 `@theme` file for web, and a Tailwind 3 preset for NativeWind (ADR-0018). Values stay placeholders until you choose a design direction.
- **ui-web and ui-native:** one accessible Button each.
- **i18n (D7, ADR-0017):** every placeholder string comes from an `en-GB` catalogue.
- **Done when:**
  - `pnpm build` passes everywhere;
  - `pnpm dev` starts the API, the worker, all three web apps and both Metro servers (on ports 8081 and 8082).

### Step 9: CI (GitHub Actions)
- `ci.yml` runs:
  1. install;
  2. lint;
  3. typecheck;
  4. unit tests with coverage thresholds;
  5. integration tests (Testcontainers);
  6. build;
  7. OpenAPI drift check;
  8. dependency-cruiser;
  9. migration immutability check;
  10. `pnpm audit --audit-level high`.
- A `smoke` job runs the acceptance commands literally.
- Actions are pinned to commit SHAs, and the workflow gets `permissions: contents: read`.
- CodeQL or Semgrep, container scanning and an SBOM wait for M14.

### Step 10: Claude Code setup (§15, formats checked on 2026-09-11)
- **`CLAUDE.md`** from Appendix A, under 200 lines.
- **`.claude/rules/`:** the six path-scoped rule files, each with `paths:` frontmatter.
- **`.claude/skills/`:** the six skills. `finish-milestone` sets `disable-model-invocation: true`, and `golden-scenarios` stays a marked stub until M1.
- **`.claude/agents/`:**
  - `code-reviewer` and `security-reviewer` get `tools: Read, Grep, Glob` (genuinely read-only; they read the diff from a file);
  - `test-triager` also gets Bash.
- **`.claude/settings.json`** (ADR-0009):
  - a PreToolUse hook (`node .claude/hooks/protect-files.mjs`, exec form) blocks `.env` and `.env.*` except `.env.example`, `*.pem`, `*.key`, Terraform state and `packages/api-client/src/generated/**`;
  - a PostToolUse hook runs Prettier on edited `.ts` and `.tsx` files;
  - `permissions.deny` includes `Read(.env)` and `Read(.env.local)`.
- **`/doctor`:** you'll need to run it in an interactive `claude` terminal.

### Step 11: Docs skeleton and design directions
- **Progress and questions:** `docs/PROGRESS.md` (from step 1), and `docs/open-questions.md` (created at kickoff and kept current).
- **ADRs:** the template (created at kickoff), plus:
  - ADR-0001: the stack and pinned versions;
  - ADR-0012: money and VAT rounding;
  - ADR-0013: API validation and OpenAPI;
  - ADR-0014: idempotency;
  - ADR-0015: outbox and jobs;
  - ADR-0016: feature-flag precedence;
  - ADR-0017: i18n;
  - ADR-0018: design-token pipeline.
- **Compliance register:** a `docs/compliance/register.md` skeleton listing every §11 rule (including the v1.1 additions), with "enforced in" and "proven by" columns pointing at the milestone that will fill them.
- **Module docs:** a `platform` module README and a module README template.
- **`docs/design/directions.md`:** two directions, following the §9 two-pass process.
  - Each has named colours (hex), typefaces and their roles, a type scale, ASCII wireframes (live tracker, merchant orders board, product card) and principles.
  - The second pass checks each direction against the defaults §9 rules out.
  - Colour pairs are checked against WCAG 2.2 AA.
  - Typefaces are open-licensed and self-hosted.

### Step 12: Definition of Done and stop
- Run the §14 Definition of Done.
- The `code-reviewer` and `security-reviewer` subagents review the milestone diff.
- Update `docs/PROGRESS.md`, then stop with demo steps, test results, deviations and open questions.

---

## 5. Schema changes

| Table | Purpose | Notes |
|---|---|---|
| Extensions `postgis`, `vector` | §4 | pgvector is enabled now for later use |
| `policy_versions` | Versioned policy values (§3) | Unique `(key, version)`. `value` is jsonb, validated in code. `effective_from`, `author_id`, `reason`. A trigger makes it append-only. |
| `feature_flags` | DB-backed flags (§6) | Unique `(key, scope_type, scope_id)`. `version` column for optimistic locking. |
| `outbox` | Domain events | UUIDv7 id, aggregate, event type and version, payload, correlation id, timestamps, attempts, last error |
| `outbox_deliveries` | Handler idempotency | Primary key `(event_id, handler)` |
| `idempotency_keys` | Replay protection (§6) | Unique `(scope, key)`. Stores the request hash, status, stored response and expiry. |
| `graphile_worker.*` | Job queue | Installed by Graphile Worker's own migrations |

## 6. Endpoints

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/v1/health` | Public | Liveness |
| GET | `/v1/ready` | Public | Readiness; 503 when Postgres or Valkey is down |
| GET | `/docs` | Public, not in production | Swagger UI |
| GET | `/docs/openapi.json` | Public, not in production | OpenAPI 3.1 document |

## 7. Jobs

| Task | Trigger | Purpose |
|---|---|---|
| `outbox.dispatch` | Enqueued with each outbox write, plus a cron sweep every minute | Claim undispatched events and fan out to handlers |
| `outbox.handle` | One per event and handler | Run one handler, idempotently |
| `platform.idempotency_cleanup` | Nightly cron | Delete expired idempotency keys |

## 8. Screens

None beyond placeholders that show API health. The design directions are a document for you to choose from before any real UI is built.

## 9. Tests

| Area | Layer | What it proves |
|---|---|---|
| Money and VAT | Unit, exhaustive and property-based | Rounding; net + VAT = gross; allocation; 100% branch coverage |
| IDs, references, state machine | Unit and property-based | Formats; illegal transitions throw |
| Env validation | Unit | Defaults, conditional rules, no secrets in errors |
| Problem details and redaction | Unit and API end-to-end | RFC 9457 shape; no internals; personal data redacted |
| Health, readiness, docs | API end-to-end | `/v1/health` OK; readiness 503; docs only outside production |
| Route declarations | API | Every route is declared public or permissioned |
| Outbox | Integration | Rollback emits nothing; exactly-once with concurrent dispatchers; retries |
| Idempotency | Integration | Replay, key reuse, in-progress conflict, expiry |
| Policies and flags | Integration | Version resolution; scope precedence; append-only trigger |
| Migrations | Integration and CI | Extensions present; merged migrations unchanged |
| OpenAPI and client | CI | No drift |
| Local S3 | Smoke | Presigned PUT and POST, and CORS, on SeaweedFS |
| Claude hooks | Unit | Protected paths blocked; `.env.example` allowed |
| Fresh clone | CI smoke job | The acceptance commands work end to end |

## 10. Risks

| Risk | Mitigation |
|---|---|
| NestJS 12 is two weeks old | Step 5a spike, with the D3 fallback ready |
| Expo SDK 57 with NativeWind 4.2 and pnpm isolated installs on Windows | Spike first. `nodeLinker: hoisted` is Expo's documented fallback, but I'd ask before switching. |
| Windows machine, Linux CI | LF enforced, Node-only scripts, Docker Desktop required |
| SeaweedFS might not support S3 POST policies | Smoke test in step 3; RustFS fallback |
| Graphile Worker cron time-zone handling | Verify and document before the M9 settlement cron |
| M0 is large | Every step is independently green. `docs/PROGRESS.md` records where I am. |

## 11. Deliberately not in M0

- Sign-in, roles and the audit log (M2).
- Sentry (M1).
- Playwright and axe (M1).
- Real screens and token values (after you choose a direction).
- Time-zone helpers (M1 and M3).
- WebSocket namespaces (M1, M6 and M7).
- EAS (M6).
- Metabase dashboards (M13).
- Terraform, deploys, CodeQL or Semgrep, and an SBOM (M14).

## 12. Open questions for M0

These are tracked in `docs/open-questions.md`:
- P6: is the repository private?
- P7: Dependabot or Renovate?

Production hosting for Typesense and Metabase is settled by ADR-0010.

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
| pnpm, Turborepo | pnpm 12.3.4 and 11.26.0; Turborepo 2.10.12 | pnpm 11.26.0; Turborepo 2.10.12 |
| TypeScript | 7.0.2 `latest`, 6.0.3; typescript-eslint 8.70 supports `<6.1` | 6.0.3 |
| NestJS | 12.0.1 (27 Aug): ESM core, Standard Schema; `@nestjs/swagger` 12 `standardSchemaConverter` | 12.0.x |
| zod | 4.6.2 | 4.6.x |
| Drizzle | orm 0.45.2 and kit 0.31.10 stable; 1.0.0-rc.4 | Stable |
| Graphile Worker | 0.18.0 (8 Sep), Node ≥ 22.18 | 0.18.x |
| Next.js | 16.3.4 | 16.3.x |
| Expo | SDK 57 (React Native 0.86, React 19.2, Reanimated 4.5); SDK 58 in preview | SDK 57 |
| NativeWind, Tailwind | NativeWind 4.2.6 stable, 5.0 preview; Tailwind 4.3.3 and 3.4.19 | D8 |
| Vite, TanStack | Vite 8.3.0; Router 1.170.35; Query 5.102.8 | As listed |
| orval | 8.31.0 | 8.31.x |
| Vitest | 5.0.0 (3 Sep) and 4.1.11 | 4.1.x |
| ESLint, Prettier, lefthook, dependency-cruiser | 10.10.0; 3.9.6; 2.1.12; 18.2.0 | As listed |
| PostgreSQL on RDS | 18, with pgvector 0.8.1 and PostGIS 3.6.3 | Local image to match |
| Valkey on ElastiCache | 9.1 | 9.1 |
| Typesense | v30.2 (19 Apr 2026) | 30.2; Typesense Cloud in production (ADR-0010) |
| Better Auth | 1.7.4; the NestJS integration is community-maintained, with beta Fastify support | Verify in M2 |
| Stripe | API `2026-08-26.dahlia`; stripe-node 22.6.2; Accounts v2 recommended for new Connect integrations | Verify in M5 |
| Claude Code | Rules, skills, subagents, hooks and permission precedence confirmed | Step 10 |

Sources:
- [Node.js release schedule](https://raw.githubusercontent.com/nodejs/Release/main/schedule.json) and [the release-model change](https://nodejs.org/en/blog/announcements/evolving-the-nodejs-release-schedule)
- [NestJS 12](https://trilon.io/blog/nestjs-12-is-now-available), [`@nestjs/swagger` releases](https://github.com/nestjs/swagger/releases) and [NestJS validation](https://docs.nestjs.com/techniques/validation)
- [nestjs-zod](https://github.com/BenLorantfy/nestjs-zod)
- [Expo SDK 57](https://expo.dev/changelog/sdk-57) and [Expo monorepos](https://docs.expo.dev/guides/monorepos/)
- [Next.js blog](https://nextjs.org/blog)
- [Better Auth NestJS](https://www.better-auth.com/docs/integrations/nestjs)
- [Typesense releases](https://github.com/typesense/typesense/releases)
- [Graphile Worker](https://worker.graphile.org/docs)
- [Stripe changelog](https://docs.stripe.com/changelog) and [Accounts v2](https://docs.stripe.com/connect/accounts-v2)
- [RDS PostgreSQL 18](https://aws.amazon.com/about-aws/whats-new/2025/11/amazon-rds-postgresql-major-version-18) and [RDS minor versions](https://aws.amazon.com/about-aws/whats-new/2026/05/amazon-rds-postgresql/)
- [ElastiCache Valkey 9.1](https://aws.amazon.com/about-aws/whats-new/2026/06/amazon-elasticache-valkey-9-1/)
- [MinIO images discontinued](https://github.com/lobehub/lobehub/issues/9845) and [LocalStack changes](https://blog.localstack.cloud/the-road-ahead-for-localstack/)
- Claude Code docs: [memory and rules](https://code.claude.com/docs/en/memory), [skills](https://code.claude.com/docs/en/skills), [subagents](https://code.claude.com/docs/en/sub-agents), [hooks](https://code.claude.com/docs/en/hooks), [permissions](https://code.claude.com/docs/en/permissions)
