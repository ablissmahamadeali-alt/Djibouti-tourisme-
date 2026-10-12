import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DestinationCard, ExperienceCard, SponsoredCard, StayCard } from '@/components/cards';
import { CrossingSearch } from '@/components/CrossingSearch';
import { DemoBanner } from '@/components/DemoBanner';
import { AppText, ErrorState, LoadingState, Section } from '@/components/ui';
import { useBackend } from '@/data/BackendProvider';
import { useResource } from '@/data/use-resource';
import { colors, layout, palette, spacing } from '@/design/tokens';
import { t } from '@/i18n';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { catalog } = useBackend();
  const home = useResource('home', async () => {
    const [destinations, experiences, stays, sponsored] = await Promise.all([
      catalog.listDestinations(),
      catalog.listExperiences(),
      catalog.listStays(),
      catalog.listSponsored(),
    ]);
    return { destinations, experiences, stays, sponsored };
  });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={[styles.hero, { paddingTop: insets.top + spacing.xl }]}>
        <View style={styles.inner}>
          <AppText variant="label" tone="onBrandMuted">
            {t('common.tagline').toUpperCase()}
          </AppText>
          <AppText variant="display" tone="onBrand" style={styles.brand}>
            {t('common.appName')}
          </AppText>
          <AppText tone="onBrandMuted">{t('home.greeting')}</AppText>
          <View style={styles.horizon} />
        </View>
      </View>

      <View style={[styles.inner, styles.body]}>
        <DemoBanner />

        {home.loading && <LoadingState rows={4} />}
        {home.error && !home.data && <ErrorState onRetry={home.reload} />}

        {home.data && (
          <>
            <CrossingSearch
              title={t('home.searchTitle')}
              ports={home.data.destinations.filter((d) => d.isPort)}
              onSearch={(q) =>
                router.push({
                  pathname: '/crossings',
                  params: { from: q.originId, to: q.destinationId, date: q.date, pax: String(q.passengers) },
                })
              }
            />

            <Section title={t('home.destinations')} action={{ label: t('common.seeAll'), onPress: () => router.push('/explore') }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
                {home.data.destinations.map((d) => (
                  <DestinationCard key={d.id} destination={d} compact />
                ))}
              </ScrollView>
            </Section>

            {home.data.sponsored.length > 0 && (
              <Section title={t('home.partners')}>
                {home.data.sponsored.map((s) => (
                  <SponsoredCard key={s.id} placement={s} />
                ))}
              </Section>
            )}

            <Section title={t('home.experiences')} action={{ label: t('common.seeAll'), onPress: () => router.push('/explore') }}>
              {home.data.experiences.slice(0, 3).map((e) => (
                <ExperienceCard key={e.id} experience={e} />
              ))}
            </Section>

            <Section title={t('home.stays')} action={{ label: t('common.seeAll'), onPress: () => router.push('/stays') }}>
              {home.data.stays.slice(0, 2).map((s) => (
                <StayCard key={s.id} stay={s} />
              ))}
            </Section>
          </>
        )}

        <AppText variant="caption" tone="subtle" style={styles.footnote}>
          {t('home.intermediary')}
        </AppText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxxl },
  hero: { backgroundColor: colors.surfaceBrand, paddingBottom: spacing.xl, paddingHorizontal: layout.screenPadding },
  inner: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' },
  brand: { fontSize: 44, lineHeight: 50, marginTop: spacing.xs },
  horizon: { height: 3, width: 56, backgroundColor: palette.sand300, marginTop: spacing.lg, borderRadius: 2 },
  body: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.xl, gap: spacing.xl },
  carousel: { gap: spacing.md, paddingRight: spacing.lg },
  footnote: { textAlign: 'center' },
});
