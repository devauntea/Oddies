# Character

The present self as separate layers, from `assets/character/`: body with the fixed arm, head, a
movable arm in rest and wave poses, and closed and open mouths. `assets/character/rig.json` holds
the part rectangles, joint pivots (feet, neck, shoulder) and keyframe tracks; `rig.ts` types it.

Use `OddieCharacter` with a `width`, plus `speaking`, `helloId` and `active`:

- **Idle:** 0.3% breathing from the feet and a 0.65° head tilt, in a 3.6 s loop.
- **Talking:** while `speaking` is true, two mouth shapes alternate in a speaking rhythm. It is not
  lip sync; drive `speaking` from your audio player's start and end events. For real lip sync see
  section 3 of [`assets/docs/animation.md`](../../../../assets/docs/animation.md).
- **Hello:** change `helloId` to play a 2.36 s wave around the shoulder.
- **Off screen:** `active={false}` stops all motion and closes the mouth. Reduce Motion keeps her
  still.

`YouScreen` (route `/you`, opened by tapping her on the home map) shows all three.

The parts came from `temporal/Oddies-Simple-Expo.zip`. They were regenerated for separation, so
small details differ from the flat map character; the map keeps the flat one to match the
approved composite.
