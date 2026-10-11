import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme/tokens';

import type { Resource, ResourceKind } from '../types';

const KIND_LABEL: Record<ResourceKind, string> = {
  article: 'Article',
  document: 'Study doc',
  video: 'Video',
  community: 'Community',
  event: 'Event',
};

export interface ResourceListProps {
  resources: Resource[];
  onOpen: (resource: Resource) => void;
}

export function ResourceList({ resources, onOpen }: ResourceListProps) {
  return (
    <View style={styles.list}>
      {resources.map((resource) => (
        <Pressable
          key={resource.id}
          accessibilityRole="link"
          onPress={() => onOpen(resource)}
          style={styles.card}
        >
          <Text style={styles.meta}>
            {KIND_LABEL[resource.kind]} · {resource.source}
          </Text>
          <Text style={styles.title}>{resource.title}</Text>
          {resource.description ? (
            <Text style={styles.description} numberOfLines={3}>
              {resource.description}
            </Text>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  card: {
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  meta: { ...typography.caption, color: colors.textMuted },
  title: { ...typography.body, fontWeight: '600', color: colors.text },
  description: { ...typography.body, color: colors.textMuted },
});
