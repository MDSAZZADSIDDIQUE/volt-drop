import '../global.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LOCALE, messages, TIME_ZONE } from '@voltdrop/i18n';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { IntlProvider } from 'use-intl';
import { configureApi } from '../src/api';

configureApi();

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <IntlProvider locale={LOCALE} messages={messages} timeZone={TIME_ZONE}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <Stack screenOptions={{ headerShown: false }} />
        </QueryClientProvider>
      </SafeAreaProvider>
    </IntlProvider>
  );
}
