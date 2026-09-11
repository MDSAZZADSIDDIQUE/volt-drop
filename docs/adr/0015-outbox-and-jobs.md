# ADR-0015: Transactional outbox and background jobs on Graphile Worker

- **Status:** Accepted
- **Date:** 2026-09-11
- **Deciders:** Claude Code, under the approved M0 plan (step 6)
- **Spec sections:** §4 (jobs and scheduling, events), §6 (state and consistency), §13

## Context

Side effects must not be lost if the process crashes, and must not happen for a change that was rolled back. This covers search indexing, notifications and store alerts. The spec asks for domain events written to an outbox in the same transaction as the change, a dispatcher, and idempotent handlers. Jobs must be enqueued in the same transaction as the state change.

## Decision

1. **Jobs.** Modules enqueue jobs only through `JobQueue.enqueue(tx, task, payload, options)`.
   - It takes the caller's transaction and calls `graphile_worker.add_job(...)` through it, so the job exists only if the change commits.
   - Tasks are defined with `defineTask(name, zodSchema)`. The payload is checked when the job is enqueued and again when it runs.
   - Options include the run time, maximum attempts, queue, priority, job key and job key mode.
   - The enqueuing request's correlation id travels in the payload's reserved `_meta` member, and the job runs with it.
2. **Outbox.** `OutboxService.publish(tx, event, input)` inserts an `outbox` row (UUIDv7 id, aggregate, event type and version, payload, correlation id), then enqueues `outbox.dispatch` with the job key `outbox.dispatch` in the same transaction. Bursts merge into one dispatch. Payloads carry identifiers, not personal data.
3. **Dispatch.** The dispatcher claims undispatched rows with `FOR UPDATE SKIP LOCKED`, in batches.
   - For each registered handler, it enqueues one `outbox.handle` job with the job key `outbox:<event>:<handler>`, then marks the row dispatched. All of that happens in one transaction.
   - A cron sweep runs the dispatcher every minute, to catch anything missed.
4. **Handlers.** Each handler run inserts `(event_id, handler)` into `outbox_deliveries` in the same transaction as the handler's own database work.
   - If the row already exists, the run does nothing, so database effects happen exactly once.
   - External effects (email, push, provider calls) must be idempotent in their own right, as the spec requires.
   - A failing handler rolls back, and Graphile retries it with exponential backoff.
   - Attempts and the last error live on the Graphile job, not on the outbox row.
   - A handler runs with the correlation id of the request that published the event.
   - A job for a handler this process doesn't know fails and is retried, because during a rolling deploy another worker may know it.
5. **Worker process.** `src/worker.ts` builds a NestJS application context and runs Graphile Worker with the tasks and cron items that modules register. Signals are handled by us, for graceful shutdown.
6. **Time zones.** Graphile Worker evaluates cron in UTC only. Schedules defined in Europe/London time, such as the settlement run on Mondays at 03:00 (§8.10), must use a UTC trigger, hourly or more often. The task then checks the London local time, with a job key per London date, so BST and GMT changes can't skip or double a run. `TODO(M9)`: implement this for settlements, with tests at both changeovers.

## Consequences

- There's no separate broker: Postgres is the queue. That's fine at Phase 1 volumes (spec §13). The outbox and jobs tables are watched through the admin console (M13).
- The plan's `outbox.attempts` and `outbox.last_error` columns aren't needed, because the per-handler Graphile jobs hold that state.
- The worker scales horizontally: each process claims different jobs.

## Alternatives considered

- **Handlers called directly by the dispatcher.** One failing handler would block or repeat the others.
- **LISTEN/NOTIFY without an outbox.** Events are lost if no listener is connected at commit time.
- **A separate message broker (SQS, Kafka).** It's new infrastructure (spec §0), and it can't join our database transaction.
