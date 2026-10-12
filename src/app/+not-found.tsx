import { router, Stack } from 'expo-router';

import { Button, EmptyState, Screen } from '@/components/ui';
import { t } from '@/i18n';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <Screen>
        <EmptyState icon="compass" title={t('common.notFound')} />
        <Button label={t('common.goHome')} onPress={() => router.replace('/')} />
      </Screen>
    </>
  );
}
