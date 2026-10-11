import rawRig from '../../../../assets/character/rig.json';

/**
 * Shape of `assets/character/rig.json`: the layered present self (body, head, a movable arm in two
 * poses, two mouths). Rects and pivots are in one 600 x 1010 character canvas; times are ms.
 */
export type Point = { x: number; y: number };
export type Part = { file: string; x: number; y: number; width: number; height: number };
export type Keyframe = { time: number; value: number };

export type Rig = {
  canvas: { width: number; height: number };
  parts: {
    body: Part;
    armRest: Part;
    armWave: Part;
    head: Part;
    mouthClosed: Part;
    mouthOpen: Part;
  };
  pivots: { head: Point; arm: Point; feet: Point };
  helloDurationMs: number;
  tracks: {
    breath: Keyframe[];
    head: Keyframe[];
    mouth: Keyframe[];
    wave: Keyframe[];
    waveOpacity: Keyframe[];
  };
};

export const rig = rawRig as Rig;

/**
 * Value of a track at `time` ms, eased with the same half sine the native animation uses
 * (Easing.inOut(Easing.sin)). Handy for tests, previews and non-animated renders.
 */
export function sampleTrack(track: readonly Keyframe[], time: number, loop = false): number {
  const last = track[track.length - 1];
  if (!last) return 0;
  const t = loop ? Math.max(0, time) % last.time : Math.min(last.time, Math.max(0, time));
  for (let i = 1; i < track.length; i += 1) {
    const a = track[i - 1];
    const b = track[i];
    if (a && b && t <= b.time) {
      const span = b.time - a.time;
      const progress = span > 0 ? (t - a.time) / span : 1;
      return a.value + ((b.value - a.value) * (1 - Math.cos(Math.PI * progress))) / 2;
    }
  }
  return last.value;
}
