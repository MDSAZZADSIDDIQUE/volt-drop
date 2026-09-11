// Compile-time check, never imported: typecheck fails if message keys stop being typed. Without the
// AppConfig augmentation in intl.d.ts any string would be accepted, and the directive below would
// then be unused, which TypeScript reports as an error.
import { useTranslations } from 'use-intl';

export function useMessageKeysAreTyped(): void {
  const t = useTranslations();
  t('health.up');
  // @ts-expect-error: 'health.nope' isn't a key in the en-GB catalogue.
  t('health.nope');
}
