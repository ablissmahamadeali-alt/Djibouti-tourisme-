import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import type { DepartureResult } from '@/data/repository';
import { colors, spacing } from '@/design/tokens';
import { formatDate, formatDjf, formatDuration } from '@/domain/format';
import type { Booking, Destination, Experience, SponsoredPlacement, Stay } from '@/domain/models';
import { djiboutiTime } from '@/domain/time';
import { getLocale, t } from '@/i18n';

import { AppText, Card, Icon, ReliabilityBadge, Row, SponsoredBadge, StatusBadge, Visual } from './ui';

export function priceLabel(amount: number | null, suffix?: string): string {
  if (amount === null) return t('common.priceOnRequest');
  return `${t('common.from')} ${formatDjf(amount)}${suffix ? ` ${suffix}` : ''}`;
}

export function DestinationCard({ destination, compact = false }: { destination: Destination; compact?: boolean }) {
  return (
    <Card
      onPress={() => router.push({ pathname: '/destination/[id]', params: { id: destination.id } })}
      accessibilityLabel={destination.name}
      style={[styles.mediaCard, compact && styles.compact]}>
      <Visual seed={destination.id} imageUrl={destination.imageUrl} icon="map-pin" caption={t(`region.${destination.region}`)} height={compact ? 120 : 150} rounded={false} />
      <View style={styles.body}>
        <AppText variant="heading" numberOfLines={1}>
          {destination.name}
        </AppText>
        <AppText variant="small" tone="muted" numberOfLines={2}>
          {destination.summary}
        </AppText>
        <ReliabilityBadge reliability={destination.reliability} />
      </View>
    </Card>
  );
}

export function ExperienceCard({ experience }: { experience: Experience }) {
  return (
    <Card
      onPress={() => router.push({ pathname: '/experience/[id]', params: { id: experience.id } })}
      accessibilityLabel={experience.title}
      style={styles.mediaCard}>
      <Visual seed={experience.id} imageUrl={experience.imageUrl} icon="sun" caption={t(`experienceKind.${experience.kind}`)} height={130} rounded={false} />
      <View style={styles.body}>
        <AppText variant="heading" numberOfLines={2}>
          {experience.title}
        </AppText>
        <AppText variant="small" tone="muted" numberOfLines={2}>
          {experience.summary}
        </AppText>
        <Row>
          {experience.durationLabel && <Meta icon="clock" label={experience.durationLabel} />}
          <Meta icon="tag" label={priceLabel(experience.priceFromDjf)} />
        </Row>
        <ReliabilityBadge reliability={experience.reliability} />
      </View>
    </Card>
  );
}

export function StayCard({ stay }: { stay: Stay }) {
  return (
    <Card
      onPress={() => router.push({ pathname: '/stay/[id]', params: { id: stay.id } })}
      accessibilityLabel={stay.name}
      style={styles.mediaCard}>
      <Visual seed={stay.id} imageUrl={stay.imageUrl} icon="key" caption={t(`stayCategory.${stay.category}`)} height={130} rounded={false} />
      <View style={styles.body}>
        <AppText variant="heading" numberOfLines={2}>
          {stay.name}
        </AppText>
        <AppText variant="small" tone="muted" numberOfLines={2}>
          {stay.summary}
        </AppText>
        <Meta icon="tag" label={priceLabel(stay.nightlyFromDjf, t('common.perNight'))} />
        <ReliabilityBadge reliability={stay.reliability} />
      </View>
    </Card>
  );
}

export function DepartureRow({ result, destinationLabel }: { result: DepartureResult; destinationLabel: string }) {
  const { departure, route, provider } = result;
  const full = departure.seatsAvailable === 0;
  return (
    <Card
      onPress={() => router.push({ pathname: '/departure/[id]', params: { id: departure.id } })}
      accessibilityLabel={`${djiboutiTime(departure.departsAt)} ${destinationLabel}`}>
      <Row style={styles.between}>
        <View style={styles.timeBlock}>
          <AppText variant="title">{djiboutiTime(departure.departsAt)}</AppText>
          {route.durationMinutes !== null && (
            <AppText variant="small" tone="muted">
              {formatDuration(route.durationMinutes)}
            </AppText>
          )}
        </View>
        <View style={styles.flexEnd}>
          <AppText variant="bodyStrong">{route.adultFareDjf !== null ? formatDjf(route.adultFareDjf) : t('common.priceOnRequest')}</AppText>
          <AppText variant="small" tone={full ? 'danger' : 'muted'}>
            {full ? t('crossings.full') : t('crossings.seatsLeft', { count: departure.seatsAvailable })}
          </AppText>
        </View>
      </Row>
      <Row style={styles.between}>
        <AppText variant="small" tone="muted" style={styles.flex} numberOfLines={1}>
          {provider.name}
        </AppText>
        <ReliabilityBadge reliability={departure.reliability} />
      </Row>
    </Card>
  );
}

export function SponsoredCard({ placement }: { placement: SponsoredPlacement }) {
  const target = placement.target;
  const onPress = () => {
    if (target.kind === 'experience') router.push({ pathname: '/experience/[id]', params: { id: target.id } });
    else if (target.kind === 'stay') router.push({ pathname: '/stay/[id]', params: { id: target.id } });
    else router.push('/crossings');
  };
  return (
    <Card onPress={onPress} accessibilityLabel={`${t('sponsored.label')} : ${placement.title}`} style={styles.sponsored}>
      <Row>
        <SponsoredBadge />
        {placement.reliability === 'demo' && <ReliabilityBadge reliability="demo" />}
      </Row>
      <AppText variant="heading">{placement.title}</AppText>
      <AppText variant="small" tone="muted">
        {placement.body}
      </AppText>
      <AppText variant="caption" tone="subtle">
        {t('sponsored.explainer')}
      </AppText>
    </Card>
  );
}

export function BookingRow({ booking }: { booking: Booking }) {
  return (
    <Card
      onPress={() => router.push({ pathname: '/booking/[id]', params: { id: booking.id } })}
      accessibilityLabel={`${booking.reference} ${booking.itemLabel}`}>
      <Row style={styles.between}>
        <AppText variant="smallStrong" tone="muted">
          {booking.reference}
        </AppText>
        <StatusBadge status={booking.status} />
      </Row>
      <AppText variant="heading" numberOfLines={2}>
        {booking.itemLabel}
      </AppText>
      <Row>
        <Meta icon="calendar" label={formatDate(booking.serviceDate, getLocale())} />
        <Meta icon="users" label={String(booking.partySize)} />
        {booking.isDemo && <ReliabilityBadge reliability="demo" />}
      </Row>
    </Card>
  );
}

export function Meta({ icon, label }: { icon: 'clock' | 'tag' | 'calendar' | 'users' | 'map-pin' | 'phone' | 'mail'; label: string }) {
  return (
    <View style={styles.meta}>
      <Icon name={icon} size={14} color={colors.textMuted} />
      <AppText variant="small" tone="muted">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  mediaCard: { padding: 0, overflow: 'hidden', gap: 0 },
  compact: { width: 240 },
  body: { padding: spacing.lg, gap: spacing.sm },
  between: { justifyContent: 'space-between', flexWrap: 'nowrap' },
  timeBlock: { gap: 2 },
  flexEnd: { alignItems: 'flex-end', gap: 2 },
  flex: { flex: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sponsored: { borderColor: colors.brand, borderWidth: 1.5 },
});
