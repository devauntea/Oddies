import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { findWorld, type SceneWorld } from '@/features/world-map';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { brand, colors, radius, scene, spacing, typography } from '@/theme/tokens';

import { Companion, companionHeight } from './Companion';
import { findPath } from './data';
import { Glyph } from './Glyph';
import { GoalSheet } from './GoalSheet';
import { completedCount, connections, curveBetween, goalStatus, nextGoal } from './paths';
import { useGoalProgress } from './progressStore';
import { PATH_BACKGROUNDS } from './sources';
import { TalkSheet } from './TalkSheet';
import type { Goal, GoalStatus, Point, WorldPath } from './types';

const NATIVE_DRIVER = Platform.OS !== 'web';
/** Horizontal place of each milestone, as a share of the width, from the past (bottom) up. */
const LANES = [0.42, 0.52, 0.4, 0.5];
const MIN_GAP = 88;
const HEADER_SPACE = 104;
const OPEN_MS = 900;

function goBack() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/');
  }
}

const STATUS_TEXT: Record<GoalStatus, string> = {
  completed: 'Done',
  available: 'Your next step',
  locked: 'Later',
};

type Props = { worldId: string | undefined };

/**
 * A world's path: milestones from what the person has done (bottom) to possible futures (top),
 * joined by dotted trails over the world's meadow. The personality waits in the corner with a
 * speech bubble; the card below holds the next action. It opens with a short zoom that continues
 * the map's camera move.
 */
export function WorldPathScreen({ worldId }: Props) {
  const world = findWorld(worldId);
  const path = findPath(worldId);
  if (!world || !path) {
    return (
      <View style={styles.missing}>
        <Text style={styles.cardBody}>This world is not on your map.</Text>
        <Pressable accessibilityRole="button" onPress={goBack} style={styles.secondary}>
          <Text style={styles.secondaryText}>Back to the map</Text>
        </Pressable>
      </View>
    );
  }
  return <PathView world={world} path={path} />;
}

