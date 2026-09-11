import { configureApiClient } from '@voltdrop/api-client';

/**
 * Points the generated client at the API. Expo inlines EXPO_PUBLIC_ variables at build time, so
 * this must be a public URL, never a secret. On an Android emulator, localhost is the emulator
 * itself: set EXPO_PUBLIC_API_BASE_URL to http://10.0.2.2:4000 or your machine's LAN address.
 */
export function configureApi(): void {
  configureApiClient({ baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:4000' });
}
