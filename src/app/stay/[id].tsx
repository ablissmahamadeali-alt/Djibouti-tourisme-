import { router, useLocalSearchParams } from 'expo-router';

import { priceLabel } from '@/components/cards';
import { BulletList, InlineIconText, ProviderCard, TitleBlock } from '@/components/DetailParts';
import { Button, EmptyState, ErrorState, LoadingState, Notice, ReliabilityBadge, Screen, Section, Visual } from '@/components/ui';
import { useBackend } from '@/data/BackendProvider';
import { useResource } from '@/data/use-resource';
import { t } from '@/i18n';

export default function StayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { catalog } = useBackend();
  const data = useResource(`stay:${id}`, () => catalog.getStay(id));

  if (data.loading) return <Screen><LoadingState rows={4} /></Screen>;
  if (data.error && !data.data) return <Screen><ErrorState onRetry={data.reload} /></Screen>;
  if (!data.data) return <Screen><EmptyState icon="map" title={t('common.notFound')} /></Screen>;
  const { stay: s, provider, destination } = data.data;

  return (
    <Screen>
      <Visual seed={s.id} imageUrl={s.imageUrl} icon="key" height={220} />
      <TitleBlock eyebrow={`${t(`stayCategory.${s.category}`)} · ${destination.name}`} title={s.name} subtitle={s.summary} />
      <InlineIconText icon="tag" text={priceLabel(s.nightlyFromDjf, t('common.perNight'))} />
      {s.address && <InlineIconText icon="map-pin" text={s.address} />}
      <ReliabilityBadge reliability={s.reliability} />
      <Notice tone="info" body={t('stays.availability')} />
      {s.amenities.length > 0 && (
        <Section title={t('stays.amenities')}>
          <BulletList items={s.amenities} />
        </Section>
      )}
      <ProviderCard provider={provider} />
      <Button
        label={t('common.requestBooking')}
        icon="send"
        onPress={() => router.push({ pathname: '/booking/new', params: { kind: 'stay', itemId: s.id } })}
      />
    </Screen>
  );
}
