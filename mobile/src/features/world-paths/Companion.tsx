import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { breathSecondsFor, PORTRAIT_SOURCES, type SceneWorld } from '@/features/world-map';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { brand, colors, radius, spacing, typography } from '@/theme/tokens';

const NATIVE_DRIVER = Platform.OS !== 'web';
/** Share of the full figure that shows above the action card: head and shoulders to the waist. */
export const COMPANION_CROP = 0.5;

/** Height of the visible part of a companion drawn at `width`. */
export function companionHeight(world: SceneWorld, width: number) {
  const { portraitSize } = world;
  return ((width * portraitSize.height) / portraitSize.width) * COMPANION_CROP;
}

type Props = {
  world: SceneWorld;
  speech: string;
  width: number;
  /** Distance from the bottom of the screen to the crop line (just inside the action card). */
  bottom: number;
  onPress: () => void;
};

/**
 * The world's personality in the corner: the same person in this world's outfit, cropped at the
 * waist and tucked behind the action card, with a speech bubble. It slides in after the path
 * opens, breathes at the personality's pace, and the bubble pops whenever its words change.
 * Tapping either opens the conversation.
 */
export function Companion({ world, speech, width, bottom, onPress }: Props) {
  const reduceMotion = useReducedMotion();
  const [enter] = useState(() => new Animated.Value(0));
  const [pop] = useState(() => new Animated.Value(0));
  const [breath] = useState(() => new Animated.Value(0));
  const figureHeight = (width * world.portraitSize.height) / world.portraitSize.width;
  const visible = figureHeight * COMPANION_CROP;

  useEffect(() => {
    if (reduceMotion) {
      enter.setValue(1);
      return;
    }
    const slide = Animated.timing(enter, {
      toValue: 1,
      duration: 420,
      delay: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE_DRIVER,
    });
    slide.start();
    return () => slide.stop();
  }, [enter, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) {
      pop.setValue(1);
      return;
    }
    pop.setValue(0);
    const show = Animated.spring(pop, {
      toValue: 1,
      delay: 520,
      friction: 6,
      tension: 90,
      useNativeDriver: NATIVE_DRIVER,
    });
    show.start();
    return () => show.stop();
  }, [pop, reduceMotion, speech]);

  // Each personality breathes at its own pace (assets/rig/motion-profiles.json).
  const halfBreathMs = (breathSecondsFor(world.outfit) * 1000) / 2;
  useEffect(() => {
    if (reduceMotion) return;
    const half = (to: number) =>
      Animated.timing(breath, {
        toValue: to,
        duration: halfBreathMs,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: NATIVE_DRIVER,
      });
    const loop = Animated.loop(Animated.sequence([half(1), half(0)]));
    loop.start();
    return () => loop.stop();
  }, [breath, halfBreathMs, reduceMotion]);

  // Breathe from the crop line, so the head lifts and the waist stays tucked behind the card.
  const breatheTo = 1.012;
  const pinY = (1 - breatheTo) * (visible - figureHeight / 2);
  const figureMotion = {
    transform: [
      { translateY: breath.interpolate({ inputRange: [0, 1], outputRange: [0, pinY] }) },
      { scaleY: breath.interpolate({ inputRange: [0, 1], outputRange: [1, breatheTo] }) },
    ],
  };
  const slideMotion = {
    opacity: enter,
    transform: [{ translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) }],
  };
  const bubbleMotion = {
    opacity: pop,
    transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
  };

  return (
    <View style={[styles.root, { bottom, height: visible }]}>
      <Animated.View style={slideMotion}>
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`Talk with ${world.personality}`}
          style={{ width, height: visible, overflow: 'hidden' }}
        >
          <Animated.Image
            source={PORTRAIT_SOURCES[world.id]}
            style={[{ width, height: figureHeight }, figureMotion]}
          />
        </Pressable>
      </Animated.View>
      <Animated.View
        style={[styles.bubble, { left: width * 0.8, bottom: visible * 0.42 }, bubbleMotion]}
      >
        <Pressable onPress={onPress} accessibilityRole="button" accessibilityHint="Opens a chat">
          <Text style={styles.speech} numberOfLines={3}>
            {speech}
          </Text>
        </Pressable>
        <View style={styles.tail} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    pointerEvents: 'box-none',
  },
  bubble: {
    position: 'absolute',
    right: 0,
    maxWidth: 230,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.card + 4,
    backgroundColor: brand.ivory,
    shadowColor: colors.text,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  speech: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
    color: colors.text,
  },
  tail: {
    position: 'absolute',
    left: -6,
    bottom: 14,
    width: 12,
    height: 12,
    backgroundColor: brand.ivory,
    transform: [{ rotate: '45deg' }],
  },
});
