import { LOCALE, messages, TIME_ZONE } from '@voltdrop/i18n';
import { getRequestConfig } from 'next-intl/server';

// One locale in Phase 1 and no locale in the URL: every request gets en-GB in UK time (ADR-0017).
export default getRequestConfig(() => ({ locale: LOCALE, messages, timeZone: TIME_ZONE }));
