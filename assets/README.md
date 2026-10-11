# Oddies shared assets

One copy of the art, layout and design tokens for both apps:

- **Mobile** (`/mobile`, Expo): Metro bundles files from here (`mobile/metro.config.js` adds this
  folder to `watchFolders`). Code imports them by relative path, for example
  `../../../../assets/scene-layout.json`.
- **Web** (`/public`, Express): served at `/assets/...` (`src/app.js`), and copied into the Docker
  image (`Dockerfile`).

The playbook is [docs/style.md](docs/style.md). Motion, the storyboard and talking are in
[docs/animation.md](docs/animation.md).

## What is here

| Path | What it is |
| --- | --- |
| `scene-layout.json` | The home map: canvas, layer order and placement, world data, hit areas, camera focus points, path geometry, motion timings |
| `tokens.json` | Brand and scene colors, type, radii. `mobile/src/theme/tokens.ts` mirrors it (a test keeps them equal) |
| `map/` | The home map, one full 1024 x 1536 canvas per layer: `00_background`, `10`–`40` the four worlds, `50_meadow_details`, `60_character` |
| `personalities/` | The Monk, Agent, Painter and Founder, cut out of `reference/character-system.webp`. Shown when you enter a world |
| `character/` | The present self as layers (body, head, two arm poses, two mouths) plus `rig.json` with part rects, joint pivots and motion tracks |
| `rig/` | Editable SVG character rig: five outfits, seven pose snapshots, seven mouth shapes, motion profiles per personality, sample viseme cues |
| `vector/` | `path-network.svg` (path centerlines for highlights) and `meadow-vector.svg` (an editable vector stand-in for the meadow) |
| `storyboard/` | `home-map-storyboard.svg` (8 frames, built from the real layers), `character-storyboard.svg/.png` (talking), `vector-lineup.svg/.png` |
| `reference/` | The approved composite (`map-composed.webp`), the character system board, and the base character on ivory. Reference only, not shipped in the UI |
| `docs/` | `style.md` (the playbook) and `animation.md` |

## The map's coordinate system

Every map layer is a full **1024 x 1536** canvas (2:3, portrait) with transparent padding. To draw
a layer, place the whole file at `(x, y)` with size `(1024 * scale, 1536 * scale)`, using the
values in `scene-layout.json`. Draw in ascending `z`. Everything else in the file (`hit`, `bounds`,
`focus`, `pivot`, `path`, `clearing`) is in the same canvas units, so a screen only needs one
number: points per canvas unit.

```text
canvas unit → screen point:  k = mapWidthOnScreen / 1024
layer rect on screen:        left = x*k, top = y*k, width = 1024*scale*k, height = 1536*scale*k
```

The world layers and the character were generated separately from the composite. Their
transforms were found by matching each layer against `reference/map-composed.webp` (scale and
offset search on the alpha region), so the stack lines up with the approved picture. They are not
pixel masks of it.

## Adding or changing art

- **Replace a layer:** keep the 1024 x 1536 canvas and the file name; adjust `x`, `y`, `scale` if
  the drawing moved. On mobile, a new layer also needs an import in
  `mobile/src/features/world-map/sources.ts` (a test fails until it has one).
- **Split a layer for richer motion** (style.md "Production expansion"): export the parts on the
  same canvas, never trimmed independently, and add them as layers with their own `z`.
- **Formats:** illustrated layers are transparent WebP (smaller than PNG, supported by iOS,
  Android and every browser). The original PNGs are in `/temporal`. Use SVG only for genuinely
  vector art (UI, paths); a raster wrapped in SVG is still a raster.
- **Text** never goes into the art. Labels, titles and buttons are live UI.
