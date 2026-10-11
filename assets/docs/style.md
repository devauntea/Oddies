# Oddies — product and visual playbook

Version 1.0 · October 11, 2026

This file guides design, illustration, image generation and implementation. The latest 2D meadow map and `design-reference.png` define the scene direction. The Oddies brand identity mood board supplies the identity colors and type pairing. Measurements below are recommended production specifications.

## 1. The idea

**Oddies helps people explore who they could become, starting with who they are.**

The user shares an audio, memories, interests, values or dreams. Those details become a personal world map, with different versions of the same person inhabiting different possible paths. Each world offers a perspective, a conversation and inspiration for a next step.

The user's story connects past experiences with future possibilities. Memories supply context; worlds make those possibilities tangible; conversations help the user reflect and choose an action.

**Core promise:** one you, many possibilities.

**Experience:** warm, curious, personal and playful. The app should feel like entering a small illustrated place that belongs to you.

Treat future scenes as possibilities the user can explore. Language should preserve their agency: “Imagine this path,” “What draws you here?” and “What could you try this week?”

### MVP proposal

1. Share a short voice introduction, or provide written context.
2. Review the interests and aspirations the app understood.
3. Explore four initial worlds from the central map.
4. Enter a world and speak with that version of yourself.
5. Save a memory, insight or dream that feels meaningful.
6. Choose one small action connected to that path.

The four current worlds are starting examples. Future worlds should adapt to the person's context. Import only context the user explicitly provides or authorizes; the product should not assume access to their ChatGPT history.

## 2. Art direction

**Soft, rounded 2D illustration with readable silhouettes and restrained depth.**

The map combines a meadow seen from above with upright illustrated sprites for trees, buildings and the character. Buildings use simple front or shallow three-quarter views. The character faces the viewer.

### Shape language

- Use broad color areas, rounded forms, scalloped tree canopies and gently irregular ground patches.
- Keep building silhouettes distinctive and simplify small architectural details.
- Use clean filled shapes with minimal outlining. A few darker internal shape boundaries are acceptable.
- Give trees two or three foliage masses and a simple trunk.
- Render flowers as small recognizable clusters rather than many tiny individual details.
- Preserve generous open grass around the central character and path branches.
- Use smooth edges. Maintain the feeling of an illustrated casual game map.

### Depth language

Depth comes from overlap, a subtle grass gradient and soft grounding shadows.

- Grass: a gentle light-center, deeper-edge gradient.
- Objects: mostly solid fills, with one or two simple shade regions.
- World patches: a light drop shadow that separates each destination from the meadow.
- Character: a small soft grounding shadow beneath the feet.
- Foreground trees and shrubs: overlap the lower edges of buildings or world patches.

Keep the overall scene flat and illustrated. Exclude photographic textures, glossy materials, realistic reflections, dramatic lighting, heavy bevels and extruded floating cliffs.

## 3. Color system

### Identity palette

The following palette follows the identity mood board. The ivory value is normalized to a valid hex color from the board's visual/OCR reference.

| Token | Color | Role |
| --- | --- | --- |
| `brand.ivory` | `#FFF8EF` | Main UI surfaces, cards, sheets |
| `brand.plum` | `#352A3D` | Primary text, wordmark, important icons |
| `brand.iris` | `#B4A0DB` | Selected states, gentle accents |
| `brand.saffron` | `#D4A04C` | Serenity world, warm highlights |
| `brand.navy` | `#34455E` | Agent world, secondary dark elements |
| `brand.coral` | `#E99D8B` | Artist world, warm emotional accents |

### Proposed scene tokens

These are reusable target colors, rather than exact pixel samples from every generated asset.

| Token | Color | Role |
| --- | --- | --- |
| `scene.grassCenter` | `#C4E879` | Light grass near the central clearing |
| `scene.grassMid` | `#93C873` | Main meadow green |
| `scene.grassEdge` | `#60A877` | Deeper green toward the perimeter |
| `scene.path` | `#FFE8AA` | Winding paths and central clearing |
| `scene.serenity` | `#F6D173` | Golden world patch |
| `scene.midnight` | `#8198D9` | Blue world patch |
| `scene.artist` | `#F4A48D` | Coral world patch |
| `scene.founder` | `#BBA0E2` | Lavender world patch |
| `scene.shadow` | `#284A39` | Muted grounding shadow |

### Gradient and shadows

