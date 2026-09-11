import { useGetHealth } from '@voltdrop/api-client';
import { Button } from '@voltdrop/ui-native';
import { Text, View } from 'react-native';
import { useTranslations } from 'use-intl';

// M0 placeholder: proves the app builds, styles with the design tokens and reaches the API.
export default function Home() {
  const t = useTranslations();
  const health = useGetHealth();
  let status = t('health.checking');
  if (health.isSuccess) {
    status = t('health.up');
  } else if (health.isError) {
    status = t('health.unreachable');
  }
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background p-6">
      <Text className="text-2xl font-bold text-foreground">{t('common.appName')}</Text>
      <Text className="text-base text-muted-foreground">{status}</Text>
      <Button
        variant="secondary"
        onPress={() => {
          void health.refetch();
        }}
      >
        {t('health.checkAgain')}
      </Button>
    </View>
  );
}
