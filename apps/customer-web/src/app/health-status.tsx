'use client';

import { useGetHealth } from '@voltdrop/api-client';
import { Button } from '@voltdrop/ui-web';
import { useTranslations } from 'next-intl';

/** Whether the API is up, checked from the browser. */
export function HealthStatus() {
  const t = useTranslations();
  const health = useGetHealth();
  let status = t('health.checking');
  if (health.isSuccess) {
    status = t('health.up');
  } else if (health.isError) {
    status = t('health.unreachable');
  }
  return (
    <>
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
    </>
  );
}
