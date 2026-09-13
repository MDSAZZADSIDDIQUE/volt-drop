# merchant-portal

The VoltDrop merchant portal for the web: Vite 8, React 19.2, TanStack Router and Query, Tailwind 4 with the `ui-tokens` theme, `ui-web` components and use-intl (spec §4). Product screens arrive in M3; in M0 it shows whether the API is up.

## Run it

```bash
pnpm --filter @voltdrop/merchant-portal dev
```

It serves on http://localhost:5174, the `MERCHANT_PORTAL_URL` the API expects. It calls the API at `VITE_API_BASE_URL` (default `http://localhost:4000`), set in this folder's `.env` if you need another.

## Things that look odd but are deliberate

- **`@source` in `src/styles.css`.** Tailwind 4 doesn't scan `node_modules`, where `@voltdrop/ui-web` is linked, so the shared components' class names are registered explicitly. Without it, their styles would silently be missing.
- **Code-based routes (`src/router.tsx`)** rather than file-based routing: two routes don't need a code generator. Revisit when the portal grows (M3).
- **`src/typed-messages.check.ts`** is never imported. It makes the typecheck fail if message keys stop being typed (ADR-0017).
