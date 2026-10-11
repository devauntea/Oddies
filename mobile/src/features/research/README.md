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
                                     parseResearchRequest → buildQueryPlan → Nimble search ×6 lanes
                                                                          │
                                                                          ▼
                                     link check: drop 404s → assemblePack: normalise + dedupe
                                                             → summary + resources + tasks
```

## Opening resources

Every source should be something the user can actually read or watch on their phone:

| Resource                            | Opens in                                                                |
| ----------------------------------- | ----------------------------------------------------------------------- |
| Video (YouTube, Vimeo)              | YouTube app if installed, Safari otherwise                              |
| File (PDF, Word, PowerPoint)        | In-app browser, whose built-in viewer renders it                        |
| Web article / study page / practice | In-app reader (`src/app/research/read.tsx`, rendered by `MarkdownView`) |
| Community, event                    | In-app browser                                                          |

The reader calls `POST /api/document`: Nimble Extract with `markdown_backend: 'main_content'`
(Readability), so nav bars and footers are dropped. Pages with nothing readable (HTTP errors, PDF
bytes, interactive tools or index pages with under 400 characters of prose) return a 502, and the
reader opens the page in the browser instead.

Before a pack is assembled, every result URL gets a free HEAD request (confirmed with GET, since
some servers 404 every HEAD). Only a definite 404/410 or a host that no longer exists removes a
result; bot walls (403), timeouts and 5xx keep it.

## Lanes → tasks

Each lane is one Nimble search. Tasks follow the Odyssey Plan prototyping loop from _Designing
Your Life_:

| Lane        | Nimble query shape                                | Feeds task                                            |
| ----------- | ------------------------------------------------- | ----------------------------------------------------- |
| `overview`  | "how to get started with X", `include_answer`     | Summary + **learn** (fallback)                        |
| `documents` | "X study guide", `content_type: ['documents']`    | **learn** (preferred: read a real study doc)          |
| `videos`    | "X lesson", `include_domains: ['youtube.com']`    | **learn** (fallback: watch a lesson)                  |
| `practice`  | "X practice exercises"                            | **practice**                                          |
| `community` | "X community forum where beginners ask questions" | **conversation** (prototype conversation)             |
| `events`    | "X workshops classes events", last month          | **experience** (prototype experience)                 |
| _(none)_    |                                                   | **reflect**: Good Time Journal check-in, always added |

If a lane fails, the pack still returns, with a user-safe entry in `warnings`, and the task falls
back to a generic version. Callers can pass `lanes` to run fewer searches and spend fewer credits.

## Reliability and quality

- **Shared deadline.** The six searches share one 20 s limit (`SEARCH_DEADLINE_MS`). Lanes that
  finish in time are kept; the rest become warnings. If nothing finishes, the API returns 504.
- **Refresh.** `{ "refresh": true }` skips the 30-minute server cache. The app's Refresh button
  uses it. Only complete packs (no warnings) are cached.
- **Result quality** (`core/quality.ts`). Junk domains (pin-boards, shopping marketplaces) are sent
  to Nimble as `exclude_domains` and filtered again locally, and one site can fill at most 2
  slots in a pack. Citations to filtered results are dropped.
- **On-device cache** (`client/packCache.ts`). The last good pack per branch is saved on the
  phone. Reopening a branch shows it instantly while a fresh pack loads, and it still works
  offline, with a notice if the refresh failed.
- **Time budget** (`core/budget.ts`). The user picks 15/30/60/90 minutes; `planDay` splits tasks
  into "today" (prioritised learn, practice, reflect, conversation, experience) and "for later".
  This runs on the device, so changing the budget never re-searches.

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
{
  "topic": "music",
  "level": "beginner",
  "goal": "play a song for friends",
  "pathId": "branch-1",
  "refresh": false,
}
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
