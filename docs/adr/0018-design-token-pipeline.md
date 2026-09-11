# ADR-0018: Design tokens defined once, generated for web and native

- **Status:** Accepted
- **Date:** 2026-09-11
- **Deciders:** Claude Code, under the approved M0 plan (step 8)
- **Spec sections:** §4 (Tailwind on web, NativeWind on native), §9 (design system), §11 (accessibility)

## Context

Five apps share one visual language. The web apps use Tailwind 4, which is configured in CSS. The Expo apps use NativeWind 4.2, which needs Tailwind 3 and a JavaScript preset. Defining colours twice would let web and native drift, and the design direction isn't chosen yet (docs/design/directions.md), so every value will change once.

## Decision

1. **One source.** `packages/ui-tokens/src/tokens.ts` holds every colour, radius, font stack and focus-ring setting, named by role (`background`, `foreground`, `primary`, `link`, `focus`, `danger` and so on). Both design directions fill these roles.
2. **Generated outputs.** `build` compiles the tokens, then writes three files to `dist/`:
   - `tokens.css`: CSS custom properties with the values (`--vd-color-primary`);
   - `theme.css`: a Tailwind 4 `@theme inline` block mapping utilities to those variables (`bg-primary` reads `--vd-color-primary`);
   - `tailwind-preset.cjs`: a Tailwind 3 preset with the same names and literal values, for NativeWind.
   Web apps import both CSS files after Tailwind. Expo apps add the preset next to NativeWind's.
3. **Accessibility is tested, not asserted.** Unit tests compute WCAG 2.2 contrast for every text pairing (at least 4.5:1) and for borders, focus rings and primary actions against the background (at least 3:1). A token change that breaks a pairing fails the build.
4. **Placeholders until the choice.** The M0 values are neutral and accessible. When the founder chooses a direction, only `tokens.ts` changes, and its typefaces are self-hosted in this package.

## Consequences

- Web and native can't drift: both outputs come from the same object, and tests check that every token appears in each.
- Utility names are the design vocabulary: code says `bg-primary`, never a hex value or a palette step such as `bg-slate-800`.
- There is no dark theme in M0. The CSS variables make one a matter of a second value set.
- Fonts on native stay with the platform default until the chosen typefaces are bundled.

## Alternatives considered

- **Style Dictionary.** A capable tool, but a large dependency for three small outputs.
- **Tailwind 3 on web as well, sharing one JavaScript preset.** It would hold the web apps back from Tailwind 4, which the spec's stack uses.
- **CSS variables on native through NativeWind's `vars()`.** Useful for runtime theming later, but more moving parts than M0 needs.
