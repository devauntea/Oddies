# Daily companion

The present self pops up on the home screen once a day with a short **affirmation** or one small
piece of **advice**, a little like a desktop assistant that peeks in. She waves (`helloId`) and
"talks" (`speaking`) on the team's layered `OddieCharacter` while the bubble appears.

- **When:** by herself at most once per local calendar day, 1.4 s after the map arrives. After
  "Thanks" she shrinks to a small portrait button (bottom left) that reopens her any time.
- **What:** `core/messages.ts`, a curated library written to the playbook tone (style.md §12):
  warm, short, inviting; never telling the user who they are. Some messages come from a world and
  offer "Visit {world}". Nothing is generated.
- **Which:** `messageForDay` is deterministic per day and walks the library with a coprime
  stride, so consecutive days differ and every message appears before any repeats. "Another"
  steps to the next one.
- **Control:** "Turn off the daily pop-up" stops the automatic appearance; the portrait button
  still works. State lives on the device (`oddies.companion.v1`).
- **Accessibility:** the message is announced to screen readers; Reduce Motion swaps the slide for
  a fade and keeps her still; the bubble unmounts when closed.

Mounted by `world-map/WorldMapScreen.tsx`. It imports `world-map/layout` and `world-map/types`
directly (not the index) to avoid a require cycle.

## Adding messages

Append to `MESSAGES` with a new, stable id. Keep each under ~110 characters (a test enforces it)
and in the playbook voice. Tests also check every world keeps at least one message.

## Next ideas

- A local notification at a time the user picks (`expo-notifications`), opening this bubble.
- Personalised lines from the user's own saved story, via the web app's Gemini endpoint, with the
  curated library as the fallback.
