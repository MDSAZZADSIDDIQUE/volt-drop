---
paths:
  - "apps/api/src/modules/*/schema.ts"
  - "apps/api/drizzle/**"
  - "apps/api/drizzle.config.ts"
  - "apps/api/src/core/database/**"
  - "scripts/lib/migrations.mjs"
  - "scripts/check-migrations.mjs"
---

# Database rules (schemas and migrations)

Spec §4 (Database, ORM and migrations), §6 (State and consistency) and §7. PostgreSQL 18 with PostGIS and pgvector, through Drizzle ORM and drizzle-kit.

## Migrations

- Forward-only. Never edit or delete a migration once it has reached `main`: add a new one. CI's `pnpm check:migrations` fails otherwise.
- Change a module's `schema.ts`, run `pnpm db:generate`, and read the generated SQL before committing it.
- Hand-written SQL (triggers, functions, seed rows, data changes) goes in a migration of its own, created empty with `pnpm --filter @voltdrop/api exec drizzle-kit generate --custom --name=<what_it_does>`. Never add it to a generated one.
- Never edit `drizzle/meta`; drizzle-kit writes it. The Claude Code hook and deny rules block edits to it (ADR-0009), while new migration SQL stays editable.
- Apply with `pnpm db:migrate`, which also installs Graphile Worker's schema.
- A migration must work on tables that already hold data: add a column as nullable or with a default, backfill it, then tighten the constraint in a later migration.

## Tables

- A module declares its tables only in its own `schema.ts`, and no other module reads or writes them (spec §6).
- UUIDv7 primary keys generated in the application; `timestamptz` in UTC for every timestamp; money columns end in `_minor` (integer pence) and rates in `_bp`.
- Stateful aggregates have a `status` column and an append-only `<aggregate>_events` table. Enforce append-only tables with a trigger, as migration 0002 does for `policy_versions`.
- Records that people edit have a `version` column for optimistic locking.
- Put invariants in the database as well as the code: `not null`, `check` constraints, unique constraints (for example on a provider's event id) and foreign keys within the module.

## Locking and concurrency

- Never read-modify-write stock or money without a lock. Use a conditional update and check the row count (`update offers set stock_reserved = stock_reserved + $1 where id = $2 and stock_on_hand - stock_reserved >= $1`), or `select ... for update`.
- Work queues claim rows with `for update skip locked`.
- Keep transactions short, and never call an external service inside one: enqueue a job in the same transaction instead.

## Indexes

- Index every foreign key and every column a frequent query filters or sorts by. Use partial indexes for queues and open rows, like the index on `outbox` rows not yet dispatched.
- Check a new query's plan with `explain analyze` on realistic data before relying on an index.

## PostGIS

- Use SRID 4326 for stored points and zone polygons, with a GiST index on every spatial column.
- Write spatial queries in raw SQL through Drizzle's `sql` template (for example `ST_Covers` to test whether a zone contains an address, `ST_DWithin` for a radius), and test them against PostGIS in Testcontainers, never against mocks.
