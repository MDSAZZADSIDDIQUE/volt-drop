---
paths:
  - "apps/api/**"
---

# API rules (apps/api)

Spec §4 to §6 and §12. The platform module (`src/modules/platform`) is the working example of everything below.

## Modules and boundaries

- One folder per module in `src/modules/<name>/` (spec §5 lists them). It owns its tables (`schema.ts`), services, controllers, events, jobs, tests and a short README.
- Other modules use it only through its `index.ts`: exported services, event definitions and types. Never import another module's `schema.ts`, repositories or internals. dependency-cruiser fails `pnpm lint` on a violation.
- `src/core` is shared plumbing (config, database, jobs, logging, problems, validation, OpenAPI, time) and never imports a module.
- For a new module, use the new-module skill. Register it in `src/app/api.module.ts`, and in `src/app/worker.module.ts` if it has jobs or event handlers.

## Layers

- Controllers do HTTP only: validate the input with zod schemas, call a service, return the result. No SQL and no business rules.
- Services hold the business rules. Write through `Database.transaction(...)`: it joins a transaction that's already open (the idempotency interceptor opens one), so all the writes commit together.
- Queries live in the module that owns the tables. Use Drizzle; write raw SQL through the parameterised `sql` template for locking, ledger and geo queries. Never build SQL by string concatenation.

## Validation and OpenAPI

- zod at every boundary. The same schemas generate OpenAPI 3.1 (ADR-0013). Schemas that apps also use belong in `packages/domain`.
- Every route sets an explicit verb-noun `operationId` (`getHealth`), which names the generated client's functions and hooks. A test enforces it.
- After changing a route or schema, run `pnpm api:generate` and commit the regenerated client. CI fails on drift.

## Errors

- Throw `ProblemException` with an entry from `PROBLEMS` (`src/core/problems/problem.ts`). Add a new entry with a stable `type` rather than an ad hoc error. Responses are RFC 9457 `application/problem+json`.
- Never put internals in a response: no stack traces, SQL, provider responses or personal data.

## Access

- Every route declares `@Public()` or `@RequirePermissions(...)`; the app refuses to start if one doesn't (deny by default). Use `@Public()` only when anyone at all may call the route.
- Every endpoint has allow and deny tests. Resource scoping by organisation, merchant and store arrives in M2.

## Consistency

- `@Idempotent()` on every route that creates checkouts, orders, payments, refunds, returns, transfers or stock movements (ADR-0014).
- Publish domain events with `OutboxService.publish(tx, ...)` inside the transaction that makes the change. Handlers must be idempotent, and payloads carry ids, not personal data (ADR-0015).
- Enqueue jobs with `JobQueue.enqueue(tx, ...)` in the same transaction as the change. Define tasks with `defineTask` and a zod payload.
- Stateful aggregates change only through their transition table, update `status`, and append to `<aggregate>_events`. Illegal transitions throw.
- Records that people edit use optimistic locking on a `version` column.

## Configuration, time and ids

- A new environment variable goes in the zod schema in `src/config/env.ts` and in `.env.example`, with a safe local default where possible. The app refuses to boot on invalid config.
- Business values (fees, timers, windows, limits) come from `PolicyService`, never constants. Feature flags come from `FeatureFlagService`.
- Store `timestamptz` in UTC and evaluate business rules in Europe/London (date-fns with `@date-fns/tz`, spec §4). Take the time from the injected `CLOCK`, never `new Date()`, so tests control it.
- Primary keys are UUIDv7, generated in the application with `packages/domain`.

## Logging and privacy

- Log through the injected pino logger (`LOGGER`) as structured fields; the correlation id is added for you. Never log names, emails, phone numbers, addresses, tokens or free text, and extend the redaction paths in `src/core/logging` when a new field could carry them.
