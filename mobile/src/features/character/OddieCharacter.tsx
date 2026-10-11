import { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useReducedMotion } from '@/hooks/useReducedMotion';

import { rig, type Keyframe, type Part, type Point } from './rig';
import { PART_SOURCES } from './sources';

const NATIVE_DRIVER = Platform.OS !== 'web';
const { canvas, parts, pivots, tracks } = rig;

/** Plays a keyframe track on `value`, easing each segment with a half sine. */
function playTrack(value: Animated.Value, track: readonly Keyframe[]) {
  const steps = track.slice(1).map((frame, index) => {
    const previous = track[index];
    return Animated.timing(value, {
      toValue: frame.value,
      duration: frame.time - (previous ? previous.time : 0),
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: NATIVE_DRIVER,
    });
  });
  return Animated.sequence(steps);
}

function place(part: Part, k: number) {
  return { left: part.x * k, top: part.y * k, width: part.width * k, height: part.height * k };
}

/** A joint's offset from the canvas center, which is where React Native rotates and scales. */
function fromCenter(point: Point, k: number) {
  return { x: (point.x - canvas.width / 2) * k, y: (point.y - canvas.height / 2) * k };
}

type Props = {
  /** Display width. The whole 600 x 1010 character canvas scales to it. */
  width: number;
  /** True while this character's audio plays. Drives a speaking rhythm, not lip sync. */
  speaking?: boolean;
  /** Change this number to play the hello wave. 0 means no wave. */
  helloId?: number;
  /** False on an unfocused screen: idle motion stops and the mouth closes. */
  active?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * The present self as separate layers (assets/character), animated with React Native Animated on
 * the native driver. Idle: breathing from the feet and a small head tilt. Talking: two mouth
 * shapes in a speaking rhythm. Hello: the raised arm fades in, waves around the shoulder and fades
 * back. Reduce Motion keeps her still; hello then becomes a short fade to the raised arm.
 */
export function OddieCharacter({
  width,
  speaking = false,
  helloId = 0,
  active = true,
  style,
}: Props) {
  const reduceMotion = useReducedMotion();
  const [breath] = useState(() => new Animated.Value(1));
  const [head] = useState(() => new Animated.Value(0));
  const [mouth] = useState(() => new Animated.Value(0));
  const [wave] = useState(() => new Animated.Value(0));
  const [waveOpacity] = useState(() => new Animated.Value(0));
  const k = width / canvas.width;

  useEffect(() => {
    breath.setValue(1);
    head.setValue(0);
    if (!active || reduceMotion) return;
    const breathe = playTrack(breath, tracks.breath);
    const tilt = playTrack(head, tracks.head);
    const idle = Animated.loop(Animated.parallel([breathe, tilt]));
    idle.start();
    return () => idle.stop();
  }, [active, breath, head, reduceMotion]);

  useEffect(() => {
    mouth.setValue(0);
    if (!active || !speaking) return;
    const talk = Animated.loop(playTrack(mouth, tracks.mouth));
    talk.start();
    return () => {
      talk.stop();
      mouth.setValue(0);
    };
  }, [active, mouth, speaking]);

  useEffect(() => {
    wave.setValue(0);
    waveOpacity.setValue(0);
    if (!active || helloId === 0) return;
    const show = playTrack(waveOpacity, tracks.waveOpacity);
    const hello = reduceMotion ? show : Animated.parallel([show, playTrack(wave, tracks.wave)]);
    hello.start();
    return () => hello.stop();
  }, [active, helloId, reduceMotion, wave, waveOpacity]);

  const feet = fromCenter(pivots.feet, k);
  const neck = fromCenter(pivots.head, k);
  const shoulder = fromCenter(pivots.arm, k);
  const tilt = head.interpolate({ inputRange: [-1, 1], outputRange: ['-1deg', '1deg'] });
  const swing = wave.interpolate({ inputRange: [-10, 10], outputRange: ['-10deg', '10deg'] });
  const restOpacity = waveOpacity.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const closedOpacity = mouth.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const openScale = mouth.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] });

  // Translate to the joint, rotate or scale, translate back: the joint stays put.
  const bodyMotion = {
    transform: [{ translateY: feet.y }, { scaleY: breath }, { translateY: -feet.y }],
  };
  const headMotion = {
    transform: [
      { translateX: neck.x },
      { translateY: neck.y },
      { rotate: tilt },
      { translateX: -neck.x },
      { translateY: -neck.y },
    ],
  };
  const armMotion = {
    opacity: waveOpacity,
    transform: [
      { translateX: shoulder.x },
      { translateY: shoulder.y },
      { rotate: swing },
      { translateX: -shoulder.x },
      { translateY: -shoulder.y },
    ],
  };
  const openMotion = { opacity: mouth, transform: [{ scaleY: openScale }] };

  return (
    <View
      style={[{ width, height: canvas.height * k }, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="You, today"
    >
      <Animated.View style={[StyleSheet.absoluteFill, bodyMotion]}>
        <Image source={PART_SOURCES.body} style={[styles.part, place(parts.body, k)]} />
        <Animated.Image
          source={PART_SOURCES.armRest}
          style={[styles.part, place(parts.armRest, k), { opacity: restOpacity }]}
        />
        <Animated.View style={[StyleSheet.absoluteFill, armMotion]}>
          <Image source={PART_SOURCES.armWave} style={[styles.part, place(parts.armWave, k)]} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, headMotion]}>
          <Image source={PART_SOURCES.head} style={[styles.part, place(parts.head, k)]} />
          <Animated.Image
            source={PART_SOURCES.mouthClosed}
            style={[styles.part, place(parts.mouthClosed, k), { opacity: closedOpacity }]}
          />
          <Animated.Image
            source={PART_SOURCES.mouthOpen}
            style={[styles.part, place(parts.mouthOpen, k), openMotion]}
          />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  part: { position: 'absolute' },
});
