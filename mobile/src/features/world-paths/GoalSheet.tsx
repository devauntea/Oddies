import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { openResource, researchHref, type Resource } from '@/features/research';
import type { SceneWorld } from '@/features/world-map';
import { brand, colors, radius, spacing, typography } from '@/theme/tokens';

import { GoalTasks } from './GoalTasks';
import { emptyEntry, goalStatus, validPlannedDate } from './paths';
import { completeGoal, saveGoalPlan, useGoalProgress } from './progressStore';
import type { Goal, WorldPath } from './types';

type Props = {
  world: SceneWorld;
  path: WorldPath;
  goal: Goal;
  /** Open with the note focused, to collect what the person wants to change. */
  focusNote?: boolean;
  onClose: () => void;
};

/**
 * One milestone up close: what it means, one concrete action, task suggestions from live Nimble
 * research, a plan date and a note.
 */
export function GoalSheet({ world, path, goal, focusNote = false, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { progress } = useGoalProgress();
  const entry = progress[goal.id] ?? emptyEntry();
  const status = goalStatus(goal, progress);
  const [note, setNote] = useState(entry.note);
  const [date, setDate] = useState(entry.plannedDate);
  const [error, setError] = useState('');
  const pending = path.goals.filter(
    (item) => goal.requires.includes(item.id) && !progress[item.id]?.completed,
  );

  const save = () => {
    const value = date.trim();
    if (!validPlannedDate(value)) {
      setError('Write the date as YYYY-MM-DD, or leave it empty.');
      return false;
    }
    saveGoalPlan(goal.id, note.trim(), value);
    return true;
  };

  const saveAndClose = () => {
    if (save()) onClose();
  };

  const toggleDone = () => {
    if (!save()) return;
    completeGoal(path.worldId, goal.id, status !== 'completed');
    onClose();
  };

  // Leaving the sheet for research keeps what was typed so far.
  const seeAllResearch = () => {
    if (!save()) return;
    onClose();
    router.push(researchHref({ topic: goal.research, goal: goal.title, pathId: goal.id }));
  };

  const openTaskResource = (resource: Resource) => {
    if (!save()) return;
    onClose();
    openResource(resource);
  };

  const statusLabel =
    status === 'completed' ? 'DONE' : status === 'available' ? 'YOUR NEXT STEP' : 'LATER ON';
  const doneLabel =
    status === 'completed'
      ? 'Mark as not done'
      : status === 'available'
        ? 'I did this'
        : 'Finish the step before first';

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: Math.max(spacing.xl, insets.bottom) }]}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={styles.topRow}>
              <Text style={styles.eyebrow}>{statusLabel}</Text>
              <Pressable
                onPress={onClose}
                style={styles.close}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>
            <Text style={styles.title}>{goal.title}</Text>
            <Text style={styles.body}>{goal.description}</Text>
            <View style={[styles.action, { borderColor: world.accent }]}>
              <Text style={styles.label}>One concrete action</Text>
              <Text style={styles.body}>{goal.action}</Text>
            </View>
            {pending.length > 0 ? (
              <Text style={styles.hint}>
                First: {pending.map((item) => item.title).join(', ')}.
              </Text>
            ) : null}
            <Text style={styles.label}>Real steps for today</Text>
            <GoalTasks goal={goal} onOpenResource={openTaskResource} onSeeAll={seeAllResearch} />
            <Text style={styles.label}>Plan date</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={(value) => {
                setDate(value);
                setError('');
              }}
              placeholder="YYYY-MM-DD · optional"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              maxLength={10}
              accessibilityLabel="Plan date"
            />
            <Text style={styles.label}>
              {focusNote ? 'What would you like to change about this step?' : 'Your note'}
            </Text>
            <TextInput
              style={[styles.input, styles.note]}
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={4000}
              autoFocus={focusNote}
              placeholder="What you already did, what you learned, or what you want to change…"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Note"
            />
            {error ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            ) : null}
            <Pressable style={styles.primary} onPress={saveAndClose} accessibilityRole="button">
              <Text style={styles.primaryText}>Save plan</Text>
            </Pressable>
            <Pressable
              style={[styles.secondary, status === 'locked' && styles.disabled]}
              disabled={status === 'locked'}
              onPress={toggleDone}
              accessibilityRole="button"
              accessibilityState={{ disabled: status === 'locked' }}
            >
              <Text style={styles.secondaryText}>{doneLabel}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: `${brand.plum}55`,
  },
  sheet: {
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    alignSelf: 'center',
    padding: spacing.xl,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: colors.background,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.textMuted,
  },
  close: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 28,
    color: colors.text,
  },
  title: {
    ...typography.display,
    fontSize: 28,
    marginBottom: spacing.sm,
    color: colors.text,
  },
  body: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 23,
    color: colors.text,
  },
  action: {
    marginVertical: spacing.md,
    padding: spacing.lg,
    borderLeftWidth: 4,
    borderRadius: radius.card,
    backgroundColor: `${brand.powder}44`,
  },
  label: {
    ...typography.body,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    color: colors.text,
  },
  hint: {
    ...typography.body,
    marginBottom: spacing.sm,
    color: colors.textMuted,
  },
  input: {
    ...typography.body,
    fontSize: 16,
    padding: spacing.md + 2,
    borderWidth: 1,
    borderColor: `${brand.plum}33`,
    borderRadius: radius.card,
    color: colors.text,
  },
  note: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  error: {
    ...typography.body,
    marginTop: spacing.sm,
    color: colors.danger,
  },
  primary: {
    alignItems: 'center',
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.text,
  },
  primaryText: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
  },
  secondary: {
    alignItems: 'center',
    marginTop: spacing.sm,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.text,
    borderRadius: radius.pill,
  },
  secondaryText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text,
  },
  disabled: {
    opacity: 0.5,
  },
});
