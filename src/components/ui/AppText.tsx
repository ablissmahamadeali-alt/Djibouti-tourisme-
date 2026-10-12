import { Text, type TextProps } from 'react-native';

import { colors, typography, type TypographyVariant } from '@/design/tokens';

type Tone = 'default' | 'muted' | 'subtle' | 'onBrand' | 'onBrandMuted' | 'accent' | 'danger';

const toneColor: Record<Tone, string> = {
  default: colors.text,
  muted: colors.textMuted,
  subtle: colors.textSubtle,
  onBrand: colors.textOnBrand,
  onBrandMuted: colors.textOnBrandMuted,
  accent: colors.accent,
  danger: colors.danger,
};

export type AppTextProps = TextProps & { variant?: TypographyVariant; tone?: Tone };

export function AppText({ variant = 'body', tone = 'default', style, ...rest }: AppTextProps) {
  const isHeading = variant === 'display' || variant === 'title' || variant === 'heading';
  return (
    <Text
      accessibilityRole={isHeading ? 'header' : undefined}
      maxFontSizeMultiplier={1.6}
      style={[typography[variant], { color: toneColor[tone] }, style]}
      {...rest}
    />
  );
}
