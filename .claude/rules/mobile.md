---
paths:
  - "apps/customer-app/**"
  - "apps/merchant-app/**"
  - "packages/ui-native/**"
---

# Mobile rules (customer-app, merchant-app, ui-native)

Spec §4 (Mobile), §6 (Frontend), §9 (Customer app, Merchant app), §11.8 and §12 (Authentication). The merchant app is built in M6 and the customer app in M7 (ADR-0011).

## Expo

- Expo SDK 57 with Expo Router (routes in `app/`), NativeWind 4 on Tailwind 3.4, and TanStack Query. Native projects are generated: `android/` and `ios/` are never committed, so change native settings through `app.json` and config plugins.
- Add native packages at the version Expo SDK 57 expects (check with `pnpm --filter <app> exec expo install --check`), pinned exactly.
- React stays at exactly the version Expo pins (19.2.3) in every package in the repository: two copies of React break React Native at runtime.
- `react-native-css-interop` is a direct dependency of each app, because NativeWind's Babel plugin imports it from the app's own files.
- `ui-native` ships as TypeScript source, and each app's `tailwind.config.js` lists it under `content`, so NativeWind generates its classes.

## Data and storage

- Call the API only through `@voltdrop/api-client`. Its address comes from `EXPO_PUBLIC_API_BASE_URL`; every `EXPO_PUBLIC_*` variable ends up in the app, so never put a secret in one.
- Tokens and other secrets go in the platform's secure storage (`expo-secure-store`, from M2), never AsyncStorage or plain files.

## Offline (merchant app)

- The store tablet must cope with flaky Wi-Fi: queue actions locally, replay them with the same `Idempotency-Key`, and always show the connection state.
- Show a queued action as queued until the server confirms it.

## Accessibility (WCAG 2.2 AA)

- Every control has an accessibility role, label and state. Touch targets are at least 44 points; the merchant app's orders board uses at least 56 px (§9).
- Support dynamic type and the screen readers (VoiceOver, TalkBack), and respect reduced motion.
- Merchant app alerts are both audible and visible, with a volume check.

## Copy

- Every string comes from the `@voltdrop/i18n` catalogue through use-intl, in plain English and sentence case.
- `TODO(M6)`: check `Intl.PluralRules` and `Intl.NumberFormat` on Hermes before using plurals or number formatting (ADR-0017).

## Tests

- `TODO(M6)`: component tests with jest-expo and React Native Testing Library, and Maestro end-to-end flows (spec §14).
