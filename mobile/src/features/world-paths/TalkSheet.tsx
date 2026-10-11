import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PORTRAIT_SOURCES, type SceneWorld } from '@/features/world-map';
import { brand, colors, radius, spacing, typography } from '@/theme/tokens';

import { saveGoalPlan, useGoalProgress } from './progressStore';
import type { Goal, WorldPath } from './types';

const HEAD_WIDTH = 92;
/** Share of the figure's height shown: head and shoulders. */
const HEAD_CROP = 0.3;

type Props = {
  world: SceneWorld;
  path: WorldPath;
  /** The step the answer is saved with: the next one, or the last when the path is complete. */
  goal: Goal | undefined;
  onClose: () => void;
};

/**
 * Talk with this world's version of you. The personality asks one reflection question at a
 * time; the answer is saved in the note of the step you are on. There are no generated replies
 * yet: voice and answers plug in here later.
 */
export function TalkSheet({ world, path, goal, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { progress } = useGoalProgress();
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const prompt = path.prompts[index % Math.max(1, path.prompts.length)] ?? path.speech;
  const figureHeight = (HEAD_WIDTH * world.portraitSize.height) / world.portraitSize.width;

  const save = () => {
    const text = answer.trim();
    if (goal && text) {
      const entry = progress[goal.id];
      const previous = entry?.note ?? '';
      const added = `${prompt}\n${text}`;
      const note = previous ? `${previous}\n\n${added}` : added;
      saveGoalPlan(goal.id, note.slice(0, 4000), entry?.plannedDate ?? '');
    }
    onClose();
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: Math.max(spacing.xl, insets.bottom) }]}>
          <View style={styles.row}>
            <View style={[styles.head, { height: figureHeight * HEAD_CROP }]}>
              <Image
                source={PORTRAIT_SOURCES[world.id]}
                style={{ width: HEAD_WIDTH, height: figureHeight }}
                accessibilityLabel={world.personality}
              />
            </View>
            <View style={styles.bubble}>
              <Text style={styles.who}>{world.personality}</Text>
              <Text style={styles.prompt}>{prompt}</Text>
            </View>
          </View>
          <Pressable
            onPress={() => setIndex((value) => value + 1)}
            style={styles.link}
            accessibilityRole="button"
          >
            <Text style={styles.linkText}>Ask me something else</Text>
          </Pressable>
          <TextInput
            style={styles.input}
            value={answer}
            onChangeText={setAnswer}
            multiline
            maxLength={2000}
            autoFocus
            placeholder="Say it in your own words…"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Your answer"
          />
          <Text style={styles.caption}>
            {goal
              ? `Your answer is saved with “${goal.title}”. Voice replies are coming later.`
              : 'Voice replies are coming later.'}
          </Text>
          <View style={styles.buttons}>
            <Pressable style={styles.secondary} onPress={onClose} accessibilityRole="button">
              <Text style={styles.secondaryText}>Close</Text>
            </Pressable>
            <Pressable style={styles.primary} onPress={save} accessibilityRole="button">
              <Text style={styles.primaryText}>Save answer</Text>
            </Pressable>
          </View>
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
    alignSelf: 'center',
    padding: spacing.xl,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: colors.background,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  head: {
    width: HEAD_WIDTH,
    overflow: 'hidden',
  },
  bubble: {
    flex: 1,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.card + 4,
    backgroundColor: colors.surface,
  },
  who: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textMuted,
  },
  prompt: {
    ...typography.body,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '600',
    marginTop: spacing.xs,
    color: colors.text,
  },
  link: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
  linkText: {
    ...typography.body,
    fontWeight: '700',
    textDecorationLine: 'underline',
    color: colors.text,
  },
  input: {
    ...typography.body,
    fontSize: 16,
    minHeight: 110,
    padding: spacing.md + 2,
    borderWidth: 1,
    borderColor: `${brand.plum}33`,
    borderRadius: radius.card,
    textAlignVertical: 'top',
    color: colors.text,
  },
  caption: {
    ...typography.caption,
    marginTop: spacing.sm,
    color: colors.textMuted,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  primary: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.text,
  },
  primaryText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.background,
  },
  secondary: {
    minWidth: 100,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.text,
    borderRadius: radius.pill,
  },
  secondaryText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text,
  },
});
