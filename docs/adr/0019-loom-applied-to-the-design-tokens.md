# ADR-0019: Loom applied to the design tokens

- **Status:** Accepted
- **Date:** 2026-09-13
- **Deciders:** Founder (chose Direction A, Loom, and a follow-up pull request after M0, on 2026-09-13); Claude Code (the details below, under the §0 decision rule)
- **Spec sections:** §9 (design direction), §11.8 (accessibility), §12 (no third-party requests before consent)

## Context

The founder chose Direction A, Loom (`docs/design/directions.md`). ADR-0018 built the token pipeline with placeholder values, expecting only the values to change and the chosen typefaces to be self-hosted in `packages/ui-tokens`. Loom names seven colours, one corner radius, three typefaces and a type scale. It doesn't cover every role the tokens have: it names no warning or danger colour, and its yellow is for a graphic, not for text.

## Decision

1. **Colours by role.**

   | Role | Loom colour | Value |
   |---|---|---|
   | `background` | Insulation White | `#F7F8F9` |
   | `surface` | White panels and cards | `#FFFFFF` |
   | `foreground` | Conduit Black | `#16181B` |
   | `muted-foreground`, `border` | Sheath Grey | `#5B6168` |
   | `primary`, with white `primary-foreground` | Live Brown | `#6B3F22` |
   | `link`, `focus` | Neutral Blue | `#1F5FA8` |
   | `success` | Earth Green | `#2E7D32` |
   | `success-stripe` (new) | Earth Yellow | `#F2C230` |
   | `warning`, `danger` | Not in Loom, so unchanged | `#8A5A00`, `#B42318` |

2. **Warning and danger keep their signal colours.** Loom's palette is electrical, but errors and warnings need conventional colours: Earth Yellow fails text contrast, and Live Brown already means "act". The existing values pass AA on Loom's background.
3. **`success-stripe` is graphics only:** the thin green-and-yellow earth stripe on delivered and verified states. It's never text or behind text, and a test keeps it out of the text pairings.
4. **One corner radius.** `sm`, `md` and `lg` are all 2 px, so existing `rounded-*` classes keep working.
5. **Self-hosted typefaces.** Pinned Fontsource packages under the SIL Open Font License 1.1: Atkinson Hyperlegible Next Variable for the interface (`font-sans`), Archivo Variable for headings (`font-heading`), and IBM Plex Mono at 400 and 600 for specs, codes and PINs (`font-mono`). Archivo loads with its width axis (62% to 125%), so headings are set narrow with `font-stretch-condensed` (75%). `@voltdrop/ui-tokens/fonts.css` imports all three, and each web app imports it. Nothing comes from a font CDN, which would reveal visitors' IP addresses before consent.
6. **The type scale is a token:** a 1.25 ratio on 16 px, as `sm` 13/18, `base` 16/24, `lg` 20/28, `xl` 25/32, `2xl` 31/40, `3xl` 39/48 and `4xl` 49/56 (size and line height in px). It replaces Tailwind's sizes of the same names. The web gets rem values, so text follows the browser's font-size setting; NativeWind gets px, because its rem is 14. This goes one step past ADR-0018's "only the values change": `emit.ts` gains the text-size output.
7. **The web Button's labels use 16 px** (`text-base`), Loom's body size, rather than the 13 px step meant for specs.

## Consequences

- Every app picks up Loom's colours, radii and text sizes; the web apps also get its typefaces.
- `TODO(M6)`: bundle the three typefaces in both Expo apps with `expo-font`, and add `fontFamily` to the NativeWind preset. Until then, native text uses the platform font.
- The 8 px grid is a usage rule, not a token: use even spacing steps (`p-2` is 8 px on the web). NativeWind's rem of 14 makes native steps smaller.
- The directions document labels product names 18/24, which isn't on the scale; screens use `text-lg` (20/28).
- The token tests check every text pairing's contrast. axe checks on real screens arrive with M1 (spec §11.8).

## Alternatives considered

- **Committing the font files.** No update path, and binary churn in the repository; the Fontsource packages are pinned like any other dependency.
- **`next/font` in customer-web.** Idiomatic for Next.js, but the two Vite apps would load fonts another way, so the three web apps would have two font set-ups.
- **Warning and danger from Loom's own colours.** Earth Yellow fails text contrast, and Live Brown already means "act".
