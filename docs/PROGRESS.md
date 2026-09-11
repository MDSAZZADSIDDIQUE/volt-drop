# Progress

Where the VoltDrop build stands. Updated after every step, so a fresh session can pick up cleanly (spec §0).

## Current milestone: M0, foundations and Claude Code setup (in progress)

- Plan: `docs/plans/M0-plan.md`, approved 2026-09-11.
- Spec: v1.1.
- Branch: `m0-foundations`.

| Step | Status | Notes |
|---|---|---|
| 1. Repository and toolchain | Done | pnpm 11.26.0 workspace, Turborepo, shared TS/ESLint/Prettier config, lefthook (format, affected typecheck, Conventional Commits), dependency-cruiser rules |
| 2. `packages/domain` | Done | Money, VAT, allocation, formatting, UUIDv7 ids, human references, state machines, shared schemas. 84 tests including an exhaustive VAT check over 3 million amounts; 100% statement, branch, function and line coverage (ADR-0012) |
| 3. Local infrastructure | Done | Docker Compose: PostgreSQL 18 with PostGIS 3.6.4 and pgvector 0.8.6, Valkey 9.1, Typesense 30.2, SeaweedFS 4.46 (S3), Mailpit, optional Metabase. Bucket and CORS setup. The S3 smoke test (presigned PUT, size-limited presigned POST, CORS) passes |
| 4. Configuration | In progress | |
| 5. API skeleton (5a spike first) | Not started | |
| 6. Database, jobs and platform tables | Not started | |
| 7. OpenAPI and the generated client | Not started | |
| 8. App and UI package scaffolds | Not started | |
| 9. CI | Not started | |
| 10. Claude Code setup | Not started | |
| 11. Docs skeleton and design directions | Not started | |
| 12. Definition of Done and stop | Not started | |

## Known gaps

Recorded as `TODO(M<n>)` in the code, and listed here.

- None yet.

## Deviations from the approved plan

- **pgvector locally is 0.8.6, not 0.8.1.** PostgreSQL's apt repository publishes no 0.8.1 package for PostgreSQL 18, and compiling it pulls in LLVM, which would add minutes to every CI run. PostGIS is 3.6.4 locally against 3.6.3 on RDS. Both are patch-level differences; re-check before vector features ship.
- **vite is pinned to 8.2.2, not 8.3.0.** 8.3.0 was under a day old, and pnpm 11 won't install packages younger than a day (its minimum release age).

## Environment notes

- The development machine runs Windows 11, with PowerShell and Git Bash. Git has `core.autocrlf=true`, so `.gitattributes` enforces LF line endings.
- pnpm 11.26.0 is installed for the user. Node is 24.20.0.
- Docker Desktop must be running for `pnpm infra:up` and the integration tests.
- `docs/Short - UK Technology Quick-Commerce Marketplace Requirements.pdf` is untracked. It isn't committed until the founder decides what to do with it.

## Next steps

1. Finish step 1: run `pnpm install`, `pnpm lint` and `pnpm typecheck` on the empty workspace, then commit.
2. Step 2: `packages/domain`, test-first.
