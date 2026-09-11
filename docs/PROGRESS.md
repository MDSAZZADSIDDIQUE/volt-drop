# Progress

Where the VoltDrop build stands. Updated after every step, so a fresh session can pick up cleanly (spec §0).

## Current milestone: M0, foundations and Claude Code setup (in progress)

- Plan: `docs/plans/M0-plan.md`, approved 2026-09-11.
- Spec: v1.1.
- Branch: `m0-foundations`.

| Step | Status | Notes |
|---|---|---|
| 1. Repository and toolchain | Done | pnpm 11.26.0 workspace, Turborepo, shared TS/ESLint/Prettier config, lefthook (format, affected typecheck, Conventional Commits), dependency-cruiser rules |
| 2. `packages/domain` | Done | Money, VAT, allocation, formatting, UUIDv7 ids, human references, state machines, shared schemas. 84 tests including an exhaustive VAT check over 3 million amounts; 100% statement, branch, function and line coverage (ADR-0012). Policy definitions added in step 6 |
| 3. Local infrastructure | Done | Docker Compose: PostgreSQL 18 with PostGIS 3.6.4 and pgvector 0.8.6, Valkey 9.1, Typesense 30.2, SeaweedFS 4.46 (S3), Mailpit, optional Metabase. Bucket and CORS setup. The S3 smoke test (presigned PUT, size-limited presigned POST, CORS) passes |
| 4. Configuration | Done | zod schema for every spec §18 variable plus `API_PORT` and `LOG_LEVEL`, with conditional provider rules and production guards. Local defaults mean a fresh clone needs no `.env`. Errors list keys, never values. `.env.example` documents everything |
| 5. API skeleton (5a spike first) | Done | NestJS 12 on Fastify (ESM). Zod validation through Standard Schema, and OpenAPI 3.1 from the same schemas (ADR-0013). RFC 9457 problem details. pino with redaction and correlation ids. OpenTelemetry preload. Swagger UI at `/docs` outside production. Deny-by-default route declarations. `/v1/health` |
| 6. Database, jobs and platform tables | Done | Migrations 0000–0002 (PostGIS and pgvector; the platform tables; the append-only trigger on `policy_versions` and the version 1 policy seeds); `pnpm db:migrate`; transactions that join an open one; `PolicyService`; `FeatureFlagService` (ADR-0016); `JobQueue` and the worker process on Graphile Worker; the transactional outbox with exactly-once handler deliveries (ADR-0015); `@Idempotent()` (ADR-0014); `GET /v1/ready`. 75 unit and end-to-end tests and 37 integration tests (Testcontainers) pass. Two intermittent test failures were traced to races in the tests, not the product, and fixed: the outbox retry test read a job before Graphile Worker (which records failures without awaiting them) had written its error; and the step 5 body-limit test could hit ECONNRESET before reading the 413, so that request is now sent in memory |
| 7. OpenAPI and the generated client | Done | `pnpm api:generate` builds the API, writes `packages/api-client/openapi.json` without listening or connecting to anything, then runs orval 8.31.0: fetch functions and TanStack Query v5 hooks in `src/generated/`, all going through one transport (`apiFetch`) that throws a typed `ApiProblem`. Every route sets an explicit operation id (`getHealth`, so the hook is `useGetHealth`), enforced by a test (ADR-0013). Regenerating an unchanged API gives identical files, so CI can fail on drift; adding that check to CI is step 9. 8 client tests pass |
| 8. App and UI package scaffolds | In progress | Spike passed: Expo SDK 57 with Expo Router, NativeWind 4.2 on Tailwind 3.4, TanStack Query and the generated client exports for Android and iOS under pnpm's isolated installs on Windows, with no hoisting. One fix was needed: `react-native-css-interop` is a direct dependency of the Expo apps, because NativeWind's Babel plugin imports it from the app's own files. React is 19.2.3 in every package, the exact version Expo SDK 57 pins, because two copies of React break React Native at runtime. customer-app is scaffolded; its placeholder strings move to the en-GB catalogue in this step's i18n work. `ui-tokens` generates CSS variables, a Tailwind 4 theme and a NativeWind preset from one token file (ADR-0018). Its values are placeholders until a design direction is chosen, and unit tests check every text pairing against WCAG 2.2 AA. vite is now 8.3.0 everywhere |
| 9. CI | Not started | |
| 10. Claude Code setup | Not started | |
| 11. Docs skeleton and design directions | Not started | |
| 12. Definition of Done and stop | Not started | |

