/**
 * Design tokens: the single place for colors, spacing and type.
 *
 * PLACEHOLDER until DESIGN.md lands. Values are borrowed from the Odyssey Plan reference art
 * (cream background, green/orange/coral paths). When DESIGN.md arrives, update the values here;
 * components should only read from this file, never hard-code colors or sizes.
 */
export const colors = {
  background: '#F8F1E5',
  surface: '#FFFFFF',
  text: '#1F1F1F',
  textMuted: '#5F5A52',
  border: '#E4DACB',
  /** "Current" path. */
  pathCurrent: '#4CAF6E',
  /** "Alternate" path. */
  pathAlternate: '#F2994A',
  /** "Wildcard" path. */
  pathWildcard: '#EB8475',
  danger: '#B3261E',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 6, md: 12, pill: 999 } as const;

export const typography = {
  title: { fontSize: 24, fontWeight: '700' },
  heading: { fontSize: 18, fontWeight: '700' },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 21 },
  caption: { fontSize: 12, fontWeight: '500' },
} as const;
