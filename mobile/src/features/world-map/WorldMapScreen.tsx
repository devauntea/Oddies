import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, scene, spacing, typography } from '@/theme/tokens';

import { sceneLayout } from './layout';
import { fitCanvas } from './math';
import type { Size, WorldId } from './types';
import { WorldMap } from './WorldMap';

const { canvas } = sceneLayout;

/**
 * Fits the 2:3 map between the safe areas with one uniform scale. Any extra height is filled
 * with the meadow's own edge colors, so taller screens get breathing room instead of cropping.
 */
function placeMap(size: Size, insetTop: number, insetBottom: number) {
  const band = { width: size.width, height: size.height - insetTop - insetBottom };
  const fit = fitCanvas(band, canvas);
  return {
    scale: fit.scale,
    left: (size.width - fit.width) / 2,
    top: insetTop + (band.height - fit.height) / 2,
  };
}

/** Home: the present self among four worlds, with live UI (never baked into the art) on top. */
export function WorldMapScreen() {
  const insets = useSafeAreaInsets();
  const [size, setSize] = useState<Size | null>(null);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  }, []);

  const openWorld = useCallback((id: WorldId) => {
    router.push({ pathname: '/world/[id]', params: { id } });
  }, []);

  const placement = size ? placeMap(size, insets.top, insets.bottom) : null;

  return (
    <View style={styles.screen} onLayout={onLayout}>
      <View style={styles.lowerEdge} />
      {placement ? (
        <WorldMap
          scale={placement.scale}
          onEnterWorld={openWorld}
          style={[styles.map, { left: placement.left, top: placement.top }]}
        />
      ) : null}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text accessibilityRole="header" style={styles.title}>Oddies</Text>
        <Text style={styles.hint}>Tap a world to meet another you</Text>
      </View>
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/research')}
          style={styles.footerButton}
        >
          <Text style={styles.footerText}>Or name your own path</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: canvas.edgeTop,
  },
  lowerEdge: {
    ...StyleSheet.absoluteFillObject,
    top: '50%',
    backgroundColor: canvas.edgeBottom,
  },
  map: {
    position: 'absolute',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
    pointerEvents: 'box-none',
  },
  title: {
    ...typography.display,
    color: colors.textOnArt,
    textShadowColor: `${scene.shadow}73`,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  hint: {
    ...typography.body,
    color: colors.textOnArt,
    textShadowColor: `${scene.shadow}73`,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  footerButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
  },
  footerText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
});
