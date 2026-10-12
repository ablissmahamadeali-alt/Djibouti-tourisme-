import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/design/tokens';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type Tone = 'info' | 'warning' | 'demo' | 'success' | 'danger';

const tones: Record<Tone, { bg: string; fg: string; icon: IconName }> = {
  info: { bg: colors.accentSoft, fg: colors.accentPressed, icon: 'info' },
  warning: { bg: colors.warningSoft, fg: colors.warning, icon: 'alert-triangle' },
  demo: { bg: colors.demoSoft, fg: colors.demo, icon: 'info' },
  success: { bg: colors.successSoft, fg: colors.success, icon: 'check-circle' },
  danger: { bg: colors.dangerSoft, fg: colors.danger, icon: 'alert-circle' },
};

export function Notice({ tone = 'info', title, body }: { tone?: Tone; title?: string; body: string }) {
  const c = tones[tone];
  return (
    <View
      style={[styles.notice, { backgroundColor: c.bg }]}
      accessibilityRole={tone === 'danger' ? 'alert' : undefined}>
      <Icon name={c.icon} size={18} color={c.fg} />
      <View style={styles.text}>
        {title && (
          <AppText variant="smallStrong" style={{ color: c.fg }}>
            {title}
          </AppText>
        )}
        <AppText variant="small" style={{ color: c.fg }}>
          {body}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderRadius: radii.md },
  text: { flex: 1, gap: spacing.xxs },
});
