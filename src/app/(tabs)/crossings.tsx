import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { DepartureRow } from '@/components/cards';
import { CrossingSearch, type CrossingQuery } from '@/components/CrossingSearch';
import { DemoBanner } from '@/components/DemoBanner';
import { AppText, EmptyState, ErrorState, LoadingState, Screen, Section } from '@/components/ui';
import { useBackend } from '@/data/BackendProvider';
import { useResource } from '@/data/use-resource';
import { formatDate } from '@/domain/format';
import { getLocale, t } from '@/i18n';

export default function CrossingsScreen() {
  const params = useLocalSearchParams<{ from?: string; to?: string; date?: string; pax?: string }>();
  const { catalog } = useBackend();
  const destinations = useResource('destinations', () => catalog.listDestinations());
  const ports = (destinations.data ?? []).filter((d) => d.isPort);

  const initial: Partial<CrossingQuery> = {
    originId: params.from,
    destinationId: params.to,
    date: params.date,
    passengers: params.pax ? Math.min(20, Math.max(1, Number(params.pax) || 1)) : undefined,
  };
  const fromParams = (): CrossingQuery | null =>
    initial.originId && initial.destinationId && initial.date
      ? { originId: initial.originId, destinationId: initial.destinationId, date: initial.date, passengers: initial.passengers ?? 1 }
      : null;
  const [query, setQuery] = useState<CrossingQuery | null>(fromParams);

  // Nouvelle recherche lancée depuis l'accueil alors que l'onglet est déjà monté.
  const paramsKey = `${params.from}|${params.to}|${params.date}|${params.pax}`;
  const [seenParamsKey, setSeenParamsKey] = useState(paramsKey);
  if (seenParamsKey !== paramsKey) {
    setSeenParamsKey(paramsKey);
    setQuery(fromParams());
  }

  const results = useResource(
    query ? `departures:${query.originId}:${query.destinationId}:${query.date}` : null,
    () => (query ? catalog.searchDepartures(query) : Promise.resolve([])),
    { cache: false },
  );
  const destinationName = (id: string) => (destinations.data ?? []).find((d) => d.id === id)?.name ?? '';

  return (
    <Screen topInset onRefresh={query ? results.reload : undefined} refreshing={results.refreshing}>
      <AppText variant="title">{t('crossings.title')}</AppText>
      <DemoBanner />

      {destinations.loading && <LoadingState rows={2} />}
      {destinations.error && !destinations.data && <ErrorState onRetry={destinations.reload} />}
      {ports.length > 0 && (
        // `key` : réinitialise le formulaire quand on arrive depuis l'accueil avec de nouveaux paramètres.
        <CrossingSearch key={paramsKey} ports={ports} initial={initial} onSearch={setQuery} />
      )}

      {/* Le titre affiche les noms des ports : attendre qu'ils soient chargés. */}
      {query && destinations.data && (
        <Section title={`${destinationName(query.originId)} → ${destinationName(query.destinationId)} · ${formatDate(query.date, getLocale())}`}>
          {results.loading && <LoadingState rows={2} />}
          {results.error && <ErrorState onRetry={results.reload} />}
          {results.data && results.data.length === 0 && (
            <EmptyState icon="anchor" title={t('crossings.noResults')} body={t('crossings.noResultsHint')} />
          )}
          {results.data?.map((r) => (
            <DepartureRow key={r.departure.id} result={r} destinationLabel={destinationName(query.destinationId)} />
          ))}
        </Section>
      )}
    </Screen>
  );
}
