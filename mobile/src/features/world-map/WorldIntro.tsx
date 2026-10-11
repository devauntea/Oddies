import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { researchHref } from '@/features/research';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { colors, radius, spacing, typography } from '@/theme/tokens';

import { breathSecondsFor, findWorld, sceneLayout } from './layout';
import { layerRect, positionOf, rectCenter, waveRange } from './math';
import { LAYER_SOURCES, PORTRAIT_SOURCES } from './sources';
import type { SceneLayer, SceneWorld, Size } from './types';

const { canvas, motion } = sceneLayout;
const NATIVE_DRIVER = Platform.OS !== 'web';
const BASE_Z = Math.min(...sceneLayout.layers.map((layer) => layer.z));
const PORTRAIT_OVERLAP = 18;

function goBack() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/');
  }
}

type Props = { worldId: string | undefined };

/** A world's introduction: its place, the same person in another outfit, one invitation. */
export function WorldIntro({ worldId }: Props) {
  const world = findWorld(worldId);
  if (!world) {
    return (
      <View style={styles.missing}>
        <Text style={styles.invite}>This world is not on your map.</Text>
        <Pressable accessibilityRole="button" onPress={goBack} style={styles.button}>
          <Text style={styles.buttonText}>Back to the map</Text>
        </Pressable>
      </View>
    );
  }
  return <WorldIntroView world={world} />;
}

