import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { WORLDS, type WorldId } from '@/features/worlds/core/worlds';
import { colors, scene, spacing, typography } from '@/theme/tokens';
import { Chip } from '@/ui';

import { groupByDay, type Memory } from '../core/memories';
import { memoryActions } from '../memoryStore';
import { MemoryCard } from './MemoryCard';

export interface StoryViewProps {
  memories: Memory[];
}

/** Calm, chronological view of everything the user saved, filterable by world. */
export function StoryView({ memories }: StoryViewProps) {
  const [filter, setFilter] = useState<WorldId | 'all'>('all');
  const groups = useMemo(
    () => groupByDay(filter === 'all' ? memories : memories.filter((m) => m.worldId === filter)),
    [memories, filter],
  );

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        <Chip label="All" selected={filter === 'all'} onPress={() => setFilter('all')} />
        {WORLDS.map((world) => (
          <Chip
            key={world.id}
            label={world.name}
            dot={scene[world.sceneColor]}
            selected={filter === world.id}
            onPress={() => setFilter(world.id)}
          />
        ))}
      </View>

      {groups.length === 0 ? (
        <Text style={styles.empty}>
          Nothing saved here yet. When a moment in a world feels meaningful, save it and it will
          show up here.
        </Text>
      ) : (
        groups.map(({ day, items }) => (
          <View key={day} style={styles.group}>
            <Text style={styles.day} accessibilityRole="header">
              {day}
            </Text>
            {items.map((memory) => (
              <MemoryCard
                key={memory.id}
                memory={memory}
                onEdit={(text) => void memoryActions.edit(memory.id, text)}
                onDelete={() => void memoryActions.remove(memory.id)}
              />
            ))}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  group: { gap: spacing.sm + 4 },
  day: { ...typography.label, color: colors.textMuted },
  empty: { ...typography.body, color: colors.textMuted },
});
