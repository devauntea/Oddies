# Research feature

Turns the branch a user picked on their timeline ("music today") into a **research pack**: a short
overview, study material to read or watch, and a small set of tasks for today that move them along
that path. Research is powered by [Nimble](https://docs.nimbleway.com/nimble-sdk/getting-started/overview)
search and extract.

## How it fits together

```
Timeline / branch picker
   │  router.push(researchHref({ topic, level, pathId }))
   ▼
src/app/research/[topic].tsx ──► ResearchPackView ──► useResearch() ──► POST /api/research
                                                                          │ (server only)
                                                                          ▼
                                     parseResearchRequest → buildQueryPlan → Nimble search ×5 lanes
                                                                          │
                                                                          ▼
                                     assemblePack: normalise + dedupe → summary + resources + tasks
```

Tapping an article or study doc opens `src/app/research/read.tsx`, which calls `POST /api/document`
(Nimble Extract → markdown). Videos, communities and events open in the system browser.

## Lanes → tasks

Each lane is one Nimble search. Tasks follow the Odyssey Plan prototyping loop from _Designing
Your Life_:

| Lane        | Nimble query shape                                | Feeds task                                            |
| ----------- | ------------------------------------------------- | ----------------------------------------------------- |
| `overview`  | "how to get started with X", `include_answer`     | Summary + **learn** (fallback)                        |
| `documents` | "X study guide", `content_type: ['documents']`    | **learn** (preferred: read a real study doc)          |
| `practice`  | "X practice exercises"                            | **practice**                                          |
| `community` | "X community forum where beginners ask questions" | **conversation** (prototype conversation)             |
| `events`    | "X workshops classes events", last month          | **experience** (prototype experience)                 |
| _(none)_    |                                                   | **reflect**: Good Time Journal check-in, always added |

If a lane fails, the pack still returns, with a user-safe entry in `warnings`, and the task falls
back to a generic version. Callers can pass `lanes` to run fewer searches and spend fewer credits.

## Folder layout and rules

| Folder        | Runs on     | Rules                                                                                          |
| ------------- | ----------- | ---------------------------------------------------------------------------------------------- |
| `types.ts`    | both        | The API contract. Add optional fields freely; coordinate before renaming or removing one.      |
| `core/`       | both, pure  | No React, no network, no SDK. Everything here is unit-tested.                                  |
| `server/`     | server only | Only imported by `src/app/api/*`. `nimble.ts` is the **only** file that touches the SDK.       |
| `client/`     | app         | Fetching, hooks, on-device task progress.                                                      |
| `components/` | app         | Placeholder UI. Read styles from `@/theme/tokens` only, so DESIGN.md can restyle in one place. |
| `index.ts`    | app         | Public API. Other features import from `@/features/research`, never deep paths.                |

ESLint blocks importing `server/` or `@nimble-way/*` from anywhere outside `src/app/api` and
`server/`, so the API key can't end up in the app bundle by accident.

## Using it from another feature

```tsx
import { researchHref } from '@/features/research';

router.push(researchHref({ topic: branch.title, level: 'beginner', pathId: branch.id }));
```

Or embed the view directly:

```tsx
import { openResource, ResearchPackView } from '@/features/research';

<ResearchPackView request={{ topic: 'music', pathId }} onOpenResource={openResource} />;
```

Or just the data, to build a custom UI:

```ts
const research = useResearch({ topic: 'music' }); // { status, data?, error?, reload }
const { isDone, toggle } = useTaskProgress();
```

## API

`POST /api/research`

```jsonc
// request (ResearchRequest)
{ "topic": "music", "level": "beginner", "goal": "play a song for friends", "pathId": "branch-1" }
// 200 response: ResearchPack (see types.ts). 400/502: { "error": "..." }
```

`POST /api/document`: `{ "url": "https://..." }` → `ReadableDocument`.

Identical research requests are cached in memory for 30 minutes per server instance.

## Mock mode

With no `NIMBLE_API_KEY` on the server, both routes return clearly-labelled mock data
(`source: "mock"`), so UI work never needs a key or spends credits.

## Ideas not built yet

- Use Nimble Agents for deeper, multi-step research on a branch.
- Sync task progress to a backend once accounts exist (today it is on-device only).
- Feed "reflect" answers back into the Odyssey dashboard gauges (resources, likability,
  confidence, coherence).