- Center the grass gradient close to the central character/clearing.
- Blend center → mid → edge smoothly across the whole meadow.
- Keep the center bright enough to separate dark hair and indigo clothing.
- Avoid a visible spotlight ring or a sharp vignette.
- Start world shadows at **8–12% opacity**, with **4–6 logical pixels of downward offset** and **10–16 logical pixels of blur** at a roughly 400-pixel-wide screen.
- Use the same shadow direction for all four worlds.
- Keep shadow values adjustable after viewing the scene on a real phone.

Colors help identify a world, while its building and props also communicate its meaning.

## 4. Typography and logo

### Type pairing

| Purpose | Typeface | Weight | Suggested mobile size |
| --- | --- | --- | --- |
| Screen and world titles | Fraunces | 600 | 28–34 |
| Sheet titles | Fraunces | 600 | 22–26 |
| Body text | Nunito Sans | 400 | 16–17 |
| Buttons and navigation | Nunito Sans | 600 | 15–16 |
| Supporting labels | Nunito Sans | 400/600 | 13–14 |

Use comfortable body line spacing around 1.45–1.55. Keep serif headings short and expressive; use the sans serif for interaction and conversation.

### Wordmark

Use the approved **Oddies** wordmark artwork. Its expressive rounded/custom letterforms are part of the identity. Fraunces is the heading family, not a claim that it exactly recreates the logo.

- Default logo treatment: plum on ivory.
- Keep clear space around the wordmark equal to approximately the height of its lowercase letters.
- Preserve supplied letter shapes and spacing.
- Add no tagline inside the logo asset unless a specific composition requests one.
- The map illustration itself remains text-free. Place any live logo or labels in the UI layer.

## 5. The central character

The central character represents the person's present self and anchors the map.

### Identity invariants for the current character

- Recognizable face and warm skin tone.
- Brown/amber tortoiseshell oval glasses.
- Long, very dark center-parted wavy hair with face-framing sections.
- Cream crewneck sweater with ribbed collar, cuffs and waistband.
- Wide-leg dark indigo jeans.
- Silver-gray and white sneakers.
- Gentle expression, relaxed hands and approachable adult proportions.

Use broad flowing hair shapes and simplified clothing folds. Keep the head slightly enlarged for readability, while retaining adult proportions.

### Map scale

- Target character height: **25–30% of the map artwork's height**.
- Position her feet on the central clearing, with breathing room around her head and shoulders.
- Keep her glasses, face and full outfit readable at phone size.
- The overview contains **one person total**: the central character.
- Show a world's alternate personality after the user enters that world.

### Personality variants

Maintain the face, glasses, hairstyle, skin tone and underlying body proportions across every personality. Differentiate versions through clothing, posture, props, expression and environment.

| Version | Wardrobe/prop direction | Emotional tone |
| --- | --- | --- |
| Monk | Warm saffron robe, calm hands | Reflective, patient, grounded |
| Agent | Structured dark outfit, practical ID or notebook | Observant, focused, curious |
| Painter | Apron, brushes or palette | Experimental, expressive, playful |
| Founder | Casual jacket, notebook or tablet | Inventive, resourceful, encouraging |

Personality shifts should enrich the same person. Preserve her visual identity through every outfit change.

## 6. The four worlds

Each destination is a compact illustrated place with one dominant landmark, one supporting motif and a distinct ground color.

| World | Location | Visual anchors | Reflection theme |
| --- | --- | --- | --- |
| Quiet Peaks | Upper left | Temple, bonsai, mountain shapes | Calm, meaning, inner life |
| Midnight City | Upper right | Simple skyline, moon, streetlamp | Curiosity, investigation, courage |
| Color Valley | Lower left | Art cottage, easel, flowering shrubs | Expression, craft, creativity |
| Idea Gardens | Lower right | Curved studio, idea orb, lavender plants | Building, entrepreneurship, possibility |

### World construction

1. A rounded colored ground patch.
2. A compact backdrop silhouette, where useful.
3. A primary building or landmark.
4. One or two theme-defining props.
5. A small amount of foreground foliage.
6. A subtle grounding shadow beneath the region.

Keep the strongest visual differences in silhouette, color and meaningful objects. Detail should support the theme and remain legible at small scale.

## 7. Map composition

Use a portrait **2:3 artwork canvas** as the base composition. Place it within the available viewport with safe areas and controls handled separately.

