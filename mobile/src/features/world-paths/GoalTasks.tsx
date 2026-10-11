import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  TaskList,
  useResearch,
  useTaskProgress,
  type ResearchRequest,
  type Resource,
} from '@/features/research';
import { colors, spacing, typography } from '@/theme/tokens';

import type { Goal } from './types';

/** How many suggestions show in the sheet; the full research screen has the rest. */
const SHOWN = 3;

type Props = {
  goal: Goal;
  /** The world this goal belongs to; research screens wear that world's colors. */
  worldId: string;
  /** Opens a resource (reader or browser). The sheet closes itself first. */
  onOpenResource: (resource: Resource) => void;
  /** Opens the full research pack for this goal. */
  onSeeAll: () => void;
};

/**
 * Task suggestions for one milestone, from live Nimble research on the goal's topic. Uses the
 * research feature's caches (last pack on the device, 30 minutes on the server) and its shared
 * task checklist, so ticking a task here also ticks it on the research screen.
 */
export function GoalTasks({ goal, worldId, onOpenResource, onSeeAll }: Props) {
  // Same request as the full research screen opened from this goal, so both share one pack.
  const request = useMemo<ResearchRequest>(
    () => ({ topic: goal.research, goal: goal.title, pathId: worldId }),
    [goal.research, goal.title, worldId],
  );
  const research = useResearch(request);
  const { isDone, toggle } = useTaskProgress();
  const pack = research.status === 'success' ? research.data : null;

  if (!pack) {
    if (research.status === 'error') {
      return (
        <View style={styles.box}>
          <Text style={styles.muted}>Real steps could not load: {research.error}</Text>
          <Pressable onPress={research.reload} accessibilityRole="button" style={styles.link}>
            <Text style={styles.linkText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={[styles.box, styles.loading]}>
        <ActivityIndicator color={colors.success} />
        <Text style={styles.muted}>Finding real steps for “{goal.title}”…</Text>
      </View>
    );
  }

  const byId = new Map(pack.resources.map((resource) => [resource.id, resource]));
  const openById = (id: string) => {
    const resource = byId.get(id);
    if (resource) onOpenResource(resource);
  };

  return (
    <View style={styles.box}>
      {pack.source === 'mock' ? (
        <Text style={styles.notice}>Sample tasks: live research needs NIMBLE_API_KEY.</Text>
      ) : null}
      {research.offlineError ? (
        <Text style={styles.notice}>Showing your saved copy. Could not refresh.</Text>
      ) : null}
      <TaskList
        tasks={pack.tasks.slice(0, SHOWN)}
        isDone={isDone}
        onToggle={toggle}
        onOpenResource={openById}
      />
      <Pressable onPress={onSeeAll} accessibilityRole="link" style={styles.link}>
        <Text style={styles.linkText}>
          See all {pack.tasks.length} tasks and {pack.resources.length} resources
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: spacing.sm,
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  muted: {
    ...typography.body,
    flexShrink: 1,
    color: colors.textMuted,
  },
  notice: {
    ...typography.caption,
    color: colors.textMuted,
  },
  link: {
    minHeight: 44,
    justifyContent: 'center',
  },
  linkText: {
    ...typography.body,
    fontWeight: '700',
    textDecorationLine: 'underline',
    color: colors.text,
  },
});
