# ADR-0001: The stack and pinned versions for M0

- **Status:** Accepted
- **Date:** 2026-09-12
- **Deciders:** Founder (M0 plan decisions D1 to D10, approved 2026-09-11); Claude Code (the deviations below, under the §0 decision rule)
- **Spec sections:** §4 (stack), §6 (pin exact dependency versions), §16 (M0)

## Context

Spec §4 fixes the technology stack but leaves its versions open, apart from "the current Node.js Active LTS". The kickoff version check (M0 plan §14, 2026-09-11, with sources) chose a version for each layer, and decisions D1 to D10 in the M0 plan record the choices the founder approved. Spec §6 requires exact dependency versions. This ADR records what M0 actually pinned, the rules for changing versions, and where M0 differs from the plan.

## Decision

### Versions pinned in M0 (2026-09-12)

| Layer | Pinned |
|---|---|
| Runtime and tooling | Node.js 24.20.0 (`.node-version`; `engines` is `>=24.11.0 <25`), pnpm 11.26.0 (`packageManager`), Turborepo 2.10.12, TypeScript 6.0.3 |
| Code quality | ESLint 10.10.0 with typescript-eslint 8.70.0 and eslint-plugin-react-hooks 7.1.1, Prettier 3.9.6, lefthook 2.1.12, dependency-cruiser 18.2.0 |
| API | NestJS 12.0.1 on Fastify 5.12.1, `@nestjs/swagger` 12.0.1, zod 4.6.1, pino 10.3.1, OpenTelemetry Node SDK 0.222.0 |
| Data and jobs | drizzle-orm 0.45.2 and drizzle-kit 0.31.10 on pg 8.23.0, Graphile Worker 0.18.0, ioredis 6.0.0 |
| Shared domain | zod 4.6.1, uuid 14.0.2 (UUIDv7) |
| API client | orval 8.31.0, generating TanStack Query 5.102.8 hooks |
| Customer web | Next.js 16.3.4, next-intl 4.14.3, Tailwind CSS 4.3.3 |
| Internal web | Vite 8.3.0 with `@vitejs/plugin-react` 6.1.1, TanStack Router 1.170.34 and Query 5.102.8, use-intl 4.14.3, Tailwind CSS 4.3.3 |
| Shared web UI | `@radix-ui/react-slot` 1.3.3, class-variance-authority 0.7.1, clsx 2.1.1, tailwind-merge 3.6.0 |
| Mobile | Expo SDK 57 (expo 57.0.21, expo-router 57.0.20), React Native 0.86.3, NativeWind 4.2.6 with react-native-css-interop 0.2.6 on Tailwind CSS 3.4.19, Reanimated 4.5.1, use-intl 4.14.3 |
| React | 19.2.3 in every package: the exact version Expo SDK 57 pins |
| Tests | Vitest 4.1.11 with `@vitest/coverage-v8`, fast-check 4.9.0, Testcontainers 12.1.0, supertest 7.2.2, `@swc/core` 1.16.2 with unplugin-swc 1.6.0, Testing Library (React 16.3.3, user-event 14.6.7) on jsdom 30.0.1 |
| Local services (Docker Compose, each image pinned by tag and digest) | PostgreSQL 18 with PostGIS 3.6 (`postgis/postgis:18-3.6`) and pgvector 0.8.6, Valkey 9.1, Typesense 30.2, SeaweedFS 4.46, Mailpit 1.31.1, and Metabase 0.63.17 (optional) |
| Repository scripts | AWS SDK for JavaScript 3.1129.0 (the S3 smoke test) |
| CI | GitHub Actions: actions/checkout 7.0.1, pnpm/action-setup 6.1.0 and actions/setup-node 7.0.0, each pinned to a commit SHA |

`pnpm-lock.yaml` pins every transitive dependency.

### Rules for versions

- **Exact versions only** (`saveExact: true` in `pnpm-workspace.yaml`), never ranges.
- **Only versions at least a day old.** pnpm 11's minimum release age refuses anything newer, which protects us from a compromised release on the day it's published. When the newest version is younger than that, the one before it is pinned and listed in docs/PROGRESS.md until it can be bumped.
- **One React.** Every package uses the React version Expo pins, because two copies break React Native at runtime.
- **Install scripts are refused unless reviewed.** `allowBuilds` in `pnpm-workspace.yaml` records each decision with its reason. Allowed: lefthook, `@swc/core` and esbuild, which only install or check their own binaries. Denied: `@scarf/scarf` (install analytics), protobufjs, cpu-features, ssh2 and `@parcel/watcher`, none of which the stack needs (the watcher's binary ships prebuilt).

### Deviations from the plan, decided under the §0 rule

- **pgvector 0.8.6 locally, where RDS has 0.8.1** (and PostGIS 3.6.4 against RDS's 3.6.3). PostgreSQL's apt repository publishes no 0.8.1 package for PostgreSQL 18, and compiling it would add LLVM and several minutes to every CI run. Both are patch-level differences; re-check them before any vector feature ships.
- **Some packages are one release behind the newest**, because of the release-age rule: zod 4.6.1 (4.6.2 was published the evening before M0 began), expo 57.0.21, expo-router 57.0.20, expo-linking 57.0.9, expo-constants 57.0.17, use-intl and next-intl 4.14.3, and TanStack Router 1.170.34. Vite was held at 8.2.2 the same way until 8.3.0 qualified.
- **Two extra environment variables,** `API_PORT` and `LOG_LEVEL`, validated with the rest of spec §18.
- **SeaweedFS instead of MinIO** for local S3 (ADR-0010, D6).
- **No `eslint-plugin-jsx-a11y` yet.** Its newest release (6.10.2) doesn't support ESLint 10, so components are tested for roles, names, keyboard use and focus instead. Re-check before M1.

## Consequences

- Upgrades are deliberate: one commit per bump, with the lockfile, after the release-age wait. Whether Dependabot or Renovate proposes them is open question P7.
- `TODO(M14)`: move to Node.js 26 once it becomes Active LTS on 28 October 2026, before launch (D1).
- Adopting any of these needs its own ADR: Drizzle 1.0 once it's final (D4), TypeScript 7 once typescript-eslint supports it (D2), NativeWind 5 (D8), pnpm 12 (D5).
- Packages that M0 doesn't use yet (Better Auth, the Stripe SDK, EAS) get their versions in the milestone that adds them, under the same rules.

## Alternatives considered

- **Version ranges (`^`) with a lockfile.** Spec §6 rules them out, and a range still drifts whenever the lockfile is refreshed.
- **Always the newest release, with no waiting period.** A compromised release would reach us the day it's published.
- **The reserve options in the M0 plan:** Node 26, TypeScript 7, NestJS 11 with nestjs-zod, Drizzle 1.0 RC, pnpm 12, RustFS, FormatJS, and NativeWind 5 or Uniwind. Each stays in reserve for the case its decision names.
