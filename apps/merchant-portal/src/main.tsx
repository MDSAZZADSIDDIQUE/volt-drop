import './styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { configureApiClient } from '@voltdrop/api-client';
import { LOCALE, messages, TIME_ZONE } from '@voltdrop/i18n';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { IntlProvider } from 'use-intl';
import { router } from './router.js';

configureApiClient({ baseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000' });

const queryClient = new QueryClient();
const container = document.getElementById('root');
if (container === null) {
  throw new Error('index.html has no #root element.');
}

createRoot(container).render(
  <StrictMode>
    <IntlProvider locale={LOCALE} messages={messages} timeZone={TIME_ZONE}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </IntlProvider>
  </StrictMode>,
);
