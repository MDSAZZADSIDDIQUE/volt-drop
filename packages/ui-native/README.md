# @voltdrop/ui-native

React Native components for the two Expo apps, styled with NativeWind and the `ui-tokens` preset (spec §9, ADR-0018). In M0 it holds one accessible `Button`.

## Things that look odd but are deliberate

- **It ships TypeScript source, not a build.** NativeWind turns `className` into styles in each app's Babel pass (`jsxImportSource: 'nativewind'`). Pre-compiled JSX would skip that pass and lose every style.
- **Apps must list `packages/ui-native/src` in their Tailwind `content`,** or NativeWind never generates these classes.
- **Its dev dependencies mirror the apps' NativeWind set** (`react-native-css-interop`, Reanimated, Worklets, safe-area-context, Tailwind 3). Babel adds `react-native-css-interop/jsx-runtime` imports to these files, and pnpm resolves them from this package; the same versions and peers keep it to the one copy the apps use.
- **No runtime test yet.** Rendering React Native components needs a Jest setup (`jest-expo` and `@testing-library/react-native`). `TODO(M6)`: add it with the first real native screens. Until then the Button is typechecked, linted and bundled in both apps' exports.
