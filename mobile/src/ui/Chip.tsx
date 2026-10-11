import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, touch, typography } from '@/theme/tokens';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Optional color dot, e.g. a world's color. */
  dot?: string;
  accessibilityLabel?: string;
}

export function Chip({ label, selected, onPress, dot, accessibilityLabel }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel}
      style={[styles.chip, selected && styles.selected]}
    >
      {dot ? <View style={[styles.dot, { backgroundColor: dot }]} /> : null}
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: touch.min - 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selected: { borderColor: colors.accent, backgroundColor: '#F1EAFA' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { ...typography.label, color: colors.text },
});