function WorldIntroView({ world }: { world: SceneWorld }) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const [stage, setStage] = useState<Size | null>(null);
  const [sheetHeight, setSheetHeight] = useState(0);
  const [enter] = useState(() => new Animated.Value(0));
  const [breath] = useState(() => new Animated.Value(0));

  // The personality rises in with the sheet, then breathes at their own pace.
  useEffect(() => {
    if (reduceMotion) {
      enter.setValue(1);
      return;
    }
    const animation = Animated.timing(enter, {
      toValue: 1,
      duration: motion.sheet.durationMs,
      delay: 80,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE_DRIVER,
    });
    animation.start();
    return () => animation.stop();
  }, [enter, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    breath.setValue(0);
    const cycle = Animated.timing(breath, {
      toValue: 1,
      duration: breathSecondsFor(world.outfit) * 1000,
      easing: Easing.linear,
      useNativeDriver: NATIVE_DRIVER,
    });
    const animation = Animated.loop(cycle);
    animation.start();
    return () => animation.stop();
  }, [breath, reduceMotion, world.outfit]);

  const onStageLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setStage({ width, height });
  }, []);

  const onSheetLayout = useCallback((event: LayoutChangeEvent) => {
    setSheetHeight(event.nativeEvent.layout.height);
  }, []);

  const openSteps = useCallback(() => {
    router.push(researchHref({ topic: world.researchTopic, pathId: world.id }));
  }, [world]);

  const rise = enter.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  const sheetMotion = { opacity: enter, transform: [{ translateY: rise }] };

  const breatheTo = motion.breathe.scaleY;
  const portraitHeight = stage ? Math.min(stage.height * 0.92, 360) : 0;
  const portraitWidth = (portraitHeight * world.portraitSize.width) / world.portraitSize.height;
  const pinY = ((1 - breatheTo) * portraitHeight) / 2;
  const portraitBox = {
    bottom: sheetHeight - PORTRAIT_OVERLAP,
    width: portraitWidth,
    height: portraitHeight,
    marginLeft: -portraitWidth / 2,
  };
  const portraitMotion = {
    opacity: enter,
    transform: [
      { translateY: rise },
      { translateY: breath.interpolate(waveRange(0, pinY)) },
      { scaleY: breath.interpolate(waveRange(1, breatheTo)) },
    ],
  };
  const portraitLabel = `${world.personality}: the same you, in ${world.name}`;
  const who = [world.personality, ...world.traits].join(' · ');

  return (
    <View style={styles.screen}>
      <View style={styles.stage} onLayout={onStageLayout}>
        {stage ? <WorldBackdrop world={world} size={stage} /> : null}
      </View>
      <Animated.View
        onLayout={onSheetLayout}
        style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }, sheetMotion]}
      >
        <Text accessibilityRole="header" style={styles.title}>{world.name}</Text>
        <View style={styles.whoRow}>
          <View style={[styles.dot, { backgroundColor: world.accent }]} />
          <Text style={styles.who}>{who}</Text>
        </View>
        <Text style={styles.invite}>{world.invitation}</Text>
        <Text style={styles.routeTitle}>One possible route</Text>
        {world.route.map((step, index) => (
          <View key={step} style={styles.step}>
            <View style={[styles.stepDot, stepDotStyle(index, world.accent)]} />
            <Text style={[styles.stepText, stepTextStyle(index)]}>{step}</Text>
          </View>
        ))}
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={openSteps}
            style={[styles.button, styles.buttonPrimary]}
          >
            <Text style={[styles.buttonText, styles.buttonTextPrimary]}>Find real steps</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={goBack} style={styles.button}>
            <Text style={styles.buttonText}>Back to the map</Text>
          </Pressable>
        </View>
      </Animated.View>
      {stage && sheetHeight > 0 ? (
        <Animated.View style={[styles.portrait, portraitBox, portraitMotion]}>
          <Image
            source={PORTRAIT_SOURCES[world.id]}
            accessible
            accessibilityRole="image"
            accessibilityLabel={portraitLabel}
            style={styles.fill}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

/** The meadow and this world's layer, framed so the world fills the stage like the map zoom. */
function WorldBackdrop({ world, size }: { world: SceneWorld; size: Size }) {
  const { bounds } = world;
  const focus = rectCenter(bounds);
  const k = Math.max(size.width / (bounds.width * 1.04), size.height / bounds.height);
  const shown = (layer: SceneLayer) => layer.z === BASE_Z || layer.id === world.layer;

  return (
    <View style={StyleSheet.absoluteFill}>
      {sceneLayout.layers.filter(shown).map((layer) => {
        const source = LAYER_SOURCES[layer.id];
        if (!source) return null;
        const rect = layerRect(layer, canvas);
        const box = {
          x: (rect.x - focus.x) * k + size.width / 2,
          y: (rect.y - focus.y) * k + size.height * 0.46,
          width: rect.width * k,
          height: rect.height * k,
        };
        return <Image key={layer.id} source={source} style={[styles.layer, positionOf(box)]} />;
      })}
    </View>
  );
}

/** The route is illustrative: where it could start, the next step, then later steps. */
function stepDotStyle(index: number, accent: string) {
  if (index === 0) return { backgroundColor: accent, borderColor: accent };
  if (index === 1) return { backgroundColor: colors.text, borderColor: colors.text };
  return { borderColor: accent };
}

function stepTextStyle(index: number) {
  if (index === 1) return styles.stepNext;
  return index > 1 ? styles.stepLater : null;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  stage: {
    flex: 1,
    overflow: 'hidden',
  },
  layer: {
    position: 'absolute',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  sheet: {
    marginTop: -radius.sheet,
    paddingTop: spacing.xl + spacing.sm,
    paddingHorizontal: spacing.xl,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: colors.background,
  },
  portrait: {
    position: 'absolute',
    left: '50%',
    pointerEvents: 'none',
  },
  title: {
    ...typography.display,
    color: colors.text,
  },
  whoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  who: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  invite: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 23,
    marginBottom: spacing.md,
    color: colors.text,
  },
  routeTitle: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
    color: colors.textMuted,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 3,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  stepText: {
    ...typography.body,
    color: colors.text,
  },
  stepNext: {
    fontWeight: '700',
  },
  stepLater: {
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  button: {
    flexGrow: 1,
    flexBasis: 140,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.text,
    borderRadius: radius.pill,
  },
  buttonPrimary: {
    backgroundColor: colors.text,
  },
  buttonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  buttonTextPrimary: {
    color: colors.background,
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
