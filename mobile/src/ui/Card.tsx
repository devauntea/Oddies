import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadows, spacing, typography } from '@/theme/tokens';

export interface CardProps {
  title?: string;
  /** Small line above the title, e.g. "Next action". */
  eyebrow?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Card({ title, eyebrow, children, style }: CardProps) {
  return (
    <View style={[styles.card, style]}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      {title ? (
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.md + 4,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  eyebrow: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: { ...typography.sheetTitle, color: colors.text },
});
