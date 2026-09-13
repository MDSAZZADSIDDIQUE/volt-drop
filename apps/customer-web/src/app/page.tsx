import { getTranslations } from 'next-intl/server';
import { HealthStatus } from './health-status';

// M0 placeholder: proves the site builds, translates on the server and in the browser, styles
// with the design tokens and reaches the API.
export default async function HomePage() {
  const t = await getTranslations();
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-start justify-center gap-4 p-6">
      <h1 className="text-3xl font-bold">{t('common.appName')}</h1>
      <HealthStatus />
    </main>
  );
}
