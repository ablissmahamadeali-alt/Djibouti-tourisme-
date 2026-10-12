import { DestinationCard, ExperienceCard } from '@/components/cards';
import { DemoBanner } from '@/components/DemoBanner';
import { AppText, ErrorState, LoadingState, Screen, Section } from '@/components/ui';
import { useBackend } from '@/data/BackendProvider';
import { useResource } from '@/data/use-resource';
import { t } from '@/i18n';

export default function ExploreScreen() {
  const { catalog } = useBackend();
  const data = useResource('explore', async () => {
    const [destinations, experiences] = await Promise.all([catalog.listDestinations(), catalog.listExperiences()]);
    return { destinations, experiences };
  });

  return (
    <Screen topInset onRefresh={data.reload} refreshing={data.refreshing}>
      <AppText variant="title">{t('explore.title')}</AppText>
      <DemoBanner />
      {data.loading && <LoadingState rows={4} />}
      {data.error && !data.data && <ErrorState onRetry={data.reload} />}
      {data.data && (
        <>
          <Section title={t('explore.destinations')}>
            {data.data.destinations.map((d) => (
              <DestinationCard key={d.id} destination={d} />
            ))}
          </Section>
          <Section title={t('explore.experiences')}>
            {data.data.experiences.map((e) => (
              <ExperienceCard key={e.id} experience={e} />
            ))}
          </Section>
        </>
      )}
    </Screen>
  );
}
