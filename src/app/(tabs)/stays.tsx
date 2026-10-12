import { StayCard } from '@/components/cards';
import { DemoBanner } from '@/components/DemoBanner';
import { AppText, EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui';
import { useBackend } from '@/data/BackendProvider';
import { useResource } from '@/data/use-resource';
import { t } from '@/i18n';

export default function StaysScreen() {
  const { catalog } = useBackend();
  const stays = useResource('stays', () => catalog.listStays());

  return (
    <Screen topInset onRefresh={stays.reload} refreshing={stays.refreshing}>
      <AppText variant="title">{t('stays.title')}</AppText>
      <AppText tone="muted">{t('stays.subtitle')}</AppText>
      <DemoBanner />
      {stays.loading && <LoadingState rows={3} />}
      {stays.error && !stays.data && <ErrorState onRetry={stays.reload} />}
      {stays.data?.length === 0 && <EmptyState icon="key" title={t('errors.empty')} />}
      {stays.data?.map((s) => (
        <StayCard key={s.id} stay={s} />
      ))}
    </Screen>
  );
}
