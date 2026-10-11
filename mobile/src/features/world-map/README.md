# World map

The home screen: the present self among four worlds, stacked from separate layers. Tapping a
world zooms into it and opens `/world/[id]`, that world's path (see the world-paths feature).
Tapping the present self opens `/you` (see the character feature).

Everything visual comes from the shared [`/assets`](../../../../assets/README.md) folder, the same
files the web app uses:

- `assets/scene-layout.json` gives layer order, placement, hit areas, camera focus points and
  motion timings. `layout.ts` types it.
- `assets/map/*.webp` and `assets/personalities/*.webp` are imported in `sources.ts`, because
  Metro needs static imports. Add a layer there when you add one to the layout.

Files:

- `WorldMapScreen.tsx` fits the 2:3 map between the safe areas with one uniform scale, fills extra
  height with the meadow's edge colors, and draws the live title, hint and footer.
- `WorldMap.tsx` is the layered map: arrive, idle (breathing, world drift), select, zoom in and
  out, hit areas.
- `math.ts` holds the pure layout math (fit, pivots, camera, sine tables), tested in `__tests__/`.

Motion uses React Native `Animated` on the native driver and stops under Reduce Motion. Timings and the storyboard are in
[`assets/docs/animation.md`](../../../../assets/docs/animation.md).
