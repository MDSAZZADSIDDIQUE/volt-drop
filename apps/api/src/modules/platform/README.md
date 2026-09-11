# platform module

Owns health and readiness, policy versions, feature flags, idempotency keys and the transactional outbox (spec §5).

| | |
|---|---|
| Endpoints | `GET /v1/health` (public): liveness, checks no dependencies. `GET /v1/ready` (public): readiness, 503 when PostgreSQL, the migrations or Valkey is down; `degraded` when only Typesense is down |
| Public API (`index.ts`) | `PlatformModule`, `PolicyService`, `FeatureFlagService` and `defineFlag`, `OutboxService`, `OutboxHandlerRegistry` and `defineEvent`, `@Idempotent()` |
| Tables | `policy_versions` (append-only), `feature_flags`, `outbox`, `outbox_deliveries`, `idempotency_keys` |
| Jobs | `outbox.dispatch` (with each publish, plus a sweep every minute), `outbox.handle` (one per event and handler), `platform.idempotency_cleanup` (03:30 UTC nightly) |
| Events | None of its own. It delivers every module's events |

## How to use it

- **Policies.** Define the shape in `packages/domain/src/policies`, then read with `policies.current(Definition)`. Records that lock a version (a cart, an order) read it later with `policies.version(Definition, n)`. Values are never hard-coded (spec §3).
- **Flags.** `defineFlag('area.name', defaultEnabled, description)`, then `flags.isEnabled(flag, { zoneId, merchantId, segments })`. The most specific setting wins (ADR-0016).
- **Events.** `defineEvent('aggregate.past_tense', version, zodSchema)`, then `outbox.publish(tx, Event, { aggregateType, aggregateId, payload })` inside the transaction that makes the change. Subscribe with `OutboxHandlerRegistry.register(...)` in `onModuleInit`. Payloads carry ids, not personal data (ADR-0015).
- **Idempotency.** Put `@Idempotent()` on any route that creates checkouts, orders, payments, refunds, returns, transfers or stock movements (spec §6). Do the handler's writes inside `database.transaction(...)`: it joins the request's transaction, so the writes and the stored response commit together (ADR-0014).

## Still to come

- `TODO(M2)`: audit entries for policy and flag changes; idempotency keys scoped to the signed-in principal.
- `TODO(M13)`: admin screens for policies, flags, the outbox backlog and failed jobs.
