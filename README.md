# Oddies

One you, many possibilities. Oddies draws the lives you could still live as a tree: you today on the left, one path per life, milestones along each path, and at the end an oddie, the version of you who lived that life. You can talk to any oddie. Tap a milestone and Nimble researches it on the live web: every page it finds is kept and linked, and a few become steps you can do today. Under the tree, an illustrated map shows each oddie's world.

Built for AI Engineer NYC 2026.

- Live: https://oddies.fly.dev
- Repo: https://github.com/devauntea/Oddies

The web app is at the repo root. The team's Expo app is in `mobile/`, and the design source files are in `temporal/`. The look follows the team's playbook, `temporal/style.md`. See [Design](#design) and [For designers](#for-designers).

## Stack

Node 24, Express 5, SQLite (better-sqlite3), plain HTML and vanilla JS in `/public`. Gemini through `@google/genai`, Nimble Search and Extract through `@nimble-way/nimble-js`, Sentry on server and browser. No accounts: one person's tree per deployment.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. The first boot loads a demo profile, so the tree is full right away. The app runs without any keys. Chat, Today and intake each say which key is missing.

```bash
npm test
```

## Secrets

All four come from environment variables. None are in the code.

| Variable | What it is |
| --- | --- |
| `GEMINI_API_KEY` | Google AI Studio key |
| `GEMINI_MODEL` | Model id. Defaults to `gemini-3.5-flash-lite` |
| `NIMBLE_API_KEY` | Nimble API key |
| `SENTRY_DSN` | DSN of a Sentry project. Used by both server and browser |

Optional: `GEMINI_FALLBACK_MODELS` (comma separated, tried in order when the main model answers 503 or 429; defaults to `gemini-3.6-flash,gemini-3.8-flash`), `GEMINI_THINKING_LEVEL`, `PORT`, `DB_PATH`.

Why that default: on 2026-10-11 the same chat request took about 1.2 seconds on `gemini-3.5-flash-lite`, about 4.5 on `gemini-3.6-flash`, and 23 to 33 on `gemini-3.8-flash`, which also returned a 503 one time in three.

**Local, option 1: macOS keychain (nothing on disk).** `npm run dev` reads these automatically.

```bash
scripts/keys.sh add      # asks for each key, input hidden
scripts/keys.sh status   # shows which are stored, never prints them
```

**Local, option 2: a `.env` file.** Copy `.env.example` to `.env` and fill it in. `.env` is in `.gitignore`.

## Deploy to Fly.io

One time setup. The app name is `oddies` (set in `fly.toml`).

```bash
fly apps create oddies
fly volumes create oddies_data --region ewr --size 1 -a oddies --yes
fly secrets set GEMINI_API_KEY=... GEMINI_MODEL=gemini-3.5-flash-lite NIMBLE_API_KEY=... SENTRY_DSN=... -a oddies
fly deploy --ha=false
```

If the keys are in the keychain, `scripts/keys.sh fly` replaces the `fly secrets set` line.

The SQLite file lives on the `oddies_data` volume at `/data/oddies.db`. A volume belongs to one machine, so keep this app at one machine (`--ha=false`).

### Deploy on every push to main

`.github/workflows/fly-deploy.yml` runs the tests, then `flyctl deploy`. It needs one repo secret:

```bash
fly tokens create deploy -a oddies | gh secret set FLY_API_TOKEN --repo devauntea/Oddies
```

Without the secret the workflow still runs the tests and prints a warning instead of deploying.

## API

| Route | What it does |
| --- | --- |
| `GET /api/state` | self, oddies with milestones and research, today's pick, today's steps, past picks |
| `POST /api/intake` | `{ text }` in, 4 to 6 draft oddies out. Saves nothing |
| `POST /api/oddies` | `{ self, oddies }`. Saves the drafts and replaces the current set |
| `POST /api/oddies/add` | Adds one path to the current set |
| `PATCH /api/oddies/:id` | Edit name, life, interests, persona_brief, horizon_years, status, branch_order, milestones |
| `DELETE /api/oddies/:id` | Removes a path |
| `GET /api/oddies/:id/chat` | That oddie's saved conversation |
| `POST /api/oddies/:id/chat` | `{ text }` in, the oddie's reply out |
| `POST /api/today` | `{ oddie_id, refresh? }`. Records the pick, returns 3 to 5 steps |
| `POST /api/research` | `{ oddie_id }`. Researches that path's next milestone without changing today's pick |
| `PATCH /api/steps/:id` | `{ done }`. Two done steps on a milestone mark it reached |
| `POST /api/steps/:id/read` | That step's page as markdown, through Nimble Extract |
| `POST /api/demo/reset` | Wipes the database and reloads the demo |

Errors are `{ error, message }` with a real status code.

## How Today stays real

1. Gemini picks 3 research lanes for the branch's next unreached milestone and writes one search query for each, using the person's city and today's date.
2. Nimble runs the 3 searches, each with its lane's settings, under one shared 20 second limit.
3. Gemini picks 3 to 5 steps from those results only.
4. The server drops any step whose URL Nimble did not return (`keepRealSteps` in `src/today.js`).
5. If Nimble fails or times out, the API returns an error and the page shows it with a Try again button. There is no fallback to made-up steps.

Every page Nimble returns is saved in the `source` table with its lane, the query that found it, and its link, not only the few that become steps. `GET /api/state` returns it as `oddie.research`, one entry per researched milestone. The tree rings those milestones and the research sheet lists every source.

If Gemini is the part that fails, fixed lane rules write the queries or pick the steps instead, still only from Nimble results. So Today keeps working with just a Nimble key.

All prompts are in `src/prompts.js`.

### Research lanes

The lanes, their Nimble settings, the URL cleanup and the result-to-task rules are ported from the team's research feature on the `claude/vigilant-mayer-merd1u` branch (`src/features/research`). They follow the prototyping loop from Designing Your Life. They live in `src/research.js`.

| Lane | Finds | Becomes step type | Nimble settings |
| --- | --- | --- | --- |
| `overview` | how to get started | `read` | 6 results, `standard` depth |
| `documents` | a real study document | `read` | 4 results, `content_type: ['documents']` |
| `practice` | something hands-on | `practice` | 5 results |
| `community` | people already doing it (prototype conversation) | `contact` | 5 results |
| `events` | a class or meetup soon (prototype experience) | `attend` | 6 results, `standard` depth |
| `apply` | a program or role to apply to | `apply` | 5 results |

The other lanes use `search_depth: 'lite'`. `apply` is new here; the other five are the team's. One team setting changed after live testing: events no longer uses `time_range: 'month'`, because it returned general category pages where the unfiltered search returned specific classes.

Also ported: reading a page inside the app. Read and practice steps get a Read here button that loads the page as text through Nimble Extract. Only URLs of saved steps can be read.

Not ported, on purpose: mock mode and generic tasks with no link. This app never shows a step that did not come from a live Nimble result. The team's end-of-day reflection is shown as a line of text under the steps, not as a step.

## Sentry

- Server: `instrument.js`, loaded with `node --import`. Every Gemini call is a `gen_ai.generate_content` span with the model and input, output and total token counts (`src/gemini.js`). A retry or a fallback to another model is its own span, so a trace shows which model answered. Every Nimble call is a `nimble.search` span with the query, lane and result count, or a `nimble.extract` span (`src/nimble.js`). A Today request wraps both in a `today.build_steps` span that also records how many suggested steps were dropped by the URL check.
- Browser: the Sentry CDN bundle plus `public/js/sentry-init.js`. Page loads and API calls are traced, and the trace id is passed to the server, so one click shows up as one trace from browser to Gemini and Nimble.

## Design

Built from `temporal/`: the playbook (`style.md`), the layered map art, and the character rig in `preview.html`.

- **Palette and type:** ivory surfaces, plum text, iris for selected things, Fraunces for titles, Nunito Sans for the rest. All tokens are at the top of `public/css/base.css`.
- **The map:** `public/js/map.js` stacks the art in layers (meadow, four worlds, foliage, the person) so each world is its own button. Where each layer sits is in CSS under "Map", as shares of the map's size, matched by eye to `temporal/Girl among four colorful worlds.png`. The playbook's `scene-layout.json` was not in the folder; if it turns up, put its numbers there.
- **Which oddie gets which world:** `public/js/worlds.js`. Each world goes to the oddie whose name, life and interests fit it best (monk to Quiet Peaks, agent to Midnight City, painter to Color Valley, founder to Idea Gardens). Oddies left over take any free world. A fifth oddie and beyond has no art, so it shows as a chip under the map.
- **The character:** `public/js/rig.js` draws the same person in the world's outfit at the top of the conversation sheet, with a blink. The art is generated into `public/js/rig-art.js` from `temporal/preview.html`.
- **Web images:** `public/img/map/*.webp` are cropped, resized copies of the PNGs in `temporal/` (about 540 KB in all, against 10 MB of source).
- **Logo:** `public/img/logo.webp` is the green wordmark artwork. The playbook's default is plum on ivory; that version was not supplied.
- **The tree leads.** It is the first thing on the page. On phones it is drawn in a compact layout that fits the screen (`TREE_SPACING_COMPACT` in `public/js/tree.js`); from 720px up it is drawn in full (`TREE_SPACING`).
- **Opening on the home page:** "Oddies" is written in cursive, then the view moves through it into the page. Once per tab, skipped by any tap or key (`public/js/home.js`, "Home: the opening" in the CSS).
- **Motion:** worlds drift a few pixels, the person breathes, sheets fade in, the research ring turns slowly. All of it is off under Reduce Motion.

Not built from the playbook yet: voice input, saving memories, a story view, and the walk-into-a-world transition.

## For designers

Everything visual is yours to replace. Three rules keep the logic working:

1. **Keep the `data-` attributes.** The JS finds elements by `data-role`, `data-action`, `data-panel` and `data-field`, never by class.
2. **Class names are for you.** Rename or restyle any class in the HTML files. The classes in the "written by JS" lists below are created in JS, so restyle them in CSS rather than renaming them (or change them in the JS file named).
3. **`public/css/base.css` is a placeholder.** Replace it entirely if you like. It has no logic.

### Pages

| File | URL | Body hook |
| --- | --- | --- |
| `public/index.html` | `/` | `body.page--home[data-page="home"]`. The opening is `div.intro[data-role="intro"]` with `.intro__mark`, `.intro__word`, `.intro__letter` |
| `public/intake.html` | `/intake` | `body.page--intake[data-page="intake"]` |
| `public/tree.html` | `/tree` | `body.page--tree[data-page="tree"]` |
| `public/404.html` | any unknown URL | `body.page--not-found` |

Shared: `.site-header`, `.site-header__home`, `.site-header__nav`, `.button`, `.notice` (status line, `data-role="notice"`), `.panel__error` (inline errors).

### index.html

`.home`, `.home__title`, `.home__line`, `.home__actions`.
Hooks: `data-action="see-demo"`, `data-action="start-own"`.

### intake.html

In the HTML: `.intake`, `.intake__title`, `.intake__lead`, `.intake-form`, `.intake-form__label`, `.intake-form__input`, `.intake-form__actions`, `.drafts`, `.drafts__title`, `.drafts__lead`, `.drafts__warning`, `.drafts-form`, `.draft-self`, `.draft-self__legend`, `.draft-list`.

Written by JS (`public/js/intake.js`): one `fieldset.draft-card[data-role="draft-card"][data-draft-index]` per path, with `.draft-card__legend` and `.draft-card__remove`.

Hooks: `data-role` = `intake-form`, `intake-text`, `intake-status`, `intake-error`, `intake-error-text`, `drafts`, `drafts-form`, `draft-self`, `draft-list`, `drafts-error`. `data-action` = `build-oddies`, `draft-manual`, `intake-retry`, `draft-add`, `draft-remove`, `save-oddies`. `data-field` = `self-name`, `self-city`, `self-summary`.

### Path form (edit a path, add a path, each intake draft)

Written by JS (`public/js/path-form.js`): `label.path-form__field.path-form__field--{name}` containing `.path-form__label` and `.path-form__input[data-field="{name}"]`, where name is `name`, `life`, `interests`, `persona_brief`, `horizon_years` or `milestones`.
In the HTML: `.path-form`, `.path-form__fields`, `.path-form__note`, `.path-form__save`, `details.path-edit`, `details.path-add`.

### tree.html: the map

`div.world-map[data-role="world-map"]`, filled by `public/js/map.js`.

| Element | Class | State classes and attributes |
| --- | --- | --- |
| Meadow and foliage pictures | `.world-map__layer`, `.world-map__meadow`, `.world-map__foliage` | |
| One world (a button) | `.world`, `.world--serenity`, `--midnight`, `--artist`, `--founder` | `.world--active` or `.world--dormant`, `.world--picked` for today's pick, `.world--open` while its sheet is open. `data-role="world"`, `data-world`, `data-oddie-id`, `data-status`, `data-picked`, `data-open` |
| World picture, label | `.world__art`, `.world__label`, `.world__name`, `.world__note` | |
| The person, the Now pill | `.world-map__self`, `.world-map__now` | |
| Paths with no world | `.more-paths`, `.path-chips`, `.path-chip` | `.path-chip--open`, `data-role="path-chip"`, `data-picked` |

**World color:** anything that belongs to an oddie carries `data-world` (`serenity`, `midnight`, `artist`, `founder` or `none`), which sets the CSS variable `--tone`. It is on the worlds, the milestone branches, the oddie's sheet, the rows in Today, and the past-day pills.

Around it: `.map-section`, `.map-section__title`, `.map-section__self`, `.map-section__hint`.

### tree.html: the tree

An SVG drawn by `public/js/tree.js`. **All spacing is in one place:** the `TREE_SPACING` (wide) and `TREE_SPACING_COMPACT` (phone) objects and the `layoutTree()` function at the top of that file. Change numbers there to move things. The SVG has `data-layout="wide"` or `"compact"`.

| Element | Class | State classes and attributes |
| --- | --- | --- |
| The SVG | `.tree` | |
| One branch (group) | `.tree-branch` | `.tree-branch--active` or `.tree-branch--dormant`, `.tree-branch--picked` for today's pick. `data-oddie-id`, `data-status`, `data-picked`, `data-world` |
| Branch line | `.tree-branch__line` | |
| Milestone (group, a button) | `.tree-milestone` | `.tree-milestone--reached` or `--unreached`, `--next` for the path's next milestone, `--researched` when Nimble has results for it, `--open` while its research sheet is open. `data-milestone-id`, `data-reached`, `data-next`, `data-researched`, `data-sources` |
| Milestone dot, label | `.tree-milestone__node`, `.tree-milestone__label` | |
| Research ring, source count | `.tree-milestone__halo`, `.tree-milestone__sources` | |
| "Next: ..." line (phone layout) | `.tree-branch__next` | |
| Tap areas | `.tree-milestone__hit`, `.tree-oddie__hit` | |
| Oddie (group, clickable) | `.tree-oddie` | `.tree-oddie--open` while its panel is open. `data-oddie-id`, `data-open` |
| Oddie dot, name, years | `.tree-oddie__node`, `.tree-oddie__label`, `.tree-oddie__horizon` | |
| Now node | `.tree-now`, `.tree-now__node`, `.tree-now__label`, `.tree-now__date` | |

Around it: `.tree-section`, `.tree-section__title`, `.tree-section__self`, `.tree-section__hint`, `.tree-scroll`.

### tree.html: oddie panel and chat

`aside.panel.panel--chat[data-panel="chat"]`. Hidden until a world is chosen. Gets `data-oddie-id`, `data-status`, `data-world`, and `data-chat-busy="true"` while a reply is being written. The header holds `svg.oddie-rig[data-role="chat-rig"]` (the character, with `data-outfit`) and `.oddie-header__world[data-role="chat-world"]` (the world's name).

In the HTML: `.panel__header`, `.panel__title`, `.panel__close`, `.oddie-life`, `.oddie-interests`, `.oddie-milestones`, `.oddie-actions`, `.chat__title`, `.chat__empty`, `.chat-log`, `.chat__status`, `.chat-form`, `.chat-form__label`, `.chat-form__input`, `.chat-form__send`.

Written by JS: `.oddie-interests__item`; `.oddie-milestones__item` with `--reached` or `--unreached` and `data-reached` (`tree-page.js`); `li.chat-message.chat-message--user` or `.chat-message--oddie` with `data-message-role`, containing `.chat-message__who` and `.chat-message__text` (`chat.js`).

Hooks: `data-role` = `chat-name`, `chat-life`, `chat-interests`, `chat-milestones`, `chat-empty`, `chat-log`, `chat-status`, `chat-error`, `chat-form`, `chat-input`, `path-edit`, `path-edit-form`, `path-edit-fields`, `path-edit-error`. `data-action` = `chat-close`, `chat-send`, `oddie-toggle-status`, `oddie-delete`, `path-edit-save`.

### tree.html: research sheet

`section.panel.panel--research[data-panel="research"]`. Opens when a milestone is chosen. Gets `data-world`, `data-oddie-id`, `data-milestone-id`, `data-researched`.

In the HTML: `.research__summary`, `.research__run`, `.research__lanes`.
Written by JS (`public/js/research-panel.js`): `section.lane.lane--{lane}[data-lane]` with `.lane__title`, `.lane__query` and `ul.source-list`; `li.source.source--{kind}` (`--step` when it was picked as a step; `data-source-id`, `data-kind`, `data-step`) with `.source__link`, `.source__meta`, `.source__host`, `.source__badge`, `.source__snippet`.

Hooks: `data-role` = `research-world`, `research-title`, `research-summary`, `research-status`, `research-error`, `research-lanes`. `data-action` = `research-run`, `research-close`.

Under the tree: `ul.tree-legend` with `.tree-legend__item--reached`, `--unreached`, `--researched`.

### tree.html: Today panel

`section.panel.panel--today[data-panel="today"]`. Gets `data-busy="true"` and `aria-busy` while searching.

In the HTML: `.today__date`, `.today__pick`, `.branch-list`, `.today__status`, `.today-error`, `.today-error__text`, `.today-error__retry`, `.step-list__title`, `.step-list__empty`, `.step-list`, `.today__reflect`, `.step-list__refresh`, `.history-strip__title`, `.history-strip`.

Written by JS (`public/js/today.js`):

- `li.branch-list__item` (`--picked` on today's pick; `data-oddie-id`, `data-picked`, `data-status`) with `.branch-list__name`, `.branch-list__next`, `.branch-list__choose` (the Choose today's path button), `.branch-list__picked`.
- `li.step.step--{type}` (`--done` when ticked; `data-step-id`, `data-step-type`, `data-done`) with `.step__label`, `.step__check`, `.step__type`, `.step__title`, `.step__link`. Type is `read`, `attend`, `apply`, `contact` or `practice`. Read and practice steps also get `.step__read` (the Read here button) and, when open, `.step__reader.step__reader--loading`, `--ready` or `--error` (`data-role="step-reader"`, `data-status`).
- `li.history-strip__day` (`--today` on today; `data-date`, `data-oddie-id`, `data-today`) with `.history-strip__date`, `.history-strip__oddie`.

Hooks: `data-role` = `today-date`, `today-pick`, `branch-list`, `today-status`, `today-error`, `today-error-text`, `step-empty`, `step-list`, `today-research`, `today-research-text`, `today-reflect`, `history-strip`. `data-action` = `choose-today`, `today-retry`, `today-refresh`, `toggle-step`, `read-step`, `today-sources`.

Other hooks on the tree page: `data-action="demo-reset"`, `data-role` = `path-add`, `path-add-form`, `path-add-fields`, `path-add-error`, `data-action="path-add-save"`.

## Changing the paths

- **Demo paths:** edit `SEED` in `src/seed.js`. They load on first boot and on Reset demo.
- **In the app:** open an oddie and use Edit this path, or Add a path under the tree. Milestones keep their progress by position.
- **A whole new set:** the intake page.

## Limits to know about

- No accounts. Anyone with the URL can edit the tree, reset it, and use the model and search keys. AI routes are capped at 40 calls per 10 minutes per IP.
- One tree per deployment.
- A milestone is "reached" when 2 of its steps are done, and goes back if you untick one. Milestones marked reached in the seed have no steps and stay reached.
