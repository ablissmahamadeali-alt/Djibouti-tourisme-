import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, radii, spacing, touchTarget, typography } from '@/design/tokens';

import { AppText } from './AppText';

export type TextFieldProps = TextInputProps & {
  label: string;
  hint?: string;
  error?: string;
};

export function TextField({ label, hint, error, multiline, onFocus, onBlur, ...rest }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.danger : focused ? colors.focus : colors.borderStrong;
  return (
    <View style={styles.wrapper}>
      <AppText variant="smallStrong">{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        placeholderTextColor={colors.textSubtle}
        maxFontSizeMultiplier={1.6}
        multiline={multiline}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[styles.input, multiline && styles.multiline, { borderColor }]}
        {...rest}
      />
      {error ? (
        <AppText variant="small" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="small" tone="muted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  input: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
    minHeight: touchTarget + 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1.5,
  },
  multiline: { minHeight: 104, textAlignVertical: 'top', paddingTop: spacing.md },
});
