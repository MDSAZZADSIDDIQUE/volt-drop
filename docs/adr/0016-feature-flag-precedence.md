# ADR-0016: Feature flags in the database, most specific scope wins

- **Status:** Accepted
- **Date:** 2026-09-11
- **Deciders:** Claude Code, under the approved M0 plan (step 6)
- **Spec sections:** §4 (feature flags stay DB-backed in Phase 1), §6 (flags scoped by zone, merchant or user segment), §8.8 (go live by zone flag)

## Context

Flags let operations turn capabilities on or off without deploying. Examples are pausing ordering in a zone when the delivery provider is down (spec §13), or letting a merchant go live. A flag can be set at several scopes at once, so precedence has to be explicit.

## Decision

1. **Storage.** Each row in `feature_flags` holds `(key, scope_type, scope_id, enabled)`.
   - `scope_type` is `global`, `zone`, `merchant` or `user_segment`.
   - Global rows use an empty `scope_id`, enforced by a check constraint, so the unique index on `(key, scope_type, scope_id)` works.
2. **Resolution.** `FeatureFlagService.isEnabled(key, { zoneId, merchantId, segments })` takes the most specific matching row. The order is `user_segment`, then `merchant`, then `zone`, then `global`. With no matching row, the default registered in code applies.
3. **Keys.** Every flag key is registered in code, with its default and a description. Unknown keys are a programming error.
4. **Changes.** Changes use optimistic locking on a `version` column. A stale write is refused as a conflict. `TODO(M2)`: every change writes an audit entry (invariant 8); `TODO(M13)`: the admin console edits flags.

## Consequences

- Operators can override a global setting for one zone or one merchant, and a segment can be treated differently inside a zone.
- There are no flag reads from PostHog in Phase 1 (spec §4).

## Alternatives considered

- **Most permissive wins** (any matching row that says enabled). It makes it impossible to switch a feature off for one merchant while it's on globally.
- **Flags in environment variables.** Changing one needs a deploy, and they can't be scoped by zone or merchant.