## Known gaps

Recorded as `TODO(M<n>)` in the code or the ADRs, and listed here.

- `TODO(M2)`: sign-in and permission checks; every permissioned route answers 401 until then (`access.guard.ts`).
- `TODO(M2)`: audit entries for policy and flag changes (invariant 8).
- `TODO(M2)`: idempotency keys scoped to the signed-in caller; until then all callers share one scope.
- `TODO(M2)`: the API client sends the session or bearer token (`packages/api-client/src/fetcher.ts`).
- `TODO(M4)`: the ObjectStore adapter must send S3 checksums only when required (ADR-0010).
- `TODO(M5)`: late authorisation, the tip split and delivery-fee handling on partial fulfilment (ADR-0004).
- `TODO(M8)`: pass each trip's tip share to the delivery provider (ADR-0004).
- `TODO(M9)`: Europe/London schedules on Graphile Worker's UTC-only cron, tested at both clock changes (ADR-0015).
- `TODO(M13)`: admin screens for policies, flags, the outbox backlog and failed jobs; outbox retention once open question P8 is answered.

## Deviations from the approved plan

- **pgvector locally is 0.8.6, not 0.8.1.** PostgreSQL's apt repository publishes no 0.8.1 package for PostgreSQL 18, and compiling it pulls in LLVM, which would add minutes to every CI run. PostGIS is 3.6.4 locally against 3.6.3 on RDS. Both are patch-level differences; re-check before vector features ship.
- **Some packages are one release behind the newest.** pnpm 11 won't install a version less than a day old (its minimum release age), so where the newest was that young, the one before it is pinned. Currently: expo 57.0.21 (newest 57.0.22), expo-router 57.0.20 (57.0.21), expo-linking 57.0.9 (57.0.10) and expo-constants 57.0.17 (57.0.18). Bump them once they qualify. (vite was held at 8.2.2 the same way, and is now 8.3.0.)
- **Three migrations instead of two.** Generated SQL (0001, the tables) is kept apart from hand-written SQL (0002, the append-only trigger and the policy seeds), so a regenerated migration never mixes with custom code.
- **No `attempts` or `last_error` columns on `outbox`.** Each handler runs as its own Graphile Worker job, which already records its attempts and last error (ADR-0015).

## Environment notes

- The development machine runs Windows 11, with PowerShell and Git Bash. Git has `core.autocrlf=true`, so `.gitattributes` enforces LF line endings.
- pnpm 11.26.0 is installed for the user. Node is 24.20.0.
- Docker Desktop must be running for `pnpm infra:up` and the integration tests. The first integration run builds the Postgres image (a minute or two); later runs take about 45 seconds.
- The local Docker Compose stack was stopped from outside this session at 13:02 UTC on 2026-09-11 (a clean stop, not a crash). Integration tests don't need it; run `pnpm infra:up` before using the API locally.
- `docs/Short - UK Technology Quick-Commerce Marketplace Requirements.pdf` is untracked. It isn't committed until the founder decides what to do with it.

## Next steps

1. Finish step 8: the en-GB catalogue (ADR-0017), `ui-web` and `ui-native` buttons, merchant-portal and admin (Vite), customer-web (Next.js), merchant-app (Expo), then `pnpm dev` and `pnpm build` across everything.
2. Step 9: CI, including the OpenAPI drift check (`pnpm api:generate`, then `git diff --exit-code packages/api-client`).
