import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';

import { colors } from '@/design/tokens';

/** Jeu d'icônes unique (Feather, trait fin) pour une identité cohérente. */
export type IconName = ComponentProps<typeof Feather>['name'];

export function Icon({
  name,
  size = 20,
  color = colors.text,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <Feather name={name} size={size} color={color} accessibilityElementsHidden importantForAccessibility="no" />;
}
