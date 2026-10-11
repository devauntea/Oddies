import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { useReducedMotion } from '@/theme/useReducedMotion';

import { MOTION_PROFILES, RIG_SVG, type Personality } from '../art/characterRig';

const VIEWBOX = { width: 600, height: 1000 };

// Eye pivots from the motion lab rig (temporal/preview.html).
const EYES_CLOSED: [string, string][] = [
  [
    '<g id="eye-left"',
    '<g id="eye-left" transform="translate(259 164) scale(1 0.06) translate(-259 -164)"',
  ],
  [
    '<g id="eye-right"',
    '<g id="eye-right" transform="translate(342 161) scale(1 0.06) translate(-342 -161)"',
  ],
];

function wrap(inner: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX.width} ${VIEWBOX.height}">${inner}</svg>`;
}

export interface PersonalityAvatarProps {
  personality: Personality;
  /** Rendered height in points; width follows the rig's 3:5 viewBox. */
  height: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * One version of the user (same face, glasses and hair; different outfit). Ported from the
 * motion lab: breathing at the personality's own pace and blinks at uneven intervals. Both stop
 * when Reduce Motion is on.
 */
export function PersonalityAvatar({ personality, height, style }: PersonalityAvatarProps) {
  const reduceMotion = useReducedMotion();
  const profile = MOTION_PROFILES[personality];
  const [blinking, setBlinking] = useState(false);
  const breath = useState(() => new Animated.Value(0))[0];

  const open = useMemo(() => wrap(RIG_SVG[personality]), [personality]);
  const closed = useMemo(
    () =>
      wrap(EYES_CLOSED.reduce((svg, [from, to]) => svg.replace(from, to), RIG_SVG[personality])),
    [personality],
  );

  useEffect(() => {
    if (reduceMotion) return;
    const half = (profile.breathSeconds * 1000) / 2;
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
  }, [reduceMotion, profile.breathSeconds, breath]);

  useEffect(() => {
    if (reduceMotion) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(
        () => {
          setBlinking(true);
          timer = setTimeout(() => {
            setBlinking(false);
            schedule();
          }, 130);
        },
        3000 + Math.random() * 3000,
      );
    };
    schedule();
    return () => clearTimeout(timer);
  }, [reduceMotion]);

  const width = (height * VIEWBOX.width) / VIEWBOX.height;
  const translateY = breath.interpolate({ inputRange: [0, 1], outputRange: [0, -height * 0.0016] });

  return (
    <Animated.View
      style={[{ width, height, transform: [{ translateY }] }, style]}
      accessibilityRole="image"
    >
      <SvgXml xml={blinking ? closed : open} width={width} height={height} />
    </Animated.View>
  );
}
