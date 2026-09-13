# @voltdrop/api

A NestJS modular monolith on Fastify (spec §4, §5). It's deployed as two processes from one codebase: `api` (HTTP) and `worker` (background jobs, from M0 step 6).

## Layout

| Path | What lives there |
|---|---|
| `src/main.ts` | HTTP entrypoint |
| `src/instrumentation.ts` | OpenTelemetry preload; does nothing unless `OTEL_EXPORTER_OTLP_ENDPOINT` is set |
| `src/app/` | Application wiring: `createApp`, `ApiModule` |
| `src/config/` | Environment validation (spec §18): the process refuses to boot on invalid config |
| `src/core/` | Plumbing shared by every module: logging with redaction, request context, problem details, validation, OpenAPI. It never imports a business module |
| `src/modules/<name>/` | One folder per spec §5 module. A module may import another module only through its `index.ts` |

## Rules that apply everywhere

- Errors are RFC 9457 problem details with stable `urn:voltdrop:problem:<code>` types.
- Throw `ProblemException` from `src/core/problems` for an expected failure.
- Request bodies, queries and params are validated with zod: `@Body({ schema })`. The same schemas generate the OpenAPI 3.1 document.
- Every route declares `@Public()` or `@RequirePermissions(...)`. The app refuses to start otherwise.
- Nothing personal reaches the logs. Log objects and messages pass through `redact()`.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` (from the root) | Compiles, watches and restarts the API (and worker) |
| `pnpm --filter @voltdrop/api build` | Compiles to `dist/` |
| `pnpm --filter @voltdrop/api start` | Runs `dist/main.js` with OpenTelemetry preloaded |
| `pnpm --filter @voltdrop/api test` | Unit and in-memory API tests; no Docker needed |

With the API running locally, the API reference is at http://localhost:4000/docs and the OpenAPI document at http://localhost:4000/docs/openapi.json. Neither is served in production.
