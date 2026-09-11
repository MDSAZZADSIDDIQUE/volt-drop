# access module

Owns roles, permissions, guards and resource scoping (spec §5, §12).

M0 lays the deny-by-default groundwork:

- `@Public()` marks a route anyone may call.
- `@RequirePermissions(...)` marks a route that needs permissions. Nobody can sign in until M2, so these routes answer 401 for now.
- `AccessGuard` runs on every route (a global `APP_GUARD`).
- `RouteDeclarationCheck` stops the app from starting if any route declares neither decorator.

| | |
|---|---|
| Public API (`index.ts`) | `Public`, `RequirePermissions`, `AccessModule` |
| Tables | None yet |
| Events | None yet |

Next, in M2: sign-in (Better Auth), the permission matrix in `docs/security/permissions.md`, resource scoping by organisation, merchant and store, and generated allow and deny tests for every endpoint.
