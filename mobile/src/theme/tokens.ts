/**
 * Design tokens: the single place for colors, type, spacing, shape and motion.
 *
 * Source of truth: `temporal/style.md` (Oddies product and visual playbook v1.0) and the
 * product brief next to it. Components read only from this file, never hard-code values.
 */

/** Identity palette (style.md §3, plus emerald and powder blue from the brand brief). */
export const palette = {
  ivory: '#FFF8EF',
  plum: '#352A3D',
  iris: '#B4A0DB',
  saffron: '#D4A04C',
  navy: '#34455E',
  coral: '#E99D8B',
  emerald: '#087A51',
  powder: '#B3D0E6',
} as const;

/** Scene colors for the map and world screens (style.md §3, "Proposed scene tokens"). */
export const scene = {
  grassCenter: '#C4E879',
  grassMid: '#93C873',
  grassEdge: '#60A877',
  path: '#FFE8AA',
  serenity: '#F6D173',
  midnight: '#8198D9',
  artist: '#F4A48D',
  founder: '#BBA0E2',
  shadow: '#284A39',
} as const;

export const colors = {
  /** Screen background behind ivory cards and sheets. */
  background: '#F6EEE2',
  /** Cards, sheets, pills. */
  surface: palette.ivory,
  text: palette.plum,
  textMuted: '#6E6273',
  border: '#E6D9C8',
  /** Primary controls (one per screen) and links. */
  primary: palette.plum,
  onPrimary: palette.ivory,
  /** Selected states and gentle accents. */
  accent: palette.iris,
  /** Completed / confirmed. */
  success: palette.emerald,
  danger: '#B3261E',
  /** Translucent ivory for labels and controls floating over art. */
  overlay: 'rgba(255, 248, 239, 0.92)',
} as const;

/** Loaded in the root layout (see `src/theme/fonts.ts`). */
export const fonts = {
  display: 'Fraunces_600SemiBold',
  body: 'NunitoSans_400Regular',
  bodySemi: 'NunitoSans_600SemiBold',
  bodyBold: 'NunitoSans_700Bold',
} as const;

/** Type scale (style.md §4). Line heights ~1.5 for body. Font family carries the weight. */
export const typography = {
  title: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36 },
  sheetTitle: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30 },
  heading: { fontFamily: fonts.bodyBold, fontSize: 17, lineHeight: 24 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fonts.bodySemi, fontSize: 16, lineHeight: 24 },
  button: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 22 },
  label: { fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
} as const;

/** 8-point rhythm. Screen gutters are `gutter`. */
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 40, gutter: 20 } as const;

export const radius = { sm: 10, card: 18, sheet: 26, pill: 999 } as const;

/** Minimum touch target (style.md §8). */
export const touch = { min: 44 } as const;

/** Soft, consistent shadows. World shadows start light: tune on a real phone. */
export const shadows = {
  card: {
    shadowColor: palette.plum,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  world: {
    shadowColor: scene.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
  },
} as const;

/** Motion (style.md §11): small, slow, purposeful. Durations in ms. */
export const motion = {
  select: 200,
  enterWorld: 550,
  sheet: 280,
  selectScale: 1.02,
  breathMs: 4800,
} as const;
