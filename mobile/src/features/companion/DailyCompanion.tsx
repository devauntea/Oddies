import { useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { OddieCharacter } from '@/features/character';
// Direct module imports: the world-map index renders this component, so importing it would cycle.
import { findWorld } from '@/features/world-map/layout';
import type { WorldId } from '@/features/world-map/types';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { brand, colors, radius, scene, spacing, typography } from '@/theme/tokens';

import { companionActions, useCompanionState } from './companionStore';
import { dayKey, messageForDay, nextMessage, shouldPopUp, speakingMs } from './core/daily';
import type { CompanionMessage } from './core/messages';

const NATIVE_DRIVER = Platform.OS !== 'web';
/** Wait for the map's arrive animation (~1.1 s) so she doesn't land on a half-built scene. */
const POP_DELAY_MS = 1400;
const CHARACTER_WIDTH = 96;
const PEEK_SIZE = 56;

export interface DailyCompanionProps {
  /** Distance from the bottom of the screen, so she sits above other bottom controls. */
  bottom: number;
  onOpenWorld: (id: WorldId) => void;
}

/**
 * The present self pops up on the home screen once a day with a short affirmation or a small
 * piece of advice, waves and "talks" while the bubble appears. After she's dismissed, a small
 * peek button keeps her one tap away. Content is curated (core/messages.ts), never generated.
 */
export function DailyCompanion({ bottom, onOpenWorld }: DailyCompanionProps) {
  const reduceMotion = useReducedMotion();
  const { state, hydrated } = useCompanionState();
  const today = useMemo(() => dayKey(new Date()), []);
  const [message, setMessage] = useState<CompanionMessage>(() => messageForDay(today));
  const [open, setOpen] = useState(false);
  const [helloId, setHelloId] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  /** Kept true through the close animation, then the bubble unmounts (and leaves the a11y tree). */
  const [mounted, setMounted] = useState(false);
  const [progress] = useState(() => new Animated.Value(0));

  /** Shows `next`: she waves, "talks" for a reading-length beat, and screen readers hear it. */
  const say = (next: CompanionMessage) => {
    setMessage(next);
    setMounted(true);
    setOpen(true);
    setHelloId((n) => n + 1);
    setSpeaking(true);
    AccessibilityInfo.announceForAccessibility(next.text);
  };
  const close = () => {
    setOpen(false);
    setSpeaking(false);
  };

  // Pop up by herself once a day.
  useEffect(() => {
    if (!hydrated || !shouldPopUp(state, today)) return;
    const timer = setTimeout(() => {
      say(messageForDay(today));
      void companionActions.markShown(today);
    }, POP_DELAY_MS);
    return () => clearTimeout(timer);
  }, [hydrated, state, today]);

  // Slide in or out.
  useEffect(() => {
    Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: reduceMotion ? 160 : open ? 420 : 260,
      easing: open ? Easing.out(Easing.back(1.2)) : Easing.in(Easing.quad),
      useNativeDriver: NATIVE_DRIVER,
    }).start(({ finished }) => {
      if (finished && !open) setMounted(false);
    });
  }, [open, progress, reduceMotion]);

  // Stop "talking" once the message has had time to be read.
  useEffect(() => {
    if (!speaking) return;
    const timer = setTimeout(() => setSpeaking(false), speakingMs(message.text));
    return () => clearTimeout(timer);
  }, [speaking, message]);

  const world = message.worldId ? findWorld(message.worldId) : undefined;
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [reduceMotion ? 0 : 260, 0],
  });

  return (
    <>
      {!open ? (
        <Pressable
          onPress={() => say(message)}
          accessibilityRole="button"
          accessibilityLabel="Open today's thought"
          style={[styles.peek, { bottom }]}
          hitSlop={8}
        >
          <View style={styles.peekCrop}>
            <OddieCharacter width={PEEK_SIZE * 1.15} active={false} style={styles.peekCharacter} />
          </View>
        </Pressable>
      ) : null}

      {mounted ? (
        <Animated.View
          style={[
            styles.popup,
            { bottom, opacity: progress, transform: [{ translateY }] },
            !open && styles.hidden,
          ]}
          accessibilityViewIsModal={open}
        >
          <OddieCharacter
            width={CHARACTER_WIDTH}
            helloId={helloId}
            speaking={speaking}
            active={open}
          />
          <View style={styles.bubble} accessibilityLiveRegion="polite">
            <View style={styles.tail} />
            <View style={styles.eyebrowRow}>
              <View style={[styles.dot, { backgroundColor: world?.accent ?? brand.iris }]} />
              <Text style={styles.eyebrow}>
                {message.kind === 'affirmation' ? 'For you today' : 'A small step'}
                {world ? ` · ${world.name}` : ''}
              </Text>
            </View>
            <Text style={styles.message}>{message.text}</Text>

            <View style={styles.actions}>
              <ActionButton label="Thanks" primary onPress={close} />
              <ActionButton label="Another" onPress={() => say(nextMessage(message))} />
              {world ? (
                <ActionButton
                  label={`Visit ${world.name}`}
                  onPress={() => {
                    close();
                    onOpenWorld(world.id);
                  }}
                />
              ) : null}
            </View>

            <Pressable
              onPress={() => void companionActions.setEnabled(!state.enabled)}
              accessibilityRole="switch"
              accessibilityState={{ checked: state.enabled }}
              hitSlop={8}
            >
              <Text style={styles.setting}>
                {state.enabled ? 'Turn off the daily pop-up' : 'Pop up once a day again'}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : null}
    </>
  );
}

function ActionButton({
  label,
  onPress,
  primary,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.action,
        primary && styles.actionPrimary,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.actionText, primary && styles.actionTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  popup: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  hidden: { pointerEvents: 'none' },
  bubble: {
    flex: 1,
    gap: spacing.sm,
    marginBottom: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.sheet,
    borderBottomLeftRadius: radius.sm,
    backgroundColor: colors.background,
    shadowColor: scene.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  tail: {
    position: 'absolute',
    left: -6,
    bottom: 10,
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: colors.background,
    transform: [{ rotate: '45deg' }],
  },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  eyebrow: { ...typography.caption, color: colors.textMuted },
  message: { ...typography.display, fontSize: 19, lineHeight: 26, color: colors.text },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  actionPrimary: { backgroundColor: colors.text, borderColor: colors.text },
  pressed: { opacity: 0.8 },
  actionText: { ...typography.body, fontWeight: '600', color: colors.text },
  actionTextPrimary: { color: colors.background },
  setting: { ...typography.caption, color: colors.textMuted, textDecorationLine: 'underline' },
  peek: {
    position: 'absolute',
    left: spacing.lg,
    width: PEEK_SIZE,
    height: PEEK_SIZE,
    borderRadius: PEEK_SIZE / 2,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: brand.iris,
    shadowColor: scene.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  peekCrop: { flex: 1, borderRadius: PEEK_SIZE / 2, overflow: 'hidden', alignItems: 'center' },
  peekCharacter: { marginTop: 2 },
});
