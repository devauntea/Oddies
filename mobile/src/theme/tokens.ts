import { Platform } from 'react-native';

/**
 * Design tokens: the single place for colors, spacing and type.
 *
 * Values follow the Oddies playbook (`assets/docs/style.md`). `brand` and `scene` mirror
 * `assets/tokens.json`, which the web app shares; a test keeps the two in sync. Components should
 * only read from this file, never hard-code colors or sizes.
 */
export const brand = {
  ivory: '#FFF8EF',
  plum: '#352A3D',
  iris: '#B4A0DB',
  saffron: '#D4A04C',
  navy: '#34455E',
  coral: '#E99D8B',
  /** From the product brief: completed milestones. */
  emerald: '#087A51',
  /** From the product brief: the next milestone. */
  powder: '#B3D0E6',
} as const;

export const scene = {
  grassCenter: '#C4E879',
  grassMid: '#93C873',
  grassEdge: '#60A877',
  grassTopEdge: '#4FB56C',
  grassBottomEdge: '#3EAC6C',
  path: '#FFE8AA',
  serenity: '#F6D173',
  midnight: '#8198D9',
  artist: '#F4A48D',
  founder: '#BBA0E2',
  shadow: '#284A39',
} as const;

export const colors = {
  background: brand.ivory,
  surface: '#FFFFFF',
  text: brand.plum,
  textMuted: '#6B5F70',
  /** Text and icons drawn over the map art. */
  textOnArt: brand.ivory,
  border: '#E8DCCB',
  accent: brand.iris,
  success: brand.emerald,
  /** Selected chips, notices and pressed rows: a pale iris (the web app's --iris-soft). */
  accentSoft: '#E6DEF5',
  /** Text on plum buttons. */
  onPrimary: brand.ivory,

  /** "Current" path. */
  pathCurrent: '#4CAF6E',
  /** "Alternate" path. */
  pathAlternate: '#F2994A',
  /** "Wildcard" path. */
  pathWildcard: '#EB8475',
  danger: '#B3261E',
} as const;

/** Fraunces and Nunito Sans when loaded on web; close system fallbacks on iOS and Android. */
export const fonts = {
  display: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    default: 'Fraunces, Georgia, serif',
  }),
  body: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'Nunito Sans, system-ui',
  }),
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 6, md: 12, card: 18, sheet: 26, pill: 999 } as const;

export const typography = {
  display: { fontFamily: fonts.display, fontSize: 30, fontWeight: '600', lineHeight: 36 },
  /** Sheet and section titles (style.md §4: Fraunces 22-26). */
  sheetTitle: { fontFamily: fonts.display, fontSize: 24, fontWeight: '600', lineHeight: 30 },
  title: { fontSize: 24, fontWeight: '700' },
  heading: { fontSize: 18, fontWeight: '700' },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 21 },
  /** Reading text: style.md asks for 16-17 with ~1.5 line spacing. */
  reading: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodyStrong: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
  /** Buttons and navigation (Nunito Sans 600, 15-16). */
  button: { fontSize: 15, fontWeight: '600', lineHeight: 20 },
  /** Supporting labels (13-14). */
  label: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  /** Small uppercase section labels, as on the world intro sheet. */
  overline: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  caption: { fontSize: 12, fontWeight: '500' },
} as const;

/** Minimum touch target (style.md §8). */
export const touch = { min: 44 } as const;

/** Soft, light shadows in the meadow's shadow green (style.md §3: 8-12% opacity). */
export const shadows = {
  card: {
    shadowColor: scene.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
} as const;
