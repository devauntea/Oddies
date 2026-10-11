import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, spacing, touch, typography } from '@/theme/tokens';

import type { Resource } from '../types';
import { Pill, RESOURCE_KIND } from './parts';

export interface ResourceListProps {
  resources: Resource[];
  onOpen: (resource: Resource) => void;
}

/** The day's sources in one card: what kind it is, where it's from, and what it's about. */
export function ResourceList({ resources, onOpen }: ResourceListProps) {
  return (
    <View style={styles.card}>
      {resources.map((resource, index) => {
        const kind = RESOURCE_KIND[resource.kind];
        return (
          <Pressable
            key={resource.id}
            accessibilityRole="link"
            accessibilityLabel={`${kind.action} ${resource.title}, ${kind.label} on ${resource.source}`}
            onPress={() => onOpen(resource)}
            style={({ pressed }) => [
              styles.row,
              index > 0 && styles.divider,
              pressed && styles.rowPressed,
            ]}
          >
            <View style={styles.body}>
              <View style={styles.metaRow}>
                <Pill label={kind.label} color={kind.color} />
                <Text style={styles.source} numberOfLines={1}>
                  {resource.source}
                </Text>
              </View>
              <Text style={styles.title} numberOfLines={2}>
                {resource.title}
              </Text>
              {resource.description ? (
                <Text style={styles.description} numberOfLines={2}>
                  {resource.description}
                </Text>
              ) : null}
            </View>
            <Text style={styles.chevron} importantForAccessibility="no">
              ›
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touch.min,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  rowPressed: { backgroundColor: colors.accentSoft },
  body: { flex: 1, gap: spacing.xs + 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  source: { ...typography.label, fontWeight: '400', color: colors.textMuted, flexShrink: 1 },
  title: { ...typography.bodyStrong, color: colors.text },
  description: { ...typography.body, color: colors.textMuted },
  chevron: { ...typography.sheetTitle, color: colors.textMuted },
});
