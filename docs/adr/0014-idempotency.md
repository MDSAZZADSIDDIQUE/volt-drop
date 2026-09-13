# ADR-0014: Idempotency keys for money and stock endpoints

- **Status:** Accepted
- **Date:** 2026-09-11
- **Deciders:** Claude Code, under the approved M0 plan (step 6)
- **Spec sections:** §6 (APIs: `Idempotency-Key` required on endpoints that create checkouts, orders, payments, refunds, returns, transfers or stock movements; responses replayed for 24 hours)

## Context

Clients retry when a network drops, and a retried "create payment" must not charge twice. The replay has to return exactly what the first request returned. Two copies of the same request arriving at once must not both run. Two different requests that happen to reuse a key must be told so, not silently served the wrong response.

## Decision

Routes that need it are marked `@Idempotent()`. For those routes:

1. **The key.** The `Idempotency-Key` header must be one value of 1–255 visible ASCII characters.
   - A missing, repeated or invalid key gets 400 `idempotency-key-required`.
   - Keys are scoped to the caller. `TODO(M2)`: until sign-in exists, every caller shares the `anonymous` scope.
2. **The fingerprint** is the SHA-256 of the method, the path with its query string, and the canonical JSON of the body (object keys sorted at every level). It detects a key reused for a different request. The path is used rather than the route template, so `/orders/A/refunds` and `/orders/B/refunds` never match.
3. **Phase 1, claim** (its own short transaction). Insert the key as `in_progress` with a 60-second lease and a random lock token. If the key already exists, lock its row and decide:
   - **Past the replay window:** treat it as a new request and take the key over.
   - **Different fingerprint:** 422 `idempotency-key-reused`.
   - **`completed`:** return the stored response again, with the header `Idempotent-Replayed: true`.
   - **`in_progress` with an active lease:** 409 `idempotency-key-in-progress`.
   - **`in_progress` with an expired lease** (the first attempt crashed): take the key over with a new lock token.
4. **Phase 2, run.** The handler runs inside one database transaction that the whole request shares: `Database.transaction` joins an open transaction held in AsyncLocalStorage. Before that transaction commits, the key is updated to `completed` with the response status and body, but only if the request still holds the lock token. If another attempt has taken the key over, the update fails and the handler's work rolls back. Either the work and the stored response both commit, or neither does.
5. **Failures.** When the handler fails, the key is released in a separate transaction (again only for the matching lock token), so the client can retry. Only successful responses are stored and replayed.
6. **Replay window and cleanup.** The window is 24 hours, read from the `platform.idempotency_replay_window_hours` policy. A nightly job (`platform.idempotency_cleanup`) deletes expired keys.
7. **Providers.** Calls to external providers use their own idempotency keys, derived from ours (for example Stripe's `Idempotency-Key`). A retry after a crash between the provider call and the commit therefore can't double-charge.

## Consequences

- A request that crashes mid-way leaves its key locked for up to 60 seconds. A client retrying inside that time gets 409 and retries later.
- A handler that runs for longer than the lease can lose its key to a retry. Its database work then rolls back, and the client sees a 500 for that attempt.
- Table: `idempotency_keys`, keyed on `(scope, key)`, with the fingerprint, status, lock token, lease, stored response and expiry. Stored responses are deleted within about a day of expiry.
- M0 proves the behaviour with a test-only route. Money and stock endpoints adopt it from M5.

## Alternatives considered

- **Claim the key inside the business transaction.** A concurrent duplicate would then block until the first finished, which for a slow provider call is a long wait, instead of getting a prompt 409.
- **Keys in Valkey.** Valkey is never the source of truth (spec §4). A cache eviction must never lead to a double charge.
- **Store and replay error responses too.** Failures are usually worth retrying, and storing them would lock clients into a transient error for 24 hours.
