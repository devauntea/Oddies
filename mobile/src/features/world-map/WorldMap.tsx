import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import {
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radius, spacing, typography } from '@/theme/tokens';

import { findWorld, sceneLayout } from './layout';
import {
  cameraOffset,
  layerRect,
  pivotTranslation,
  positionOf,
  scaleRect,
  waveRange,
} from './math';
import { LAYER_SOURCES } from './sources';
import type { Rect, SceneLayer, WorldId } from './types';
import { useReducedMotion } from './useReducedMotion';

type AnimatedStyle = ComponentProps<typeof Animated.View>['style'];
type Layer = { layer: SceneLayer; source: ImageSourcePropType; rect: Rect };

const { canvas, character, motion, worlds } = sceneLayout;
const LABEL_SLOT = 240;

/** Loops run on the UI thread natively. react-native-web has no native driver. */
const NATIVE_DRIVER = Platform.OS !== 'web';

/** Layers in draw order, each with its bundled image and its box in canvas units. */
const sortedLayers = [...sceneLayout.layers].sort((a, b) => a.z - b.z);
const LAYERS: Layer[] = sortedLayers.flatMap((layer) => {
  const source = LAYER_SOURCES[layer.id];
  return source ? [{ layer, source, rect: layerRect(layer, canvas) }] : [];
});

const ARRIVE_TOTAL = motion.arrive.durationMs + motion.arrive.staggerMs * (LAYERS.length - 1);

function tween(value: Animated.Value, to: number, ms: number, easing = Easing.linear) {
  return Animated.timing(value, {
    toValue: to,
    duration: ms,
    easing,
    useNativeDriver: NATIVE_DRIVER,
  });
}

/** Maps a 0..1 driver onto from..to. */
function lerp(value: Animated.Value, from: number, to: number) {
  return value.interpolate({ inputRange: [0, 1], outputRange: [from, to] });
}

function labelPosition(bounds: Rect, k: number) {
  return {
    left: (bounds.x + bounds.width / 2) * k - LABEL_SLOT / 2,
    top: (bounds.y + bounds.height) * k - spacing.xl,
  };
}

