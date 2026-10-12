import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/design/tokens';
import { t } from '@/i18n';

import { AppText } from './AppText';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

/** Squelettes de chargement : plus rassurants qu'un indicateur seul sur réseau lent. */
export function LoadingState({ rows = 3 }: { rows?: number }) {
  const [opacity] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View accessibilityLabel={t('common.loading')} accessibilityRole="progressbar" style={styles.stack}>
      {Array.from({ length: rows }, (_, i) => (
        <Animated.View key={i} style={[styles.skeleton, { opacity }]} />
      ))}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <View style={styles.centered} accessibilityRole="alert">
      <Icon name="wifi-off" size={28} color={colors.textMuted} />
      <AppText variant="heading" style={styles.center}>
        {t('errors.title')}
      </AppText>
      <AppText tone="muted" style={styles.center}>
        {message ?? t('errors.network')}
      </AppText>
      {onRetry && <Button label={t('common.retry')} variant="secondary" icon="refresh-cw" onPress={onRetry} fullWidth={false} />}
    </View>
  );
}

export function EmptyState({ icon = 'inbox', title, body }: { icon?: IconName; title: string; body?: string }) {
  return (
    <View style={styles.centered}>
      <Icon name={icon} size={28} color={colors.textSubtle} />
      <AppText variant="bodyStrong" style={styles.center}>
        {title}
      </AppText>
      {body && (
        <AppText variant="small" tone="muted" style={styles.center}>
          {body}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  skeleton: { height: 88, borderRadius: radii.lg, backgroundColor: colors.border },
  centered: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  center: { textAlign: 'center' },
});
