import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { colors, radii, spacing, touchTarget } from '@/design/tokens';
import { addDays } from '@/domain/time';
import { getLocale } from '@/i18n';

import { AppText } from './AppText';
import { Icon } from './Icon';

/** Compteur +/- (passagers, personnes). */
export function Stepper({
  label,
  value,
  min = 1,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.stepperRow}>
      <AppText variant="smallStrong" style={styles.flex}>
        {label}
      </AppText>
      <View style={styles.stepper} accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ min, max, now: value }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'increment' && value < max) onChange(value + 1);
          if (e.nativeEvent.actionName === 'decrement' && value > min) onChange(value - 1);
        }}>
        <StepButton icon="minus" disabled={value <= min} onPress={() => onChange(value - 1)} label={`${label} −`} />
        <AppText variant="heading" style={styles.stepperValue}>
          {value}
        </AppText>
        <StepButton icon="plus" disabled={value >= max} onPress={() => onChange(value + 1)} label={`${label} +`} />
      </View>
    </View>
  );
}

function StepButton({ icon, disabled, onPress, label }: { icon: 'plus' | 'minus'; disabled: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.stepButton, pressed && styles.pressed, disabled && styles.disabled]}>
      <Icon name={icon} size={18} color={colors.brand} />
    </Pressable>
  );
}

/** Choix exclusif sous forme de pastilles (ports, catégories). */
export function ChoiceChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <AppText variant="smallStrong">{label}</AppText>
      <View style={styles.chips}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              style={[styles.chip, selected && styles.chipSelected]}>
              <AppText variant="smallStrong" style={{ color: selected ? colors.textOnBrand : colors.text }}>
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const WEEKDAYS: Record<string, string[]> = {
  fr: ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

/** Sélecteur de date horizontal : sans dépendance native, adapté au pouce. */
export function DateStrip({
  label,
  start,
  days = 21,
  value,
  onChange,
}: {
  label: string;
  start: string;
  days?: number;
  value: string;
  onChange: (value: string) => void;
}) {
  const names = WEEKDAYS[getLocale()] ?? WEEKDAYS.fr;
  const dates = Array.from({ length: days }, (_, i) => addDays(start, i));
  return (
    <View style={styles.group}>
      <AppText variant="smallStrong">{label}</AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dates} accessibilityRole="radiogroup">
        {dates.map((date) => {
          const d = new Date(`${date}T00:00:00Z`);
          const selected = date === value;
          return (
            <Pressable
              key={date}
              accessibilityRole="radio"
              accessibilityLabel={date}
              accessibilityState={{ selected }}
              onPress={() => onChange(date)}
              style={[styles.date, selected && styles.chipSelected]}>
              <AppText variant="caption" style={{ color: selected ? colors.textOnBrandMuted : colors.textMuted }}>
                {names[d.getUTCDay()]}
              </AppText>
              <AppText variant="heading" style={{ color: selected ? colors.textOnBrand : colors.text }}>
                {d.getUTCDate()}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** Case à cocher accessible. */
export function Checkbox({ label, checked, onChange, error }: { label: string; checked: boolean; onChange: (v: boolean) => void; error?: string }) {
  return (
    <View style={styles.group}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        onPress={() => onChange(!checked)}
        style={styles.checkboxRow}>
        <View style={[styles.box, checked && styles.boxChecked, !!error && { borderColor: colors.danger }]}>
          {checked && <Icon name="check" size={16} color={colors.textOnBrand} />}
        </View>
        <AppText variant="small" style={styles.flex}>
          {label}
        </AppText>
      </Pressable>
      {error && (
        <AppText variant="small" tone="danger">
          {error}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  group: { gap: spacing.sm },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepperValue: { minWidth: 28, textAlign: 'center' },
  stepButton: {
    width: touchTarget,
    height: touchTarget,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  pressed: { backgroundColor: colors.surfaceMuted },
  disabled: { opacity: 0.4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: colors.brand, borderColor: colors.brand },
  dates: { gap: spacing.sm, paddingRight: spacing.lg },
  date: {
    width: 56,
    height: 64,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', minHeight: touchTarget, paddingVertical: spacing.xs },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: { backgroundColor: colors.accent, borderColor: colors.accent },
});
