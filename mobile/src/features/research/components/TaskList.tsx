import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme/tokens';

import type { ResearchTask, TaskKind } from '../types';

const KIND_LABEL: Record<TaskKind, string> = {
  learn: 'Learn',
  practice: 'Practice',
  conversation: 'Talk to someone',
  experience: 'Go experience it',
  reflect: 'Reflect',
};

export interface TaskListProps {
  tasks: ResearchTask[];
  isDone: (taskId: string) => boolean;
  onToggle: (taskId: string) => void;
  onOpenResource?: (resourceId: string) => void;
}

export function TaskList({ tasks, isDone, onToggle, onOpenResource }: TaskListProps) {
  return (
    <View style={styles.list}>
      {tasks.map((task) => {
        const done = isDone(task.id);
        return (
          <View key={task.id} style={styles.row}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: done }}
              accessibilityLabel={task.title}
              onPress={() => onToggle(task.id)}
              hitSlop={8}
              style={[styles.check, done && styles.checkDone]}
            />
            <View style={styles.body}>
              <Text style={styles.kind}>
                {KIND_LABEL[task.kind]} · {task.estimatedMinutes} min
              </Text>
              <Text style={[styles.title, done && styles.titleDone]}>{task.title}</Text>
              <Text style={styles.detail}>{task.detail}</Text>
              {task.resourceId && onOpenResource ? (
                <Pressable onPress={() => onOpenResource(task.resourceId!)} hitSlop={8}>
                  <Text style={styles.link}>Open resource</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  check: {
    width: 22,
    height: 22,
    marginTop: 2,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.pathCurrent,
  },
  checkDone: { backgroundColor: colors.pathCurrent },
  body: { flex: 1, gap: spacing.xs },
  kind: { ...typography.caption, color: colors.textMuted },
  title: { ...typography.body, fontWeight: '600', color: colors.text },
  titleDone: { textDecorationLine: 'line-through', color: colors.textMuted },
  detail: { ...typography.body, color: colors.textMuted },
  link: { ...typography.caption, color: colors.pathCurrent },
});
