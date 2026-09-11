# customer-app

The VoltDrop customer app for iOS and Android: Expo SDK 57, Expo Router, NativeWind 4.2 on Tailwind 3.4, and TanStack Query through `@voltdrop/api-client` (spec §4). Product screens arrive in M7; in M0 it shows whether the API is up.

## Run it

```bash
pnpm --filter @voltdrop/customer-app dev
```

Metro starts on port 8081. The app calls the API at `EXPO_PUBLIC_API_BASE_URL`, which defaults to `http://localhost:4000`. On an Android emulator, `localhost` is the emulator itself, so set it to `http://10.0.2.2:4000` (or your machine's LAN address) in this folder's `.env`.

"Building" in M0 means typecheck, lint and `expo export` for Android and iOS (`pnpm --filter @voltdrop/customer-app build`, output in `dist/`). Store builds and EAS profiles come later (ADR-0011).

## Things that look odd but are deliberate

- **`react-native-css-interop` is a direct dependency.** NativeWind's Babel plugin makes this app's own files import `react-native-css-interop/jsx-runtime`. pnpm's isolated installs only expose direct dependencies, so without it Metro can't resolve that import. It's pinned to the exact version NativeWind uses, so both resolve to one copy.
- **React is 19.2.3 and React Native 0.86.3**, the exact versions Expo SDK 57 expects. Every package in the monorepo uses the same React, because two copies in one app break at runtime.
- **No Metro monorepo settings.** `expo/metro-config` handles the workspace itself.
- **`nativewind-env.d.ts` references Expo's types too**, because Expo's own `expo-env.d.ts` is generated on start and ignored by git.
