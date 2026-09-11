import { useGetHealth } from '@voltdrop/api-client';
import { Button } from '@voltdrop/ui-web';
import { useTranslations } from 'use-intl';

// M0 placeholder: proves the app builds, styles with the design tokens and reaches the API.
export function HomePage() {
  const t = useTranslations();
  const health = useGetHealth();
  let status = t('health.checking');
  if (health.isSuccess) {
    status = t('health.up');
  } else if (health.isError) {
    status = t('health.unreachable');
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-start justify-center gap-4 p-6">
      <h1 className="text-3xl font-bold">{t('common.appName')}</h1>
      <p className="text-muted-foreground" role="status">
        {status}
      </p>
      <Button
        variant="secondary"
        onClick={() => {
          void health.refetch();
        }}
      >
        {t('health.checkAgain')}
      </Button>
    </main>
  );
}
