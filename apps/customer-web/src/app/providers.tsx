'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureApiClient } from '@voltdrop/api-client';
import { useState, type ReactNode } from 'react';

configureApiClient({ baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000' });

/** Client-side providers: one TanStack Query client per browser tab. */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
