# customer-web

The VoltDrop customer website: Next.js 16 (App Router), React 19.2, Tailwind 4 with the `ui-tokens` theme, `ui-web` components, next-intl and TanStack Query (spec §4). Product screens arrive in M1; in M0 it shows whether the API is up.

## Run it

```bash
pnpm --filter @voltdrop/customer-web dev
```

It serves on http://localhost:3000, the `CUSTOMER_WEB_URL` the API allows through CORS. It calls the API at `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:4000`), set in this folder's `.env.local` if you need another.

## Things that look odd but are deliberate

- **`typecheck` runs `next typegen` first.** Next.js generates `next-env.d.ts` and route types, which are ignored by git; without them TypeScript can't see CSS imports.
- **`@source` in `src/app/globals.css`.** Tailwind 4 doesn't scan `node_modules`, where `@voltdrop/ui-web` is linked, so the shared components' class names are registered explicitly.
- **No locale in the URL.** Phase 1 has one locale, so next-intl runs without i18n routing: `src/i18n/request.ts` gives every request en-GB in UK time (ADR-0017).
- **`src/typed-messages.check.ts`** is never imported. It makes the typecheck fail if message keys stop being typed.
