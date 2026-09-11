import type { LOCALE, Messages } from '@voltdrop/i18n';

// Typed message keys: t('health.up') is checked against the en-GB catalogue (ADR-0017).
declare module 'use-intl' {
  interface AppConfig {
    Locale: typeof LOCALE;
    Messages: Messages;
  }
}
