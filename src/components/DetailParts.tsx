import { Linking, StyleSheet, View } from 'react-native';

import type { Provider } from '@/domain/models';
import { colors, spacing } from '@/design/tokens';
import { t } from '@/i18n';

import { AppText, Button, Card, Icon, ReliabilityBadge, Row } from './ui';

export function BulletList({ items }: { items: string[] }) {
  return (
    <View style={styles.list}>
      {items.map((item) => (
        <View key={item} style={styles.bullet}>
          <View style={styles.dot} />
          <AppText style={styles.flex}>{item}</AppText>
        </View>
      ))}
    </View>
  );
}

/** Coordonnées du prestataire. Les contacts des données de démo (domaine .invalid) ne sont pas cliquables. */
export function ProviderCard({ provider }: { provider: Provider }) {
  const isDemo = provider.reliability === 'demo';
  return (
    <Card>
      <AppText variant="label" tone="muted">
        {t('common.provider').toUpperCase()}
      </AppText>
      <AppText variant="heading">{provider.name}</AppText>
      {provider.description.length > 0 && (
        <AppText variant="small" tone="muted">
          {provider.description}
        </AppText>
      )}
      <Row>
        <ReliabilityBadge reliability={provider.verified ? 'verified' : provider.reliability} />
      </Row>
      {!isDemo && provider.phone && (
        <Button
          label={provider.phone}
          variant="secondary"
          icon="phone"
          onPress={() => Linking.openURL(`tel:${provider.phone?.replace(/\s/g, '')}`)}
        />
      )}
      {!isDemo && provider.email && (
        <Button label={provider.email} variant="ghost" icon="mail" onPress={() => Linking.openURL(`mailto:${provider.email}`)} />
      )}
    </Card>
  );
}

export function TitleBlock({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <View style={styles.titleBlock}>
      {eyebrow && (
        <AppText variant="label" tone="accent">
          {eyebrow.toUpperCase()}
        </AppText>
      )}
      <AppText variant="display">{title}</AppText>
      {subtitle && <AppText tone="muted">{subtitle}</AppText>}
    </View>
  );
}

export function InlineIconText({ icon, text }: { icon: 'clock' | 'tag' | 'map-pin'; text: string }) {
  return (
    <View style={styles.inline}>
      <Icon name={icon} size={16} color={colors.textMuted} />
      <AppText tone="muted">{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  bullet: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent, marginTop: 9 },
  flex: { flex: 1 },
  titleBlock: { gap: spacing.xs },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