- Four worlds form a loose 2×2 arrangement around the central clearing.
- Broad cream paths connect the central clearing to every world.
- Paths remain visually open at their junctions.
- Keep the central region calm and easy to scan.
- Use perimeter trees to frame the scene; avoid placing them over the character's face.
- Each world should fit into approximately 42–50% of the artwork width and about 25–32% of its height, with adjustments for its silhouette.
- Preserve world entrances and the complete character when adapting to taller screens.
- Render the map with a uniform coordinate scale. Use vertical breathing space or controlled scrolling when necessary.

Map images contain no embedded words, badges, numbering, status bars or menus. Optional world labels are separate native UI elements, so they can be localized and resized.

## 8. Components

| Component | Purpose | Visual/interaction rule |
| --- | --- | --- |
| `WorldMapCanvas` | Displays the personal map | Coordinates every art layer in one parent |
| `GrassBackdrop` | Gives the scene contrast and atmosphere | Soft green gradient; static default |
| `PathNetwork` | Connects present self to possibilities | Broad cream curves; optional subtle transition accent |
| `WorldRegion` | Provides a destination | Whole region is tappable; light selected emphasis |
| `WorldLabel` | Names a destination, when needed | Short native text or small ivory pill; never baked into art |
| `CentralAvatar` | Anchors the present self | Large, readable, subtle idle motion |
| `WorldDetailScene` | Introduces a personality | Same identity, alternate outfit, themed background |
| `PersonalityIntro` | Establishes the world's perspective | Short title and one personal invitation |
| `VoiceControl` | Starts or stops speaking | Obvious state change; comfortable touch target |
| `ConversationSheet` | Holds dialogue and actions | Ivory surface, rounded top corners, readable spacing |
| `MemoryCard` | Saves a meaningful moment | One memory, small context and one clear action |
| `PathCard` | Shows a possible direction | Concrete scenario, a reflection question and a next step |
| `StoryView` | Revisits saved context | Calm chronological/branching structure with limited density |

### UI styling

- Use an 8-pixel spacing rhythm; typical screen gutters are 20–24 logical pixels.
- Use soft rounded corners: roughly 16–20 for cards, 24–28 for large sheets, full rounding for pills.
- Prefer ivory surfaces, plum text and restrained iris accents.
- Give the screen one clearly emphasized primary action at a time.
- Provide at least a 44×44 logical-pixel touch target; use larger targets for world regions.
- Keep active voice controls visible without covering the character's face.
- Place longer content in sheets or detail screens so the map remains readable.

## 9. Navigation and screen flow

### Onboarding

Use a short invitation to share a voice introduction. Show a reviewable summary of what the app understood before creating worlds. Allow corrections and a written alternative.

### Home map

Show the present self and four destinations. Tapping a world highlights its region and begins a focused transition.

### World introduction

Move into the selected place. Present the alternate personality, the world name and a short invitation that relates to the user's aspirations.

### Conversation

Keep the personality visible above or behind a readable conversation surface. Support speaking, listening, thinking and replying states. Provide a transcript and a written response option.

### Saved insight/story

Offer a compact save action when a moment is meaningful. Make saved memories and ideas easy to revisit, edit or delete. A revisit prompt should ask for details rather than invent them.

## 10. Layers and asset structure

### Current delivered layer pack

| Order | Asset | Independent unit |
| --- | --- | --- |
| 0 | `00_background.png` | Gradient meadow, paths, central clearing |
| 10 | `10_serenity_world.png` | Whole serenity destination |
| 20 | `20_midnight_world.png` | Whole city destination |
| 30 | `30_artist_world.png` | Whole artist destination |
| 40 | `40_founder_world.png` | Whole founder destination |
| 50 | `50_meadow_details.png` | Ambient trees, flowers, stones and shrubs |
| 60 | `60_character.png` | Whole central character |
| 70+ | Native UI | Labels, navigation and conversation surfaces |

All current PNGs use a 1024×1536 canvas. **Apply `scene-layout.json` placement transforms.** The isolated assets were regenerated and calibrated; they are not exact pixel masks of the flattened design reference. Whole-world sprites support independent motion, while individual eyes, branches and props remain grouped.

### Production expansion

For richer animation, export each world as `backdrop`, `ground`, `landmark`, `props`, `foreground` and `shadow` parts. Export the character as `back-hair`, `body/outfit`, `head`, `eyes`, `mouth`, `front-hair`, `arms` and `ground-shadow` parts, with explicit pivot points.

