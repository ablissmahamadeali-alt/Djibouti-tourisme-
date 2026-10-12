import { router, useLocalSearchParams } from 'expo-router';

import { priceLabel } from '@/components/cards';
import { BulletList, InlineIconText, ProviderCard, TitleBlock } from '@/components/DetailParts';
import { AppText, Button, EmptyState, ErrorState, LoadingState, Notice, ReliabilityBadge, Row, Screen, Section, Visual } from '@/components/ui';
import { useBackend } from '@/data/BackendProvider';
import { useResource } from '@/data/use-resource';
import { t } from '@/i18n';

export default function ExperienceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { catalog } = useBackend();
  const data = useResource(`experience:${id}`, () => catalog.getExperience(id));

  if (data.loading) return <Screen><LoadingState rows={4} /></Screen>;
  if (data.error && !data.data) return <Screen><ErrorState onRetry={data.reload} /></Screen>;
  if (!data.data) return <Screen><EmptyState icon="map" title={t('common.notFound')} /></Screen>;
  const { experience: e, provider, destination } = data.data;

  return (
    <Screen>
      <Visual seed={e.id} imageUrl={e.imageUrl} icon="sun" height={220} />
      <TitleBlock eyebrow={`${t(`experienceKind.${e.kind}`)} · ${destination.name}`} title={e.title} subtitle={e.summary} />
      <Row>
        {e.durationLabel && <InlineIconText icon="clock" text={e.durationLabel} />}
        <InlineIconText icon="tag" text={priceLabel(e.priceFromDjf, t('common.perPerson'))} />
      </Row>
      <ReliabilityBadge reliability={e.reliability} />
      {e.reliability === 'demo' && <Notice tone="demo" body={t('reliability.demoBanner')} />}
      <AppText>{e.description}</AppText>
      {e.included.length > 0 && (
        <Section title={t('explore.included')}>
          <BulletList items={e.included} />
        </Section>
      )}
      <ProviderCard provider={provider} />
      <Button
        label={t('common.requestBooking')}
        icon="send"
        onPress={() => router.push({ pathname: '/booking/new', params: { kind: 'experience', itemId: e.id } })}
      />
    </Screen>
  );
}
