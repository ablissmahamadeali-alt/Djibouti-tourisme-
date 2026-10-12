import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  EmptyState,
  ErrorState,
  KeyValue,
  LoadingState,
  Notice,
  ReliabilityBadge,
  Row,
  Screen,
  Section,
  StatusBadge,
} from '@/components/ui';
import { useBackend } from '@/data/BackendProvider';
import { useResource } from '@/data/use-resource';
import { canTransition, isGuaranteed } from '@/domain/booking-status';
import { formatDate, formatPhone } from '@/domain/format';
import { djiboutiDate, djiboutiTime } from '@/domain/time';
import { colors, spacing } from '@/design/tokens';
import { getLocale, t } from '@/i18n';

export default function BookingStatusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bookings } = useBackend();
  const detail = useResource(`booking:${id}`, () => bookings.get(id), { cache: false });
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (detail.loading) return <Screen><LoadingState rows={4} /></Screen>;
  if (detail.error && !detail.data) return <Screen><ErrorState onRetry={detail.reload} /></Screen>;
  if (!detail.data) return <Screen><EmptyState icon="inbox" title={t('common.notFound')} /></Screen>;
  const { booking, timeline } = detail.data;

  const cancel = async () => {
    setActionError(null);
    setCancelling(true);
    try {
      await bookings.cancel(booking.id);
      detail.reload();
    } catch {
      setActionError(t('booking.errorNetwork'));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Screen onRefresh={detail.reload} refreshing={detail.refreshing}>
      <Card>
        <Row style={styles.between}>
          <AppText variant="small" tone="muted">
            {t('booking.reference')}
          </AppText>
          <StatusBadge status={booking.status} />
        </Row>
        <AppText variant="title" selectable>
          {booking.reference}
        </AppText>
        <AppText variant="heading">{booking.itemLabel}</AppText>
        {booking.isDemo && <ReliabilityBadge reliability="demo" />}
      </Card>

      <Notice
        tone={isGuaranteed(booking.status) ? 'success' : 'info'}
        body={isGuaranteed(booking.status) ? t('booking.guaranteed') : t('booking.notGuaranteed')}
      />

      <Card>
        <KeyValue label={t('booking.date')} value={formatDate(booking.serviceDate, getLocale())} />
        <KeyValue label={t('booking.partySize')} value={String(booking.partySize)} />
        <KeyValue label={t('booking.contactName')} value={booking.contactName} />
        <KeyValue label={t('booking.contactPhone')} value={formatPhone(booking.contactPhone)} />
      </Card>

      {booking.passengers.length > 0 && (
        <Section title={t('booking.passengers')}>
          {booking.passengers.map((p, i) => (
            <KeyValue key={i} label={t(`booking.category.${p.category}`)} value={p.fullName} />
          ))}
        </Section>
      )}

      <Section title={t('booking.timeline')}>
        {timeline.map((entry, i) => (
          <View key={`${entry.status}-${i}`} style={styles.step}>
            <View style={[styles.stepDot, i === timeline.length - 1 && styles.stepDotCurrent]} />
            <View style={styles.flex}>
              <AppText variant="bodyStrong">{t(`status.${entry.status}`)}</AppText>
              <AppText variant="small" tone="muted">
                {`${formatDate(djiboutiDate(entry.at), getLocale())} · ${djiboutiTime(entry.at)} (${t('common.djiboutiTime')})`}
              </AppText>
              {entry.note && <AppText variant="small">{entry.note}</AppText>}
            </View>
          </View>
        ))}
      </Section>

      {actionError && <Notice tone="danger" body={actionError} />}
      {canTransition(booking.status, 'cancelled', 'customer') && (
        <Button label={t('booking.cancel')} variant="danger" icon="x-circle" loading={cancelling} onPress={cancel} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  between: { justifyContent: 'space-between' },
  flex: { flex: 1, gap: 2 },
  step: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.borderStrong, marginTop: 7 },
  stepDotCurrent: { backgroundColor: colors.accent },
});