Keep one shared coordinate system, predictable filenames and transparent padding that protects moving parts. Draw shadows separately when the object and its shadow need different motion.

Use transparent PNGs for the current illustrated assets. Use vector shapes for UI icons, simple paths and genuinely editable vector art. A raster image wrapped in an SVG is still a raster asset.

## 11. Motion language

**Small, slow, purposeful movement.** Motion should make the place feel alive and help navigation remain understandable.

| Element/state | Suggested motion | Timing |
| --- | --- | --- |
| Character idle | Gentle vertical breathing; very slight hair sway once separated | 3–4 seconds |
| Whole-world prototype idle | Optional 2–3 source-pixel bob at 1024-wide canvas | 5–6 seconds, staggered |
| Trees/foreground | Tiny sway around the trunk base once separated | 4–7 seconds |
| Founder orb | Slow rotation or small light pulse once separated | 8–12 seconds |
| Selected world | Approximately 1.01–1.02 scale emphasis and modest shadow increase | 160–220 ms |
| Enter world | Focused camera movement plus scene transition | 450–650 ms |
| Sheet appearance | Soft slide and fade | 240–320 ms |
| Blink | Brief eye closure with uneven intervals, using separate eye parts | 100–160 ms closure |
| Speaking | Audio-driven mouth changes with small head gestures | Match the actual audio |

Treat these as starting values. Measure visual motion at the displayed screen size; the source canvas is much larger than a phone viewport.

Keep solid world landmarks grounded in the production scene. Favor movement in foliage, props and the character, while whole-world motion remains a subtle prototype option. Honor Reduce Motion by keeping idle scenery still and using simple fades for navigation.

## 12. Conversation and writing tone

Write in short, warm, concrete sentences. Invite the user to reflect rather than interpreting their life with certainty.

Examples:

- “What part of this world feels most like you?”
- “Tell me about a time you felt that way.”
- “If you followed this path for a year, what would you want to change?”
- “What is one small thing you could try this week?”
- “Would you like to save this moment?”

Each personality contributes a distinct perspective while respecting the same underlying person and their context. Ground recalled facts in saved user-provided information. Clearly frame generated future scenes as imagined possibilities.

## 13. Reusable image-generation brief

```text
Create a soft rounded 2D illustrated Oddies map for a mobile app.
Use a top-down meadow with upright simple character and building sprites.
Keep broad flat color shapes, minimal outlines and restrained two-tone shading.
Use a subtle grass gradient: light green around the center, deeper sage-green at the perimeter.
Show four compact worlds around a central clearing: golden temple garden,
indigo midnight city, coral art cottage and lavender founder studio.
Connect every world to the center with broad cream winding paths.
Give each colored world patch a slight, consistent drop shadow.
Keep the central woman large, about 25–30% of canvas height, with her recognizable
tortoiseshell glasses, long dark center-parted wavy hair, cream sweater,
wide dark indigo jeans and silver-gray/white sneakers.
Use one person only on the overview. Keep all world regions free of extra characters.
Use clear foreground overlap and distinct silhouettes for later layer separation.
Keep generous open space around the central character and paths.
Portrait 2:3 artwork. No embedded text, logos, numbers, UI bars or watermark.
Preserve the supplied character identity and the established illustrated aesthetic.
Exclude photorealistic textures, glossy 3D rendering, floating cliffs and dense tiny detail.
```

For a personality screen, keep the same character identity and change only the specified outfit, pose, expression and themed environment. For a layer export, specify its content, transparency, reference canvas, intended object scale and placement; check the result before integration.

## 14. Review checklist

- Is the central character readable and visually dominant on a phone?
- Are her face, glasses, hair and outfit consistent with the reference?
- Are the four worlds distinct through both color and silhouette?
- Does the map retain its flat, rounded 2D aesthetic?
- Does the grass gradient support the center without becoming a spotlight?
- Are world shadows light and consistent?
- Are entrances, paths and touch regions clear?
- Is all text rendered as live UI rather than embedded into the map image?
- Are animation layers, draw order and placement documented accurately?
- Does the still scene work when motion is reduced?
- Do conversation prompts connect possibilities to the person's own story?
- Can the user save, correct and revisit meaningful context?

When a new feature or asset is added, update this playbook with the resulting rule and an example. Keep experimental directions clearly labeled until selected.
