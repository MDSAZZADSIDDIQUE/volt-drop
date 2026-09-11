# platform module

Owns policy versions, feature flags, idempotency keys and the outbox (spec §5).

| | |
|---|---|
| Endpoints | `GET /v1/health` (public): liveness; checks no dependencies |
| Public API (`index.ts`) | `PlatformModule` |
| Tables | None yet |
| Events | None yet |

Next, in M0 step 6:
- `GET /v1/ready` (readiness);
- the `policy_versions`, `feature_flags`, `outbox` and `idempotency_keys` tables;
- typed policy and flag accessors;
- the idempotency interceptor;
- the outbox dispatcher.
