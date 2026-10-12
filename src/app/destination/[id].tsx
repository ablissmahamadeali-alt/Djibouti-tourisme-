import { useLocalSearchParams } from 'expo-router';

import { ExperienceCard, StayCard } from '@/components/cards';
import { BulletList, TitleBlock } from '@/components/DetailParts';
import { AppText, EmptyState, ErrorState, LoadingState, Notice, ReliabilityBadge, Screen, Section, Visual } from '@/components/ui';
import { useBackend } from '@/data/BackendProvider';
import { useResource } from '@/data/use-resource';
import { t } from '@/i18n';

export default function DestinationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { catalog } = useBackend();
  const data = useResource(`destination:${id}`, async () => {
    const [destination, experiences, stays] = await Promise.all([
      catalog.getDestination(id),
      catalog.listExperiences({ destinationId: id }),
      catalog.listStays({ destinationId: id }),
    ]);
    return { destination, experiences, stays };
  });

  if (data.loading) return <Screen><LoadingState rows={4} /></Screen>;
  if (data.error && !data.data) return <Screen><ErrorState onRetry={data.reload} /></Screen>;
  const d = data.data?.destination;
  if (!d) return <Screen><EmptyState icon="map" title={t('common.notFound')} /></Screen>;

  return (
    <Screen>
      <Visual seed={d.id} imageUrl={d.imageUrl} icon="map-pin" height={220} />
      <TitleBlock eyebrow={t(`region.${d.region}`)} title={d.name} subtitle={d.summary} />
      <ReliabilityBadge reliability={d.reliability} />
      {d.reliability !== 'verified' && <Notice tone="warning" body={t('reliability.unverifiedNotice')} />}
      <AppText>{d.description}</AppText>
      {d.highlights.length > 0 && (
        <Section title={t('explore.highlights')}>
          <BulletList items={d.highlights} />
        </Section>
      )}
      {d.practicalInfo.length > 0 && (
        <Section title={t('explore.practical')}>
          <BulletList items={d.practicalInfo} />
        </Section>
      )}
      {data.data && data.data.experiences.length > 0 && (
        <Section title={t('explore.experiencesHere')}>
          {data.data.experiences.map((e) => (
            <ExperienceCard key={e.id} experience={e} />
          ))}
        </Section>
      )}
      {data.data && data.data.stays.length > 0 && (
        <Section title={t('home.stays')}>
          {data.data.stays.map((s) => (
            <StayCard key={s.id} stay={s} />
          ))}
        </Section>
      )}
    </Screen>
  );
}