function PathView({ world, path }: { world: SceneWorld; path: WorldPath }) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const { progress, ready, error } = useGoalProgress();
  const [viewport, setViewport] = useState(0);
  const [cardHeight, setCardHeight] = useState(0);
  const [sheet, setSheet] = useState<{ goal: Goal; focusNote: boolean } | null>(null);
  const [talking, setTalking] = useState(false);
  const [open] = useState(() => new Animated.Value(0));
  const [pulse] = useState(() => new Animated.Value(0));
  const scroll = useRef<ScrollView>(null);

  const width = Math.min(windowWidth, 540);
  const current = nextGoal(path, progress);
  const focusGoal = current ?? path.goals[path.goals.length - 1];
  const done = completedCount(path, progress);

  // Geometry: milestones fill the space between the header and the companion; with little
  // room they keep a minimum gap and the path scrolls instead.
  const node = Math.round(Math.min(64, Math.max(52, width * 0.15)));
  const companionWidth = Math.min(170, width * 0.38);
  const reserve = companionHeight(world, companionWidth) + spacing.sm;
  const top = insets.top + HEADER_SPACE;
  const count = path.goals.length;
  const needed = top + reserve + node + MIN_GAP * Math.max(0, count - 1);
  const contentHeight = Math.max(viewport, needed);
  const firstY = contentHeight - reserve - node / 2;
  const lastY = top + node / 2;
  const gap = count > 1 ? (firstY - lastY) / (count - 1) : 0;
  const points = new Map<string, Point>(
    path.goals.map((goal, index) => [
      goal.id,
      { x: (LANES[index % LANES.length] ?? 0.5) * width, y: firstY - index * gap },
    ]),
  );

  useEffect(() => {
    if (reduceMotion) {
      open.setValue(1);
      return;
    }
    const zoom = Animated.timing(open, {
      toValue: 1,
      duration: OPEN_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE_DRIVER,
    });
    zoom.start();
    return () => zoom.stop();
  }, [open, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    const ring = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: NATIVE_DRIVER,
      }),
    );
    ring.start();
    return () => ring.stop();
  }, [pulse, reduceMotion]);

  // When the path is taller than the screen, start with the next step in view.
  const focusY = focusGoal ? points.get(focusGoal.id)?.y : undefined;
  useEffect(() => {
    if (!viewport || focusY === undefined || contentHeight <= viewport) return;
    const y = Math.max(0, Math.min(focusY - viewport / 2, contentHeight - viewport));
    scroll.current?.scrollTo({ y, animated: false });
  }, [contentHeight, focusY, viewport]);

  const onViewport = (event: LayoutChangeEvent) => setViewport(event.nativeEvent.layout.height);
  const onCard = (event: LayoutChangeEvent) => setCardHeight(event.nativeEvent.layout.height);

  const zoomStyle = {
    opacity: open.interpolate({ inputRange: [0, 0.3], outputRange: [0, 1], extrapolate: 'clamp' }),
    transform: [
      {
        scale: open.interpolate({
          inputRange: [0, 0.55],
          outputRange: [1.12, 1],
          extrapolate: 'clamp',
        }),
      },
    ],
  };
  const trailStyle = {
    opacity: open.interpolate({
      inputRange: [0.3, 0.8],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    }),
  };
  const ringStyle = {
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] }) }],
  };

  const openGoal = (goal: Goal, focusNote = false) => setSheet({ goal, focusNote });

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scroll}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        onLayout={onViewport}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[{ width, height: contentHeight }, zoomStyle]}>
          <Image
            source={PATH_BACKGROUNDS[world.id]}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
          <Animated.View style={[StyleSheet.absoluteFill, styles.passThrough, trailStyle]}>
            <Svg width={width} height={contentHeight}>
              {connections(path).map(({ from, to }) => {
                const a = points.get(from.id);
                const b = points.get(to.id);
                if (!a || !b) return null;
                const walked = progress[from.id]?.completed && progress[to.id]?.completed;
                return (
                  <Path
                    key={`${from.id}-${to.id}`}
                    d={curveBetween(a, b)}
                    fill="none"
                    stroke={walked ? brand.emerald : brand.ivory}
                    strokeWidth={5}
                    strokeDasharray="1 12"
                    strokeLinecap="round"
                  />
                );
              })}
            </Svg>
          </Animated.View>
          {path.goals.map((goal, index) => {
            const point = points.get(goal.id);
            if (!point) return null;
            const status = goalStatus(goal, progress);
            const start = 0.25 + index * 0.12;
            const appear = {
              inputRange: [start, Math.min(1, start + 0.35)],
              extrapolate: 'clamp' as const,
            };
            const popStyle = {
              opacity: open.interpolate({ ...appear, outputRange: [0, 1] }),
              transform: [{ scale: open.interpolate({ ...appear, outputRange: [0.6, 1] }) }],
            };
            const labelLeft = point.x + node / 2 + spacing.sm;
            return (
              <Animated.View
                key={goal.id}
                style={[StyleSheet.absoluteFill, styles.passThrough, popStyle]}
              >
                {status === 'available' ? (
                  <Animated.View
                    style={[
                      styles.ring,
                      {
                        left: point.x - node / 2,
                        top: point.y - node / 2,
                        width: node,
                        height: node,
                        borderRadius: node / 2,
                      },
                      ringStyle,
                    ]}
                  />
                ) : null}
                <Pressable
                  disabled={!ready}
                  onPress={() => openGoal(goal)}
                  accessibilityRole="button"
                  accessibilityLabel={`${goal.title}. ${STATUS_TEXT[status]}`}
                  style={({ pressed }) => [
                    styles.node,
                    nodeLook(status),
                    {
                      left: point.x - node / 2,
                      top: point.y - node / 2,
                      width: node,
                      height: node,
                      borderRadius: node / 2,
                      transform: [{ scale: pressed ? 0.94 : 1 }],
                    },
                  ]}
                >
                  <Glyph
                    name={status === 'completed' ? 'check' : goal.icon}
                    size={Math.round(node * 0.46)}
                    color={status === 'completed' ? brand.ivory : brand.emerald}
                  />
                </Pressable>
                <Pressable
                  disabled={!ready}
                  onPress={() => openGoal(goal)}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  style={[
                    styles.label,
                    {
                      left: labelLeft,
                      top: point.y - 24,
                      maxWidth: width - labelLeft - spacing.md,
                    },
                  ]}
                >
                  <Text style={styles.labelText} numberOfLines={2}>
                    {goal.title}
                  </Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </Animated.View>
      </ScrollView>

      <View style={[styles.header, { top: insets.top + spacing.sm }]}>
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Back to the map"
          style={styles.back}
        >
          <Glyph name="back" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={styles.title} numberOfLines={1}>
            {world.name}
          </Text>
          <Text style={styles.subtitle}>
            {world.personality} · {done} of {count} done
          </Text>
        </View>
        <View style={styles.backSpacer} />
      </View>
      {error ? (
        <Text style={[styles.error, { top: insets.top + HEADER_SPACE - spacing.sm }]}>{error}</Text>
      ) : null}

      {cardHeight > 0 ? (
        <Companion
          world={world}
          speech={current ? path.speech : 'Look at how far you came.'}
          width={companionWidth}
          bottom={cardHeight - spacing.lg}
          onPress={() => setTalking(true)}
        />
      ) : null}

      <View style={[styles.card, { paddingBottom: insets.bottom + spacing.md }]} onLayout={onCard}>
        <View style={styles.cardRow}>
          <View style={styles.cardIcon}>
            <Glyph name={current ? current.icon : 'check'} size={24} color={colors.text} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.eyebrow}>{current ? 'NEXT ACTION' : 'PATH COMPLETE'}</Text>
            <Text style={styles.cardTitle}>
              {current ? current.nextTitle : 'Look at what you built'}
            </Text>
            <Text style={styles.cardBody} numberOfLines={2}>
              {current ? current.action : 'Every step is done. Open any of them to look back.'}
            </Text>
          </View>
        </View>
        <View style={styles.buttons}>
          <Pressable
            disabled={!ready || !focusGoal}
            onPress={() => focusGoal && openGoal(focusGoal)}
            accessibilityRole="button"
            style={styles.primary}
          >
            <Text style={styles.primaryText}>{current ? 'Plan this step' : 'See the path'}</Text>
          </Pressable>
          <Pressable
            disabled={!ready}
            onPress={() => setTalking(true)}
            accessibilityRole="button"
            accessibilityLabel={`Talk with ${world.personality}`}
            style={styles.secondary}
          >
            <Glyph name="mic" size={20} color={colors.text} />
            <Text style={styles.secondaryText}>Talk</Text>
          </Pressable>
        </View>
      </View>

      {sheet ? (
        <GoalSheet
          key={`${sheet.goal.id}-${sheet.focusNote}`}
          world={world}
          path={path}
          goal={sheet.goal}
          focusNote={sheet.focusNote}
          onClose={() => setSheet(null)}
        />
      ) : null}
      {talking ? (
        <TalkSheet world={world} path={path} goal={focusGoal} onClose={() => setTalking(false)} />
      ) : null}
    </View>
  );
}

function nodeLook(status: GoalStatus) {
  if (status === 'completed') return { backgroundColor: brand.emerald, borderColor: brand.ivory };
  if (status === 'available') return { backgroundColor: brand.powder, borderColor: brand.emerald };
  return { backgroundColor: brand.ivory, borderColor: brand.emerald };
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: scene.grassMid,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
  },
  passThrough: {
    pointerEvents: 'box-none',
  },
  header: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.card + 4,
    backgroundColor: brand.ivory,
    shadowColor: colors.text,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  back: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: `${brand.plum}22`,
    backgroundColor: colors.surface,
  },
  backSpacer: {
    width: 44,
  },
  heading: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    ...typography.display,
    fontSize: 26,
    lineHeight: 32,
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  error: {
    ...typography.caption,
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: `${colors.danger}22`,
    color: colors.text,
  },
  ring: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: brand.powder,
  },
  node: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    shadowColor: colors.text,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  label: {
    position: 'absolute',
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.card - 4,
    backgroundColor: `${brand.ivory}F2`,
  },
  labelText: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: colors.text,
  },
  card: {
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: colors.background,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: colors.surface,
  },
  cardText: {
    flex: 1,
  },
  eyebrow: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.textMuted,
  },
  cardTitle: {
    ...typography.display,
    fontSize: 22,
    lineHeight: 27,
    color: colors.text,
  },
  cardBody: {
    ...typography.body,
    color: colors.textMuted,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
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
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
  },
  secondary: {
    minWidth: 104,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.text,
    borderRadius: radius.pill,
  },
  secondaryText: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
});
