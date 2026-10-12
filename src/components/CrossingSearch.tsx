import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/design/tokens';
import type { Destination } from '@/domain/models';
import { djiboutiToday } from '@/domain/time';
import { t } from '@/i18n';

import { AppText, Button, ChoiceChips, DateStrip, Icon, Stepper } from './ui';

export type CrossingQuery = { originId: string; destinationId: string; date: string; passengers: number };

export function CrossingSearch({
  ports,
  initial,
  onSearch,
  title,
}: {
  ports: Destination[];
  initial?: Partial<CrossingQuery>;
  onSearch: (query: CrossingQuery) => void;
  title?: string;
}) {
  const today = djiboutiToday();
  const [originId, setOriginId] = useState<string | null>(initial?.originId ?? ports[0]?.id ?? null);
  const [destinationId, setDestinationId] = useState<string | null>(initial?.destinationId ?? ports[1]?.id ?? null);
  const [date, setDate] = useState(initial?.date && initial.date >= today ? initial.date : today);
  const [passengers, setPassengers] = useState(initial?.passengers ?? 1);

  const options = ports.map((p) => ({ value: p.id, label: p.name }));
  const same = originId !== null && originId === destinationId;
  const canSearch = originId !== null && destinationId !== null && !same;

  return (
    <View style={styles.panel}>
      {title && <AppText variant="heading">{title}</AppText>}
      <ChoiceChips label={t('crossings.origin')} options={options} value={originId} onChange={setOriginId} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('crossings.swap')}
        onPress={() => {
          setOriginId(destinationId);
          setDestinationId(originId);
        }}
        hitSlop={8}
        style={styles.swap}>
        <Icon name="repeat" size={18} color={colors.accent} />
        <AppText variant="smallStrong" tone="accent">
          {t('crossings.swap')}
        </AppText>
      </Pressable>
      <ChoiceChips label={t('crossings.destination')} options={options} value={destinationId} onChange={setDestinationId} />
      {same && (
        <AppText variant="small" tone="danger">
          {t('crossings.sameOriginDestination')}
        </AppText>
      )}
      <DateStrip label={t('crossings.date')} start={today} value={date} onChange={setDate} />
      <Stepper label={t('crossings.passengers')} value={passengers} max={20} onChange={setPassengers} />
      <Button
        label={t('crossings.search')}
        icon="search"
        disabled={!canSearch}
        onPress={() => canSearch && onSearch({ originId, destinationId, date, passengers })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  swap: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start', minHeight: 32 },
});
