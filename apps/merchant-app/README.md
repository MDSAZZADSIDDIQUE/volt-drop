# merchant-app

The VoltDrop merchant app for iOS and Android: Expo SDK 57, Expo Router, NativeWind 4.2 on Tailwind 3.4, `ui-native` components and TanStack Query through `@voltdrop/api-client` (spec §4). It comes before the customer app (ADR-0011); its screens and EAS build profiles arrive in M6. In M0 it shows whether the API is up.

## Run it

```bash
pnpm --filter @voltdrop/merchant-app dev
```

Metro starts on port 8082, so it can run beside customer-app on 8081. The app calls the API at `EXPO_PUBLIC_API_BASE_URL`, which defaults to `http://localhost:4000`. On an Android emulator, `localhost` is the emulator itself, so set it to `http://10.0.2.2:4000` (or your machine's LAN address) in this folder's `.env`.

"Building" in M0 means typecheck, lint and `expo export` for Android and iOS (`pnpm --filter @voltdrop/merchant-app build`, output in `dist/`).

## Things that look odd but are deliberate

The same as customer-app (see its README): `react-native-css-interop` is a direct dependency, React is exactly 19.2.3, Metro needs no monorepo settings, and `nativewind-env.d.ts` references Expo's types. Also:

- **`packages/ui-native/src` is in the Tailwind `content` list,** so NativeWind generates the shared components' classes.
- **The display name, "VoltDrop for merchants", is a placeholder.** Store names are settled with the EAS profiles in M6.
