import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, spacing, touch, typography } from '@/theme/tokens';

import type { ResearchTask } from '../types';
import { Pill, PillButton, TASK_KIND } from './parts';

export interface TaskListProps {
  tasks: ResearchTask[];
  isDone: (taskId: string) => boolean;
  onToggle: (taskId: string) => void;
  onOpenResource?: (resourceId: string) => void;
  /** Button text for a task's resource, e.g. "Watch" for a video. Defaults to "Open". */
  actionLabel?: (resourceId: string) => string;
  /** Quieter cards, for "For later". */
  muted?: boolean;
}

/** Today's steps as cards: tick it off, see what kind of step it is, open what it's built on. */
export function TaskList({
  tasks,
  isDone,
  onToggle,
  onOpenResource,
  actionLabel,
  muted,
}: TaskListProps) {
  return (
    <View style={styles.list}>
      {tasks.map((task) => {
        const done = isDone(task.id);
        const kind = TASK_KIND[task.kind];
        return (
          <View key={task.id} style={[styles.card, muted && styles.cardMuted]}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: done }}
              accessibilityLabel={`${task.title}, ${done ? 'done' : 'not done'}`}
              onPress={() => onToggle(task.id)}
              style={styles.checkTarget}
            >
              <View style={[styles.check, done && styles.checkDone]}>
                {done ? <Text style={styles.checkMark}>✓</Text> : null}
              </View>
            </Pressable>
            <View style={styles.body}>
              <View style={styles.metaRow}>
                <Pill label={kind.label} color={kind.color} />
                <Text style={styles.minutes}>{task.estimatedMinutes} min</Text>
              </View>
              <Text style={[styles.title, done && styles.titleDone]}>{task.title}</Text>
              <Text style={styles.detail}>{task.detail}</Text>
              {task.resourceId && onOpenResource ? (
                <View style={styles.action}>
                  <PillButton
                    compact
                    label={actionLabel?.(task.resourceId) ?? 'Open'}
                    accessibilityLabel={`${actionLabel?.(task.resourceId) ?? 'Open'}: ${task.title}`}
                    onPress={() => onOpenResource(task.resourceId!)}
                  />
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const CHECK = 28;

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  card: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingRight: spacing.lg,
    paddingLeft: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardMuted: { backgroundColor: colors.background, shadowOpacity: 0, elevation: 0 },
  checkTarget: {
    width: touch.min,
    height: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -spacing.sm,
  },
  check: {
    width: CHECK,
    height: CHECK,
    borderRadius: CHECK / 2,
    borderWidth: 2,
    borderColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: { backgroundColor: colors.text },
  checkMark: { ...typography.label, fontWeight: '800', color: colors.onPrimary },
  body: { flex: 1, gap: spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  minutes: { ...typography.label, color: colors.textMuted },
  title: { ...typography.bodyStrong, color: colors.text },
  titleDone: { textDecorationLine: 'line-through', color: colors.textMuted },
  detail: { ...typography.body, color: colors.textMuted },
  action: { marginTop: spacing.xs },
});
