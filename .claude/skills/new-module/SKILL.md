---
name: new-module
description: Scaffolds a new API module in apps/api/src/modules with VoltDrop's conventions (owned tables, a public index.ts, a controller and service, allow and deny tests, and a README). Use when a milestone adds one of the modules listed in spec §5.
argument-hint: "[module-name]"
arguments: [name]
---

# New API module: $name

First read `.claude/rules/api.md`, `.claude/rules/database.md` and spec §5 to §7. The platform module (`apps/api/src/modules/platform`) is the reference implementation.

1. **Check the name.** It must be one of the modules listed in spec §5, in lowercase. A module that isn't listed is an architecture change: stop and ask.
2. **Create `apps/api/src/modules/$name/`** with only what the module needs now:
   - `$name.module.ts`: the Nest module. It imports other modules only through their `index.ts`.
   - `index.ts`: the public API (the module, exported services, event definitions and types). Nothing else crosses the boundary.
   - `schema.ts`, if the module has tables: UUIDv7 ids, `timestamptz` timestamps, `_minor` and `_bp` columns, `status` plus an `<aggregate>_events` table for stateful aggregates, and `version` on records people edit.
   - A service with the business rules, and a controller whose routes each declare `@Public()` or `@RequirePermissions(...)`, an `operationId`, and zod schemas for input and output.
   - Tests: `*.test.ts` for the rules; `*.int.test.ts` (with `test/integration/harness.ts`) for queries, locking and events; allow and deny tests for every route.
   - `README.md`, from [README.template.md](README.template.md).
3. **Wire it in:** add the module to `src/app/api.module.ts`, and to `src/app/worker.module.ts` if it has jobs or event handlers.
4. **Generate:** `pnpm db:generate` (read the SQL), `pnpm db:migrate`, then `pnpm api:generate` if it has routes.
5. **Check:** `pnpm lint` (including the module boundaries), `pnpm typecheck`, `pnpm test` and `pnpm test:int`.
6. **Commit** with a Conventional Commit, such as `feat($name): add the $name module`.
