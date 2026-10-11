# Oddies motion: storyboard, idle poses, talking

Motion follows the playbook ([style.md](style.md), section 11): **small, slow, purposeful**.
Landmarks stay grounded; life comes from the character, foliage and props. With Reduce Motion
on, idle scenery stays still and navigation uses plain fades. Every value below is a starting
point, set in `assets/scene-layout.json` (`motion`) or `assets/character/rig.json` (`tracks`), so
both apps change together.

## 1. Home map storyboard

`assets/storyboard/home-map-storyboard.svg` draws these eight frames from the real layers and
transforms. Open it in a browser.

| Frame | Time | What moves | Values |
| --- | --- | --- | --- |
| 1 Arrive | 0–1140 ms | Layers settle in draw order: meadow, worlds, details, you | Each drops 14 canvas units and fades in over 600 ms, 90 ms apart |
| 2 Idle | loop | You breathe from the feet; worlds drift on offset phases | Breath scaleY 1 → 1.008 over 3.6 s, pinned at the feet (513, 932). Bob 2.5 units over 5.6 s, phases 0 / 0.5 / 0.75 / 0.25 |
| 3 Tap a world | 0–200 ms | It lifts around its focus point; the others step back; a label appears | Scale 1.02; others to 85% opacity; label "Quiet Peaks · The Monk" |
| 3b Path lights up | 0–520 ms | Highlight runs from the clearing along the path into the world | `stroke-dashoffset` from `path.length` to 0. Geometry: `worlds[].path` and `vector/path-network.svg` |
| 4 Enter | 200–760 ms | Camera eases toward the world | Zoom 2.1 to `worlds[].focus`, ease in-out cubic, then the screen cross-fades |
| 5 Meet the personality | +320 ms | World framed like the zoom; the personality rises; the sheet slides up | Rise 16 → 0 with fade; then breathing at their own pace (table below) |
| 6 Listen and talk | follows audio | Mouth, then a small nod | See section 3 |
| 7 Next step | user-paced | Path card: where it could start, one next action, later steps | No motion beyond the sheet |
| 8 Back | 450 ms | Camera eases out, selection clears, idle resumes | Ease-out cubic |

Tapping the present self on the map: she hops (14 units, 420 ms), then the **You, today** screen
opens with the layered character, who waves and says hello.

The character storyboard (`storyboard/character-storyboard.svg`) covers the talking close-up:
arrive, breathe, blink (65 + 30 + 85 ms), listen tilt (2°), start talk, open vowel, round vowel,
settle.

## 2. Idle poses

What can move depends on how the art is split.

| Asset | Moves today | Needs a split to |
| --- | --- | --- |
| `map/60_character` (one flat image) | Breathing (scaleY around the feet), hello hop | Blink, hair sway, head tilt |
| `character/` (head, body, arms, mouths) | Breathing 0.3%, head tilt 0.65° over 3.6 s, hello wave around the shoulder, two mouth shapes | Blink (needs an eyes layer), second arm |
| `personalities/*` (flat cutouts) | Breathing at each personality's pace | Gestures, talking: split like `character/` |
| `rig/*.svg` (vector groups) | Everything: breath, head sway, arm sway, blink, listen tilt, seven mouth shapes | Nothing. Needs `react-native-svg` on mobile |
| World layers (flat) | Bob (prototype option), selection lift | Foliage sway, lamp glow, moon, orb rotation once props are separate |

**Recipe for an idle pose**

- **Breath:** scaleY at most 1.01, pivot at the feet, 3–6.5 s. The feet never move.
- **Head:** rotate ±0.6–1.4° around the neck, slower than the breath and out of phase.
- **Blink:** about 180 ms (close 65, hold 30, open 85) at irregular 3–6 s gaps. The eyes squash,
  the glasses never do. Needs a separate eyes part.
- **Arms:** at most 0.8° around the shoulder; the far arm at half amplitude, opposite direction.
- **Hair:** follows the head until hair-front and hair-back are separate parts.
- **Personality comes from timing**, not bigger moves (from `rig/motion-profiles.json`):

| Personality | Breath | Head sway | Arms | Speaking gesture | Feel |
| --- | --- | --- | --- | --- | --- |
| You (base) | 4.8 s | ±1.15° | ±0.65° | up to 3° | Friendly, relaxed |
| Monk | 6.4 s | ±0.6° | 0° | 0° | Grounded; palms stay joined |
| Agent | 4.4 s | ±0.75° | ±0.35° | up to 1.3° | Attentive, focused |
| Painter | 4.2 s | ±1.4° | ±0.8° | up to 4.2° | Curious, expressive |
| Founder | 4.6 s | ±1.05° | ±0.55° | up to 2.6° | Confident, warm |

## 3. Talking

Pick the best signal you have, in this order:

1. **Viseme cues from the voice provider:** timed shapes (REST, M/B/P, A, E, O, U, F/V) read
   against the audio player's clock in seconds. Mouth art: `rig/mouths/*.svg`; sample timing:
   `rig/sample-cues.json`.
2. **Offline phoneme alignment** for prerecorded lines.
3. **Loudness (RMS) of the character's output audio** → mouth openness. Fast attack (about
   40 ms), slower release (about 65 ms), closed below about 0.035. It cannot tell A from O.
4. **A speaking rhythm only.** This is what `OddieCharacter` does today: while `speaking` is
   true it loops two mouth shapes. Never present it as lip sync.

Rules for all four: the mouth leads and the head nod follows; close the mouth on pause, end,
cancel or a dropped connection; drive everything from the player's real position, never from a
separate timer, and reset it when the audio seeks.

Wiring it up on mobile, once there is audio (for example `expo-speech` or `expo-audio`):

```tsx
<OddieCharacter
  width={280}
  speaking={isPlaying} // from the player's start/end events
  helloId={helloCount} // bump to wave again
  active={isFocused} // stop motion off screen
/>
```

## 4. Where it lives in code

| Piece | File |
| --- | --- |
| Map arrive, idle, select, zoom in and out | `mobile/src/features/world-map/WorldMap.tsx` |
| Personality rise and breathing | `mobile/src/features/world-map/WorldIntro.tsx` |
| Layered character: idle, talk, hello | `mobile/src/features/character/OddieCharacter.tsx` |
| Web map (tree page) | `public/js/map.js` and the "Map" section of `public/css/base.css` (team-owned; it can read `/assets/scene-layout.json` for placement and timing) |
| Vector rig with every channel | `assets/rig/` (Expo version in `temporal/` kits; needs `react-native-svg` and Reanimated) |

Everything on mobile uses React Native's built-in `Animated` with the native driver, so it runs
in Expo Go with no new dependencies, and on web through react-native-web.

## 5. Next steps

1. Split the four personalities into head, body, arm and mouth layers like `character/`, so each
   world's version can wave and talk.
2. Add an eyes layer to `character/` for blinking.
3. For bigger gestures, install `react-native-svg` and Reanimated (`npx expo install`) and use
   the vector rig, or move the character to Rive.
4. The path highlight on mobile also needs `react-native-svg`; its geometry is already in
   `scene-layout.json`.
5. Check on real devices: seven full-canvas layers decode to roughly 44 MB of textures. If memory
   is tight, trim the world layers to their bounds and update their transforms.
