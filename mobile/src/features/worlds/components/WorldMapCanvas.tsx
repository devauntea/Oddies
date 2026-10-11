import { useEffect, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  colors,
  motion,
  palette,
  radius,
  scene,
  shadows,
  spacing,
  typography,
} from '@/theme/tokens';
import { useReducedMotion } from '@/theme/useReducedMotion';

import { WORLDS, type WorldId } from '../core/worlds';
import { CANVAS_ASPECT, SCENE_LAYERS, type SceneLayer } from './mapScene';

export interface WorldMapCanvasProps {
  /** Rendered width in points. Height follows the 2:3 canvas. */
  width: number;
  onSelectWorld: (id: WorldId) => void;
}

const WORLD_IDS = new Set<string>(WORLDS.map((w) => w.id));

/**
 * The personal map (style.md §7-8): one parent coordinates every art layer on a uniform scale.
 * Worlds are whole tappable regions with a light selected emphasis; labels are live text, never
 * baked into the art; the central character breathes gently unless Reduce Motion is on.
 */
export function WorldMapCanvas({ width, onSelectWorld }: WorldMapCanvasProps) {
  const height = width * CANVAS_ASPECT;
  const reduceMotion = useReducedMotion();
  const [selected, setSelected] = useState<WorldId | null>(null);

  const rect = (layer: SceneLayer) => ({
    left: layer.left * width,
    top: layer.top * height,
    width: layer.width * width,
    height: layer.height * height,
  });

  const select = (id: WorldId) => {
    if (selected) return;
    setSelected(id);
    // Let the emphasis read before the scene changes (style.md §11: 160-220 ms).
    setTimeout(
      () => {
        setSelected(null);
        onSelectWorld(id);
      },
      reduceMotion ? 0 : motion.select,
    );
  };

  return (
    <View style={[styles.canvas, { width, height }]} accessibilityRole="none">
      {SCENE_LAYERS.map((layer) => {
        if (WORLD_IDS.has(layer.id)) {
          return (
            <WorldRegion
              key={layer.id}
              layer={layer}
              frame={rect(layer)}
              selected={selected === layer.id}
              reduceMotion={reduceMotion}
              onPress={() => select(layer.id as WorldId)}
            />
          );
        }
        if (layer.id === 'character') {
          return (
            <CentralAvatar key={layer.id} layer={layer} frame={rect(layer)} still={reduceMotion} />
          );
        }
        return (
          <View key={layer.id} style={[styles.layer, styles.passThrough, rect(layer)]}>
            <Image source={layer.source} style={styles.fill} accessible={false} />
          </View>
        );
      })}

      {SCENE_LAYERS.filter((l) => WORLD_IDS.has(l.id)).map((layer) => {
        const world = WORLDS.find((w) => w.id === layer.id)!;
        const frame = rect(layer);
        return (
          <WorldLabel
            key={`label-${world.id}`}
            name={world.name}
            dot={scene[world.sceneColor]}
            centerX={frame.left + frame.width / 2}
            top={frame.top + frame.height * 0.86}
          />
        );
      })}
    </View>
  );
}

function WorldRegion({
  layer,
  frame,
  selected,
  reduceMotion,
  onPress,
}: {
  layer: SceneLayer;
  frame: { left: number; top: number; width: number; height: number };
  selected: boolean;
  reduceMotion: boolean;
  onPress: () => void;
}) {
  const scale = useState(() => new Animated.Value(1))[0];
  const world = WORLDS.find((w) => w.id === layer.id)!;

  useEffect(() => {
    if (reduceMotion) return;
    Animated.timing(scale, {
      toValue: selected ? motion.selectScale : 1,
      duration: motion.select,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [selected, reduceMotion, scale]);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${world.name}, ${world.version}. ${world.theme}.`}
      accessibilityHint="Opens this world"
      style={[styles.layer, frame]}
    >
      <Animated.Image
        source={layer.source}
        style={[styles.fill, selected && styles.selectedShadow, { transform: [{ scale }] }]}
      />
    </Pressable>
  );
}

function CentralAvatar({
  layer,
  frame,
  still,
}: {
  layer: SceneLayer;
  frame: { left: number; top: number; width: number; height: number };
  still: boolean;
}) {
  const breath = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    if (still) {
      breath.setValue(0);
      return;
    }
    const half = motion.breathMs / 2;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: half,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: half,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [still, breath]);

  // Feet stay grounded: scale a hair from the bottom instead of floating the whole sprite.
  const scaleY = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.008] });
  const translateY = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -frame.height * 0.004],
  });

  return (
    <Animated.View
      style={[styles.layer, styles.passThrough, frame, { transform: [{ translateY }, { scaleY }] }]}
    >
      <Image source={layer.source} style={styles.fill} accessibilityLabel="You, today" />
    </Animated.View>
  );
}

function WorldLabel({
  name,
  dot,
  centerX,
  top,
}: {
  name: string;
  dot: string;
  centerX: number;
  top: number;
}) {
  const [labelWidth, setLabelWidth] = useState(0);
  return (
    <View
      onLayout={(e) => setLabelWidth(e.nativeEvent.layout.width)}
      style={[
        styles.label,
        styles.passThrough,
        { top, left: centerX - labelWidth / 2, opacity: labelWidth ? 1 : 0 },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: dot }]} />
      <Text style={styles.labelText}>{name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { position: 'relative', overflow: 'hidden', backgroundColor: scene.grassMid },
  layer: { position: 'absolute' },
  passThrough: { pointerEvents: 'none' },
  fill: { width: '100%', height: '100%' },
  selectedShadow: shadows.world,
  label: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.pill,
    backgroundColor: colors.overlay,
    ...shadows.card,
  },
  dot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: palette.ivory },
  labelText: { ...typography.label, color: colors.text },
});
