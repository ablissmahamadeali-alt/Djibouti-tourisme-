import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { colors, radii, spacing, touchTarget, typography } from '@/design/tokens';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  fullWidth?: boolean;
};

const palette: Record<Variant, { bg: string; bgPressed: string; fg: string; border: string }> = {
  primary: { bg: colors.accent, bgPressed: colors.accentPressed, fg: colors.textOnBrand, border: colors.accent },
  secondary: { bg: colors.surface, bgPressed: colors.surfaceMuted, fg: colors.brand, border: colors.borderStrong },
  ghost: { bg: 'transparent', bgPressed: colors.accentSoft, fg: colors.accent, border: 'transparent' },
  danger: { bg: colors.surface, bgPressed: colors.dangerSoft, fg: colors.danger, border: colors.danger },
};

export function Button({
  label,
  variant = 'primary',
  icon,
  loading = false,
  disabled,
  fullWidth = true,
  ...rest
}: ButtonProps) {
  const p = palette[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!inactive, busy: loading }}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: pressed ? p.bgPressed : p.bg, borderColor: p.border },
        fullWidth && styles.fullWidth,
        inactive && styles.inactive,
      ]}
      {...rest}>
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={p.fg} />
        ) : (
          icon && <Icon name={icon} size={18} color={p.fg} />
        )}
        <AppText style={[typography.bodyStrong, { color: p.fg }]} numberOfLines={1}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTarget + 4,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.md,
    borderWidth: 1,
    justifyContent: 'center',
  },
  fullWidth: { alignSelf: 'stretch' },
  inactive: { opacity: 0.55 },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
});
