/**
 * Système de design « Bahri ».
 *
 * Inspiration : le golfe de Tadjourah — bleu marin profond du large, turquoise
 * des hauts-fonds, blanc cassé de la lumière, sable des plages et des lacs salés.
 * Règles : aplats plutôt que dégradés, une seule couleur d'accent par écran,
 * contraste texte ≥ 4,5:1 (WCAG AA), zones tactiles ≥ 48 px.
 */

export const palette = {
  navy900: '#0B2540',
  navy800: '#123257',
  navy700: '#1B436E',
  navy100: '#E3EAF2',
  teal700: '#0B6E6E',
  teal600: '#0B7A7A',
  teal500: '#169A97',
  teal100: '#D8EFEC',
  sand300: '#E4D3B4',
  sand100: '#F3EADA',
  sand50: '#F8F3EA',
  shell: '#FAF8F4',
  white: '#FFFFFF',
  ink900: '#0F1B2A',
  ink600: '#4B5A6A',
  ink400: '#7D8996',
  line: '#E5E0D6',
  green700: '#1D6F47',
  green100: '#DDF1E6',
  amber700: '#8A4F06',
  amber100: '#FBEBD3',
  red700: '#A8261B',
  red100: '#FBE4E1',
  bronze700: '#6E5320',
} as const;

export const colors = {
  background: palette.shell,
  surface: palette.white,
  surfaceMuted: palette.sand50,
  surfaceBrand: palette.navy900,
  text: palette.ink900,
  textMuted: palette.ink600,
  textSubtle: palette.ink400,
  textOnBrand: palette.white,
  textOnBrandMuted: '#B9C7D6',
  brand: palette.navy900,
  accent: palette.teal600,
  accentPressed: palette.teal700,
  accentSoft: palette.teal100,
  border: palette.line,
  borderStrong: '#CFC8BA',
  focus: palette.teal500,
  success: palette.green700,
  successSoft: palette.green100,
  warning: palette.amber700,
  warningSoft: palette.amber100,
  danger: palette.red700,
  dangerSoft: palette.red100,
  demo: palette.bronze700,
  demoSoft: palette.sand100,
} as const;

export const fontFamilies = {
  display: 'Fraunces_600SemiBold',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
} as const;

export const typography = {
  display: { fontFamily: fontFamilies.display, fontSize: 32, lineHeight: 38, letterSpacing: -0.4 },
  title: { fontFamily: fontFamilies.display, fontSize: 24, lineHeight: 30, letterSpacing: -0.2 },
  heading: { fontFamily: fontFamilies.semibold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fontFamilies.regular, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fontFamilies.semibold, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: fontFamilies.regular, fontSize: 14, lineHeight: 20 },
  smallStrong: { fontFamily: fontFamilies.medium, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fontFamilies.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.6 },
  caption: { fontFamily: fontFamilies.regular, fontSize: 12, lineHeight: 16 },
} as const;

export type TypographyVariant = keyof typeof typography;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
} as const;

/** Taille minimale d'une cible tactile (Material : 48 dp, Apple : 44 pt). */
export const touchTarget = 48;

export const layout = {
  screenPadding: spacing.lg,
  maxContentWidth: 640,
} as const;

/** Ombre unique et discrète, réservée aux éléments flottants. */
export const elevation = {
  raised: {
    shadowColor: palette.navy900,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
} as const;
