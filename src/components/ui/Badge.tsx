import { StyleSheet, View } from 'react-native';

import type { BookingStatus } from '@/domain/booking-status';
import type { DataReliability } from '@/domain/models';
import { colors, radii, spacing } from '@/design/tokens';
import { t } from '@/i18n';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'demo' | 'brand';

const tones: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: colors.surfaceMuted, fg: colors.textMuted },
  accent: { bg: colors.accentSoft, fg: colors.accentPressed },
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  demo: { bg: colors.demoSoft, fg: colors.demo },
  brand: { bg: colors.brand, fg: colors.textOnBrand },
};

export function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: Tone; icon?: IconName }) {
  const c = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      {icon && <Icon name={icon} size={12} color={c.fg} />}
      <AppText variant="label" style={{ color: c.fg }}>
        {label.toUpperCase()}
      </AppText>
    </View>
  );
}

/** Signale systématiquement les données fictives ou non vérifiées. */
export function ReliabilityBadge({ reliability }: { reliability: DataReliability }) {
  if (reliability === 'verified') return <Badge label={t('reliability.verified')} tone="success" icon="check" />;
  if (reliability === 'unverified') return <Badge label={t('reliability.unverified')} tone="warning" icon="alert-triangle" />;
  return <Badge label={t('reliability.demo')} tone="demo" icon="info" />;
}

export function SponsoredBadge() {
  return <Badge label={t('sponsored.label')} tone="brand" />;
}

const statusTone: Record<BookingStatus, Tone> = {
  draft: 'neutral',
  submitted: 'accent',
  pending_confirmation: 'warning',
  confirmed: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
  completed: 'success',
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return <Badge label={t(`status.${status}`)} tone={statusTone[status]} />;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
});
