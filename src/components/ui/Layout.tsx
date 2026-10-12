import type { ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout, radii, spacing } from '@/design/tokens';

import { AppText } from './AppText';
import { Icon } from './Icon';

/** Conteneur d'écran défilant avec marges cohérentes et largeur maximale (tablette / web). */
export function Screen({
  children,
  refreshing,
  onRefresh,
  padded = true,
  topInset = false,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  padded?: boolean;
  topInset?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        padded && styles.padded,
        { paddingTop: (topInset ? insets.top : 0) + (padded ? spacing.lg : 0), paddingBottom: spacing.xxxl },
      ]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.accent} /> : undefined
      }>
      {children}
    </ScrollView>
  );
}

export function Section({ title, action, children }: { title: string; action?: { label: string; onPress: () => void }; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <AppText variant="heading" style={styles.flex}>
          {title}
        </AppText>
        {action && (
          <Pressable accessibilityRole="link" onPress={action.onPress} hitSlop={12} style={styles.sectionAction}>
            <AppText variant="smallStrong" tone="accent">
              {action.label}
            </AppText>
            <Icon name="chevron-right" size={16} color={colors.accent} />
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

/** Surface cliquable. Toute la carte est la cible tactile. */
export function Card({
  children,
  onPress,
  accessibilityLabel,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  if (!onPress) return <View style={[styles.card, style]}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed, style]}>
      {children}
    </Pressable>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.keyValue}>
      <AppText variant="small" tone="muted">
        {label}
      </AppText>
      <AppText variant="bodyStrong" style={styles.kvValue}>
        {value}
      </AppText>
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { gap: spacing.xl, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' },
  padded: { paddingHorizontal: layout.screenPadding },
  section: { gap: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', minHeight: 32 },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 32 },
  flex: { flex: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardPressed: { backgroundColor: colors.surfaceMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  keyValue: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.lg, paddingVertical: spacing.xs },
  kvValue: { flexShrink: 1, textAlign: 'right' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderStrong },
});
