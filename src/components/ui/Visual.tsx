import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { palette, radii, spacing } from '@/design/tokens';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

const skies = [palette.navy900, palette.navy800, palette.navy700] as const;
const seas = [palette.teal700, palette.teal600, palette.teal500] as const;

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Visuel d'une fiche. Tant qu'aucune photographie libre de droits n'est
 * fournie, on affiche une composition « horizon » en aplats (ciel, mer, rivage)
 * plutôt qu'une image de banque générique ou une photo non autorisée.
 */
export function Visual({
  seed,
  imageUrl,
  icon = 'image',
  caption,
  height = 160,
  rounded = true,
  style,
}: {
  seed: string;
  imageUrl?: string | null;
  icon?: IconName;
  caption?: string;
  height?: number;
  rounded?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const radius = rounded ? radii.lg : 0;
  if (imageUrl) {
    return (
      <Image
        source={imageUrl}
        style={[{ height, borderRadius: radius }, style as object]}
        contentFit="cover"
        transition={150}
        cachePolicy="memory-disk"
        accessibilityIgnoresInvertColors
      />
    );
  }

  const h = hash(seed);
  const horizon = 0.48 + ((h >> 4) % 18) / 100;
  return (
    <View
      style={[styles.frame, { height, borderRadius: radius, backgroundColor: skies[h % skies.length] }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <View style={[styles.sea, { top: `${horizon * 100}%`, backgroundColor: seas[(h >> 2) % seas.length] }]} />
      <View style={styles.shore} />
      <View style={styles.label}>
        <Icon name={icon} size={16} color={palette.sand100} />
        {caption && (
          <AppText variant="label" style={styles.caption} numberOfLines={1}>
            {caption.toUpperCase()}
          </AppText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', justifyContent: 'flex-end' },
  sea: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  shore: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 10, backgroundColor: palette.sand300 },
  label: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.md, paddingBottom: spacing.lg },
  caption: { color: palette.sand100 },
});
