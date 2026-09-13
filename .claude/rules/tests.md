---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "**/*.test.mjs"
  - "**/test/**"
  - "**/vitest*.config.ts"
  - "fixtures/**"
---

# Test rules

Spec §14 (test layers, golden scenarios, Definition of Done) and the honesty rules in §0.

## Layers

- Unit tests (Vitest) sit next to the code as `*.test.ts`. Integration tests are `*.int.test.ts` and run with `pnpm test:int` against real PostgreSQL and Valkey in Testcontainers, so Docker must be running.
- API integration tests use `apps/api/test/integration/harness.ts`: `createTestDatabase()` gives each test file its own database, copied from a migrated template; `startApi()` boots the app against it; `FakeClock` controls time.
- API end-to-end tests use supertest, or Fastify's in-memory `app.inject`. The golden scenarios start in M1 (`pnpm golden`).

## No live network

- Never call a live external service. Adapters are tested against recorded fixtures in `fixtures/providers/` (spec §10), and each mock adapter (such as `MockCourierProvider`) passes the same contract suite as the real one. CI never calls live services.

## What to test

- Property tests with fast-check for the §7 invariants, and exhaustive tests where the input space allows (the VAT check covers 3 million amounts).
- Money and VAT keep 100% branch coverage; a coverage threshold fails the run below it.
- Every endpoint has allow and deny tests, and every state machine has tests for its illegal transitions.
- A test for a bug fails before the fix and passes after it.

## Deterministic tests

- Control time with the injected `CLOCK` (`FakeClock`), never real waits. For asynchronous effects, poll with `vi.waitFor` rather than sleeping for a fixed time.
- Tests pass in any order and alongside other test files. fast-check prints its seed when a property fails, so the failure can be replayed.
- Build test data with small factory functions that fill every required field with valid defaults, and override only the fields the test is about.

## Honesty

- Never weaken, skip or delete a test to make it pass. If a test is flaky, find the race and fix it; if it must be skipped for now, mark it `TODO(M<n>)` and list it in docs/PROGRESS.md.
- Report failures with their output. Never describe a skipped or mocked check as passing.
