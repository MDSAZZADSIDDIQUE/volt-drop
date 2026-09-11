import './globals.css';
import { LOCALE } from '@voltdrop/i18n';
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { Providers } from './providers';

export const metadata: Metadata = { title: 'VoltDrop' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={LOCALE}>
      <body>
        {/* Passes the request's locale, time zone and messages to client components. */}
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
