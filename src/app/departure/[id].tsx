import { router, useLocalSearchParams } from 'expo-router';

import { BulletList, ProviderCard, TitleBlock } from '@/components/DetailParts';
import {
  AppText,
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  KeyValue,
  LoadingState,
  Notice,
  ReliabilityBadge,
  Screen,
  Section,
} from '@/components/ui';
import { useBackend } from '@/data/BackendProvider';
import { useResource } from '@/data/use-resource';
import { formatDate, formatDjf, formatDuration } from '@/domain/format';
import { djiboutiDate, djiboutiTime } from '@/domain/time';
import { getLocale, t } from '@/i18n';

export default function DepartureScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { catalog } = useBackend();
  const data = useResource(
    `departure:${id}`,
    async () => {
      const [result, destinations] = await Promise.all([catalog.getDeparture(id), catalog.listDestinations()]);
      return { result, destinations };
    },
    { cache: false },
  );

  if (data.loading) return <Screen><LoadingState rows={4} /></Screen>;
  if (data.error && !data.data) return <Screen><ErrorState onRetry={data.reload} /></Screen>;
  const result = data.data?.result;
  if (!result) return <Screen><EmptyState icon="anchor" title={t('common.notFound')} /></Screen>;
  const { departure, route, provider } = result;
  const name = (destinationId: string) => data.data?.destinations.find((d) => d.id === destinationId)?.name ?? '';
  const arrival =
    route.durationMinutes !== null
      ? djiboutiTime(new Date(Date.parse(departure.departsAt) + route.durationMinutes * 60_000).toISOString())
      : null;
  const full = departure.seatsAvailable === 0;

  return (
    <Screen onRefresh={data.reload} refreshing={data.refreshing}>
      <TitleBlock
        eyebrow={formatDate(djiboutiDate(departure.departsAt), getLocale())}
        title={`${name(route.originId)} → ${name(route.destinationId)}`}
      />
      <ReliabilityBadge reliability={departure.reliability} />
      {departure.reliability === 'demo' && <Notice tone="demo" body={t('reliability.demoBanner')} />}

      <Card>
        <KeyValue label={t('crossings.departure')} value={djiboutiTime(departure.departsAt)} />
        {arrival && <KeyValue label={t('crossings.arrival')} value={arrival} />}
        {route.durationMinutes !== null && <KeyValue label={t('common.duration')} value={formatDuration(route.durationMinutes)} />}
        <Divider />
        <KeyValue
          label={t('crossings.fareAdult')}
          value={route.adultFareDjf !== null ? formatDjf(route.adultFareDjf) : t('common.priceOnRequest')}
        />
        <KeyValue
          label={t('crossings.passengers')}
          value={full ? t('crossings.full') : t('crossings.seatsLeft', { count: departure.seatsAvailable })}
        />
      </Card>

      <Section title={t('crossings.conditions')}>
        {route.conditions.length > 0 ? (
          <BulletList items={route.conditions} />
        ) : (
          <AppText tone="muted">{t('crossings.noConditions')}</AppText>
        )}
      </Section>

      <ProviderCard provider={provider} />

      <Button
        label={full ? t('crossings.full') : t('common.requestBooking')}
        icon="send"
        disabled={full}
        onPress={() =>
          router.push({
            pathname: '/booking/new',
            params: { kind: 'crossing', itemId: departure.id, date: djiboutiDate(departure.departsAt) },
          })
        }
      />
    </Screen>
  );
}
