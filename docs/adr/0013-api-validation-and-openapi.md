# ADR-0013: API validation and OpenAPI 3.1 from zod schemas on NestJS 12

- **Status:** Accepted
- **Date:** 2026-09-11
- **Deciders:** Claude Code, under decision D3 in the approved M0 plan (the step 5a spike)
- **Spec sections:** §4 (API framework, validation, API client), §6 (APIs), §16 M0

## Context

The spec requires three things together:

- zod at every boundary;
- REST under `/v1`, with OpenAPI 3.1 generated from code;
- a generated orval client, where CI fails on drift.

NestJS 12 (released 27 August 2026) validates Standard Schema values, which zod v4 implements, directly in route decorators. `@nestjs/swagger` 12 can convert those same schemas into the OpenAPI document through a `standardSchemaConverter`. nestjs-zod, the usual bridge, doesn't support NestJS 12 yet.

## Decision

1. **Validation.** Routes declare zod schemas on their parameters: `@Body({ schema })`, `@Query({ schema })`, `@Param('id', { schema })`.
   - A global `StandardSchemaValidationPipe` validates them and passes on the parsed value.
   - Failures become one 400 `urn:voltdrop:problem:validation-failed` problem, with an `errors` array of `{ path, message }`.
2. **Responses** are documented with `@ApiOkResponse({ standardSchema })` (and the other status decorators).
3. **OpenAPI.** `SwaggerModule.createDocument` uses `zodSchemaConverter` (`src/core/openapi`).
   - The converter calls zod's own `z.toJSONSchema` with `target: 'draft-2020-12'`, which is the JSON Schema dialect OpenAPI 3.1 uses. It passes `io: 'input'` for requests and `io: 'output'` for responses.
   - The document declares `openapi: 3.1.0`.
   - Schemas given an id with `.meta({ id })` become named components, and `$defs` references are rewritten to `#/components/schemas/`.
4. **API reference.** Swagger UI is served at `/docs` and the document at `/docs/openapi.json`, only when `APP_ENV` isn't `production`.
5. **Errors.** Every error is RFC 9457 `application/problem+json`.
   - `type` is a stable URN, `urn:voltdrop:problem:<code>`, so it doesn't depend on a domain name.
   - `instance` is the request's correlation id.
   - Unexpected errors are logged (redacted) and answered with a generic 500.
6. **Testing.** A small dev-only utility (`@readme/openapi-parser`, MIT) validates the served document against the OpenAPI 3.1 schema in the end-to-end tests.
7. **Operation ids.** Every route sets `@ApiOperation({ operationId })` in verb-noun form, for example `getHealth`. It names the generated client's function (`getHealth`) and hook (`useGetHealth`), which all five apps use, so Nest's default (`HealthController_health_v1`) would leak controller names into their code. The end-to-end tests fail if any operation keeps the default.
8. **The client** (M0 step 7) lives in `packages/api-client`.
   - `pnpm api:generate` builds the API, writes `openapi.json` without listening or connecting to anything, then runs orval.
   - orval generates fetch functions and TanStack Query v5 hooks into `src/generated/`. Every request goes through one hand-written transport, `apiFetch`, which throws a typed `ApiProblem` for any error response.
   - The output carries no timestamp, and regenerating an unchanged API gives identical files, so CI can fail on any difference.

## Spike outcome (2026-09-11)

The in-memory end-to-end tests pass. They cover:
- `/v1/health` returning the `Health` component;
- zod validation errors listed per field;
- malformed JSON and oversized bodies turned into problems;
- unexpected errors that hide internal details;
- a document that validates as OpenAPI 3.1 and isn't served in production.

The compiled server also starts and serves the same routes.

## Consequences

- No extra validation library. One schema drives validation, the document and, through orval, the typed client.
- NestJS 12 is pure ESM, so the API compiles to ES modules with `tsc`. Decorator metadata comes from `emitDecoratorMetadata` (tsc) and from SWC in tests.
- zod issue messages are passed to clients as they are. They describe the rule broken, never the submitted value.
- A change to a route's schema or operation id changes the client. Developers run `pnpm api:generate` and commit both `openapi.json` and `src/generated/`.

## Alternatives considered

- **NestJS 11 + nestjs-zod.** Proven, but it adds a dependency and a NestJS major upgrade in the middle of the build.
- **class-validator DTOs.** The spec requires zod at every boundary, and DTOs would duplicate the shared schemas in `packages/domain`.
- **`zod-openapi` for conversion.** Another dependency; zod v4's built-in converter already targets JSON Schema 2020-12.
- **An `operationIdFactory` that derives names from method names.** It saves one decorator per route, but two controllers with a `list` method would collide, and the names would change whenever a method is renamed.
