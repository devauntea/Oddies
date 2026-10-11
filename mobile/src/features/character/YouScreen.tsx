import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, scene, spacing, typography } from '@/theme/tokens';

import { OddieCharacter } from './OddieCharacter';
import { rig } from './rig';

const GREETING = 'Hi, I am you, today. Every world on the map is a life we could still try.';
/**
 * How long the greeting "speaks". A stand-in until real audio exists: drive `speaking` from the
 * audio player's start and end events instead (see assets/docs/animation.md).
 */
const GREETING_MS = 2600;

function goBack() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/');
  }
}

/** The present self up close: she waves when you arrive and says hello again on request. */
export function YouScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [helloId, setHelloId] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [focused, setFocused] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  const sayHello = useCallback(() => {
    setHelloId((id) => id + 1);
    setSpeaking(true);
  }, []);

  useEffect(() => {
    const timer = setTimeout(sayHello, 300);
    return () => clearTimeout(timer);
  }, [sayHello]);

  useEffect(() => {
    if (!speaking) return;
    const timer = setTimeout(() => setSpeaking(false), GREETING_MS);
    return () => clearTimeout(timer);
  }, [speaking, helloId]);

  const { canvas, pivots } = rig;
  const figureWidth = Math.min(width * 0.62, (height * 0.56 * canvas.width) / canvas.height);
  const k = figureWidth / canvas.width;
  const shadow = {
    left: pivots.feet.x * k - figureWidth * 0.22,
    top: pivots.feet.y * k - 8,
    width: figureWidth * 0.44,
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.stage}>
        <View style={{ width: figureWidth, height: canvas.height * k }}>
          <View style={[styles.shadow, shadow]} />
          <OddieCharacter
            width={figureWidth}
            speaking={speaking}
            helloId={helloId}
            active={focused}
          />
        </View>
      </View>
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Text accessibilityRole="header" style={styles.title}>You, today</Text>
        <Text style={styles.greeting}>{GREETING}</Text>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={sayHello}
            style={[styles.button, styles.buttonPrimary]}
          >
            <Text style={[styles.buttonText, styles.buttonTextPrimary]}>Say hello</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={goBack} style={styles.button}>
            <Text style={styles.buttonText}>Back to the map</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: scene.grassCenter,
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: spacing.lg,
  },
  shadow: {
    position: 'absolute',
    height: 16,
    borderRadius: radius.pill,
    backgroundColor: `${scene.shadow}2E`,
  },
  sheet: {
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: colors.background,
  },
  title: {
    ...typography.display,
    color: colors.text,
  },
  greeting: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 23,
    marginTop: spacing.sm,
    color: colors.text,
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
});