type Props = {
  /** Screen points per canvas unit, from fitCanvas(). */
  scale: number;
  /** Called when the zoom into a world has finished. Navigate from here. */
  onEnterWorld: (id: WorldId) => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * The home map: the present self among four worlds, stacked from separate layers with the
 * transforms in assets/scene-layout.json. Idle: the character breathes and the worlds drift.
 * Tap a world: it lifts, the camera zooms into it, then `onEnterWorld` fires. When the screen
 * is focused again the camera eases back out. Reduce Motion keeps the scene still.
 */
export function WorldMap({ scale: k, onEnterWorld, style }: Props) {
  const reduceMotion = useReducedMotion();
  const [arrive] = useState(() => new Animated.Value(0));
  const [bob] = useState(() => new Animated.Value(0));
  const [breath] = useState(() => new Animated.Value(0));
  const [hello] = useState(() => new Animated.Value(0));
  const [select] = useState(() => new Animated.Value(0));
  const [camera] = useState(() => new Animated.Value(0));
  const [selected, setSelected] = useState<WorldId | null>(null);
  const [loaded, setLoaded] = useState(0);
  const busy = useRef(false);
  const entered = useRef<WorldId | null>(null);

  // Arrive once every layer has loaded, so the scene never assembles piecemeal.
  const ready = loaded >= LAYERS.length;
  const onLayerLoaded = useCallback(() => setLoaded((count) => count + 1), []);
  useEffect(() => {
    const fallback = setTimeout(() => setLoaded(LAYERS.length), 1500);
    return () => clearTimeout(fallback);
  }, []);
  useEffect(() => {
    if (!ready) return;
    if (reduceMotion) {
      arrive.setValue(1);
      return;
    }
    const animation = tween(arrive, 1, ARRIVE_TOTAL);
    animation.start();
    return () => animation.stop();
  }, [arrive, ready, reduceMotion]);

  useFocusEffect(
    useCallback(() => {
      const loops: Animated.CompositeAnimation[] = [];
      if (!reduceMotion) {
        breath.setValue(0);
        loops.push(Animated.loop(tween(breath, 1, motion.breathe.durationMs)));
        if (motion.worldBob.enabled) {
          bob.setValue(0);
          loops.push(Animated.loop(tween(bob, 1, motion.worldBob.durationMs)));
        }
        loops.forEach((animation) => animation.start());
      }
      if (entered.current) {
        // Back from a world: ease the camera out, then let go of the selection.
        const ms = reduceMotion ? 0 : motion.exit.durationMs;
        tween(camera, 0, ms, Easing.out(Easing.cubic)).start(() => {
          entered.current = null;
          busy.current = false;
          select.setValue(0);
          setSelected(null);
        });
      }
      return () => loops.forEach((animation) => animation.stop());
    }, [bob, breath, camera, reduceMotion, select]),
  );

  const enterWorld = useCallback(
    (id: WorldId) => {
      if (busy.current) return;
      busy.current = true;
      entered.current = id;
      setSelected(id);
      if (reduceMotion) {
        select.setValue(1);
        onEnterWorld(id);
        return;
      }
      const lift = tween(select, 1, motion.select.durationMs, Easing.out(Easing.quad));
      const zoom = tween(camera, 1, motion.enter.durationMs, Easing.inOut(Easing.cubic));
      Animated.sequence([lift, zoom]).start(({ finished }) => {
        if (finished) {
          onEnterWorld(id);
          return;
        }
        busy.current = false;
        entered.current = null;
      });
    },
    [camera, onEnterWorld, reduceMotion, select],
  );

  const sayHello = useCallback(() => {
    if (reduceMotion || busy.current) return;
    hello.setValue(0);
    const up = tween(hello, 1, motion.hello.durationMs * 0.4, Easing.out(Easing.quad));
    const down = tween(hello, 0, motion.hello.durationMs * 0.6, Easing.inOut(Easing.quad));
    Animated.sequence([up, down]).start();
  }, [hello, reduceMotion]);

  const focusWorld = selected ? findWorld(selected) : undefined;

  const cameraStyle = useMemo(() => {
    const zoom = motion.enter.zoom;
    const target = focusWorld ? cameraOffset(focusWorld.focus, canvas, zoom) : { x: 0, y: 0 };
    return {
      transform: [
        { translateX: lerp(camera, 0, target.x * k) },
        { translateY: lerp(camera, 0, target.y * k) },
        { scale: lerp(camera, 1, zoom) },
      ],
    };
  }, [camera, focusWorld, k]);

  const layerViews = useMemo(() => {
    const riseBy = motion.arrive.rise * k;
    const liftBy = motion.hello.lift * k;
    const bobBy = motion.worldBob.amplitude * k;
    const breatheTo = motion.breathe.scaleY;
    const selectTo = motion.select.scale;

    return LAYERS.map(({ layer, source, rect }, index) => {
      const isCharacter = layer.id === character.layer;
      const delay = index * motion.arrive.staggerMs;
      const appear = arrive.interpolate({
        inputRange: [delay / ARRIVE_TOTAL, (delay + motion.arrive.durationMs) / ARRIVE_TOTAL],
        outputRange: [0, 1],
        extrapolate: 'clamp',
        easing: Easing.out(Easing.cubic),
      });
      const drop = appear.interpolate({ inputRange: [0, 1], outputRange: [-riseBy, 0] });
      const outerTransform = isCharacter
        ? [{ translateY: drop }, { translateY: lerp(hello, 0, -liftBy) }]
        : [{ translateY: drop }];

      // Idle: worlds drift on offset phases; the character breathes from her feet.
      let loopStyle: AnimatedStyle = null;
      if (layer.world && motion.worldBob.enabled) {
        const wave = waveRange(0, -bobBy, layer.phase ?? 0);
        loopStyle = { transform: [{ translateY: bob.interpolate(wave) }] };
      } else if (isCharacter) {
        const pin = pivotTranslation(rect, character.pivot, breatheTo);
        loopStyle = {
          transform: [
            { translateY: breath.interpolate(waveRange(0, pin.y * k)) },
            { scaleY: breath.interpolate(waveRange(1, breatheTo)) },
          ],
        };
      }

      // Select: the chosen world lifts around its focus point; the others step back.
      const world = layer.world ? findWorld(layer.world) : undefined;
      let artStyle: AnimatedStyle = null;
      if (world && world.id === selected) {
        const shift = pivotTranslation(rect, world.focus, selectTo);
        artStyle = {
          transform: [
            { translateX: lerp(select, 0, shift.x * k) },
            { translateY: lerp(select, 0, shift.y * k) },
            { scale: lerp(select, 1, selectTo) },
          ],
        };
      } else if (world && selected) {
        artStyle = { opacity: lerp(select, 1, 0.85) };
      }

      const box = positionOf(scaleRect(rect, k));
      return (
        <Animated.View
          key={layer.id}
          style={[styles.layer, box, { opacity: appear, transform: outerTransform }]}
        >
          <Animated.View style={[StyleSheet.absoluteFill, loopStyle]}>
            <Animated.View style={[StyleSheet.absoluteFill, artStyle]}>
              <Image source={source} style={styles.fill} onLoadEnd={onLayerLoaded} />
            </Animated.View>
          </Animated.View>
        </Animated.View>
      );
    });
  }, [arrive, bob, breath, hello, k, onLayerLoaded, select, selected]);

  const labelOpacity = useMemo(() => {
    const fade = camera.interpolate({
      inputRange: [0, 0.3],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
    return Animated.multiply(select, fade);
  }, [camera, select]);
  const labelSpot = focusWorld ? labelPosition(focusWorld.bounds, k) : null;
  const labelText = focusWorld ? `${focusWorld.name} · ${focusWorld.personality}` : '';
  const size = { width: canvas.width * k, height: canvas.height * k };

  return (
    <View style={[styles.root, size, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, cameraStyle]}>
        {layerViews}
        {worlds.map((world) => (
          <Pressable
            key={world.id}
            accessibilityRole="button"
            accessibilityLabel={`${world.name}: ${world.personality}`}
            accessibilityHint="Opens this world"
            onPress={() => enterWorld(world.id)}
            style={[styles.hit, positionOf(scaleRect(world.hit, k))]}
          />
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="You, today"
          onPress={sayHello}
          style={[styles.hit, positionOf(scaleRect(character.hit, k))]}
        />
      </Animated.View>
      {labelSpot ? (
        <Animated.View style={[styles.labelSlot, labelSpot, { opacity: labelOpacity }]}>
          <Text style={styles.label} numberOfLines={1}>{labelText}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { overflow: 'visible' },
  layer: { position: 'absolute', pointerEvents: 'none' },
  fill: { width: '100%', height: '100%' },
  hit: { position: 'absolute', borderRadius: radius.pill },
  labelSlot: {
    position: 'absolute',
    width: LABEL_SLOT,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  label: {
    ...typography.caption,
    fontSize: 13,
    color: colors.text,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
});
