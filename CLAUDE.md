# VoltDrop

UK tech quick-commerce marketplace. Customers order tech essentials; VoltDrop routes each order
to a local store and a courier delivers in about 30–60 minutes.

Spec (source of truth): docs/spec/voltdrop-master-prompt.md. Read the relevant section before
changing a module. Do not @import it.
Status: docs/PROGRESS.md. Plans: docs/plans/. Decisions: docs/adr/. Open questions: docs/open-questions.md.
Compliance register: docs/compliance/register.md. Design directions: docs/design/directions.md.

## Workflow

- Work in milestones, in order (spec §16): plan → STOP for approval → small commits →
  Definition of Done (spec §14) → update PROGRESS → STOP with demo steps.
- Never start the next milestone without explicit approval.
- Use /start-milestone and /finish-milestone. Run the code-reviewer subagent before finishing.
- If an unclear detail doesn't touch architecture, money, compliance, security or retention:
  pick the simplest configurable option, write an ADR (/adr), list it in docs/open-questions.md,
  continue. Otherwise ask.
- Commit each green step with a Conventional Commit (lefthook checks it). Stage files by explicit path.
- Before the context fills up, write progress into docs/PROGRESS.md.

## Commands

- pnpm infra:up / pnpm infra:down: local services (Docker). pnpm infra:reset also deletes their data
- pnpm dev: all apps. pnpm dev:api: API and worker only
- pnpm db:generate, pnpm db:migrate
- pnpm api:generate: regenerate OpenAPI and the client
- pnpm lint, pnpm typecheck, pnpm test, pnpm test:int (needs Docker), pnpm build
- pnpm format, pnpm format:check, pnpm check:migrations
- Later milestones add pnpm db:seed, pnpm e2e, pnpm golden, pnpm eval and pnpm demo:order,
  demo:return, demo:settlement

## Repo map

- apps/api: NestJS modular monolith (http + worker); modules in src/modules, shared plumbing in src/core
- apps/customer-app, apps/merchant-app: Expo
- apps/customer-web: Next.js
- apps/merchant-portal, apps/admin: Vite + React
- packages/domain: money, VAT, policies, schemas, ids, state machines
- packages/api-client: generated. Never edit by hand
- packages/ui-tokens, ui-web, ui-native, i18n, config
- infra/docker: local services. scripts/: repository tooling. docs/: spec, ADRs, plans, compliance, design
- .claude/: path-scoped rules, skills, subagents, and the hooks and settings from ADR-0009

## Non-negotiables

- Money is integer pence via packages/domain/money. Never floats. The server computes all totals.
- Store UTC; evaluate business rules in Europe/London.
- Change state only through the aggregate's transition table, and append an event.
- Side effects go through the outbox; handlers are idempotent. Idempotency-Key on money and stock endpoints.
- Deny-by-default authorisation; every endpoint has allow and deny tests.
- A module never touches another module's tables.
- Policy values come from policy_versions, never constants.
- No personal data in logs, search, analytics, LLM prompts or Sentry.
- Price shown = price charged. No fee appears for the first time at checkout.
- Never report stubs as done. Never weaken tests to make them pass.
- Never edit .env files (except .env.example) or generated clients by hand.
- Pin exact dependency versions.

## External services

All sit behind interfaces with mock adapters (spec §10). Read the provider's current docs before
coding an adapter and cite them in the adapter README. CI never calls live services.
