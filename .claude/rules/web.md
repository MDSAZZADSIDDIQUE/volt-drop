---
paths:
  - "apps/customer-web/**"
  - "apps/merchant-portal/**"
  - "apps/admin/**"
  - "packages/ui-web/**"
---

# Web rules (customer-web, merchant-portal, admin, ui-web)

Spec §4 (Customer web, Internal web), §6 (Frontend), §9, §11.1, §11.3 and §11.8.

## Data

- Call the API only through `@voltdrop/api-client`: its generated TanStack Query hooks (such as `useGetHealth`) and fetch functions. Never hand-write `fetch` calls to the API or edit the generated code; change the API and run `pnpm api:generate`.
- Errors arrive as `ApiProblem` (problem+json). Show its message, and put its `fieldErrors` on the matching form fields.
- Never compute prices, fees or totals in the browser. Show the amounts the API returns, formatted with `formatMoney` from `@voltdrop/domain/money`.
- Public environment variables (`NEXT_PUBLIC_*`, `VITE_*`) end up in the bundle, so never put a secret in one.

## Forms

- React Hook Form with zod schemas, shared through `packages/domain` when the API validates the same input.
- Every field has a visible label, errors are announced to screen readers and say how to fix them, and every form works with the keyboard alone.

## Accessibility (WCAG 2.2 AA)

- Semantic HTML first: a `button` for actions, a link for navigation, headings in order, labelled landmarks.
- Visible focus on everything interactive (the `focus` token's ring). Colours come from the tokens, whose text pairings are contrast-tested. Respect `prefers-reduced-motion`.
- Shared components live in `packages/ui-web`, with tests for role, name, keyboard use and focus. Web end-to-end tests run axe in Playwright (from M1).

## Styling

- Tailwind with the token utilities from `@voltdrop/ui-tokens`: no raw hex values or one-off colours. Token values are placeholders until the founder chooses a design direction (docs/design/directions.md).
- Tailwind doesn't scan `node_modules`, so each app registers `packages/ui-web/src` with `@source`. Keep that when adding an app or a shared package.

## Copy

- Every user-facing string lives in the `@voltdrop/i18n` en-GB catalogue. Typed message keys catch mistakes at compile time.
- Plain English, sentence case, active voice. An action keeps its name through a flow: "Accept order" produces "Order accepted". Nobody sees internal words such as "fulfilment" or "webhook".
- Errors say what happened and how to fix it; empty screens say what to do next.

## customer-web (Next.js 16)

- Next.js 16 differs from older versions. Read the guide in `apps/customer-web/node_modules/next/dist/docs/` before using an API you're unsure of (see `apps/customer-web/AGENTS.md`).
- Server-render the indexable pages (categories, products, areas) with schema.org Product and Offer markup.
- No non-essential cookies or analytics before consent (§11.3); PostHog loads only after consent.
