# Oddies

Oddies draws the lives you could still live as a sideways tree. You are the node on the left. Each branch runs through milestones to an oddie: a version of you who lived that life. You can talk to any oddie, and each day you pick one branch. Oddies then searches the live web for real things you can do today toward it.

Built for AI Engineer NYC 2026.

- Live: https://oddies.fly.dev
- Repo: https://github.com/devauntea/Oddies

This repo is the framework only. The pages are plain on purpose so the design can be layered on without touching logic. See [For designers](#for-designers).

## Stack

Node 24, Express 5, SQLite (better-sqlite3), plain HTML and vanilla JS in `/public`. Gemini through `@google/genai`, Nimble Search API over REST, Sentry on server and browser. No accounts: one person's tree per deployment.

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
| `GEMINI_MODEL` | Model id. Defaults to `gemini-3.8-flash` |
| `NIMBLE_API_KEY` | Nimble API key |
| `SENTRY_DSN` | DSN of a Sentry project. Used by both server and browser |

Optional: `GEMINI_THINKING_LEVEL` (for example `low` for faster replies), `PORT`, `DB_PATH`.

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
fly secrets set GEMINI_API_KEY=... GEMINI_MODEL=gemini-3.8-flash NIMBLE_API_KEY=... SENTRY_DSN=... -a oddies
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
| `GET /api/state` | self, oddies with milestones, today's pick, today's steps, past picks |
| `POST /api/intake` | `{ text }` in, 4 to 6 draft oddies out. Saves nothing |
| `POST /api/oddies` | `{ self, oddies }`. Saves the drafts and replaces the current set |
| `POST /api/oddies/add` | Adds one path to the current set |
| `PATCH /api/oddies/:id` | Edit name, life, interests, persona_brief, horizon_years, status, branch_order, milestones |
| `DELETE /api/oddies/:id` | Removes a path |
| `GET /api/oddies/:id/chat` | That oddie's saved conversation |
| `POST /api/oddies/:id/chat` | `{ text }` in, the oddie's reply out |
| `POST /api/today` | `{ oddie_id, refresh? }`. Records the pick, returns 3 to 5 steps |
| `PATCH /api/steps/:id` | `{ done }`. Two done steps on a milestone mark it reached |
| `POST /api/demo/reset` | Wipes the database and reloads the demo |

Errors are `{ error, message }` with a real status code.

## How Today stays real

1. Gemini writes 3 search queries for the branch's next unreached milestone, using the person's city and today's date.
2. Nimble runs the 3 searches, with one shared 20 second limit.
3. Gemini picks 3 to 5 steps from those results only.
4. The server drops any step whose URL Nimble did not return (`keepRealSteps` in `src/today.js`).
5. If Nimble fails or times out, the API returns an error and the page shows it with a Try again button. There is no fallback to made-up steps.

All prompts are in `src/prompts.js`.

## Sentry

- Server: `instrument.js`, loaded with `node --import`. Every Gemini call is a `gen_ai.generate_content` span with the model and input, output and total token counts (`src/gemini.js`). Every Nimble call is a `nimble.search` span with the query and result count (`src/nimble.js`). A Today request wraps both in a `today.build_steps` span that also records how many suggested steps were dropped by the URL check.
- Browser: the Sentry CDN bundle plus `public/js/sentry-init.js`. Page loads and API calls are traced, and the trace id is passed to the server, so one click shows up as one trace from browser to Gemini and Nimble.

## For designers

Everything visual is yours to replace. Three rules keep the logic working:

1. **Keep the `data-` attributes.** The JS finds elements by `data-role`, `data-action`, `data-panel` and `data-field`, never by class.
2. **Class names are for you.** Rename or restyle any class in the HTML files. The classes in the "written by JS" lists below are created in JS, so restyle them in CSS rather than renaming them (or change them in the JS file named).
3. **`public/css/base.css` is a placeholder.** Replace it entirely if you like. It has no logic.

### Pages

| File | URL | Body hook |
| --- | --- | --- |
| `public/index.html` | `/` | `body.page--home[data-page="home"]` |
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

### tree.html: the tree

An SVG drawn by `public/js/tree.js`. **All spacing is in one place:** the `TREE_SPACING` object and the `layoutTree()` function at the top of that file. Change numbers there to move things. The SVG scales to its container and scrolls sideways inside `.tree-scroll` on small screens (`min-width` on `.tree` in the CSS sets how small it may get).

| Element | Class | State classes and attributes |
| --- | --- | --- |
| The SVG | `.tree` | |
| One branch (group) | `.tree-branch` | `.tree-branch--active` or `.tree-branch--dormant`, `.tree-branch--picked` for today's pick. `data-oddie-id`, `data-status`, `data-picked` |
| Branch line | `.tree-branch__line` | |
| Milestone (group) | `.tree-milestone` | `.tree-milestone--reached` or `.tree-milestone--unreached`. `data-milestone-id`, `data-reached` |
| Milestone dot, label | `.tree-milestone__node`, `.tree-milestone__label` | |
| Oddie (group, clickable) | `.tree-oddie` | `.tree-oddie--open` while its panel is open. `data-oddie-id`, `data-open` |
| Oddie dot, name, years | `.tree-oddie__node`, `.tree-oddie__label`, `.tree-oddie__horizon` | |
| Now node | `.tree-now`, `.tree-now__node`, `.tree-now__label`, `.tree-now__date` | |

Around it: `.tree-section`, `.tree-section__title`, `.tree-section__self`, `.tree-section__hint`, `.tree-scroll`.

### tree.html: oddie panel and chat

`aside.panel.panel--chat[data-panel="chat"]`. Hidden until an oddie is clicked. Gets `data-oddie-id`, `data-status`, and `data-chat-busy="true"` while a reply is being written.

In the HTML: `.panel__header`, `.panel__title`, `.panel__close`, `.oddie-life`, `.oddie-interests`, `.oddie-milestones`, `.oddie-actions`, `.chat__title`, `.chat__empty`, `.chat-log`, `.chat__status`, `.chat-form`, `.chat-form__label`, `.chat-form__input`, `.chat-form__send`.

Written by JS: `.oddie-interests__item`; `.oddie-milestones__item` with `--reached` or `--unreached` and `data-reached` (`tree-page.js`); `li.chat-message.chat-message--user` or `.chat-message--oddie` with `data-message-role`, containing `.chat-message__who` and `.chat-message__text` (`chat.js`).

Hooks: `data-role` = `chat-name`, `chat-life`, `chat-interests`, `chat-milestones`, `chat-empty`, `chat-log`, `chat-status`, `chat-error`, `chat-form`, `chat-input`, `path-edit`, `path-edit-form`, `path-edit-fields`, `path-edit-error`. `data-action` = `chat-close`, `chat-send`, `oddie-toggle-status`, `oddie-delete`, `path-edit-save`.

### tree.html: Today panel

`section.panel.panel--today[data-panel="today"]`. Gets `data-busy="true"` and `aria-busy` while searching.

In the HTML: `.today__date`, `.today__pick`, `.branch-list`, `.today__status`, `.today-error`, `.today-error__text`, `.today-error__retry`, `.step-list__title`, `.step-list__empty`, `.step-list`, `.step-list__refresh`, `.history-strip__title`, `.history-strip`.

Written by JS (`public/js/today.js`):

- `li.branch-list__item` (`--picked` on today's pick; `data-oddie-id`, `data-picked`, `data-status`) with `.branch-list__name`, `.branch-list__next`, `.branch-list__choose` (the Choose today's path button), `.branch-list__picked`.
- `li.step.step--{type}` (`--done` when ticked; `data-step-id`, `data-step-type`, `data-done`) with `.step__label`, `.step__check`, `.step__type`, `.step__title`, `.step__link`. Type is `read`, `attend`, `apply`, `contact` or `practice`.
- `li.history-strip__day` (`--today` on today; `data-date`, `data-oddie-id`, `data-today`) with `.history-strip__date`, `.history-strip__oddie`.

Hooks: `data-role` = `today-date`, `today-pick`, `branch-list`, `today-status`, `today-error`, `today-error-text`, `step-empty`, `step-list`, `history-strip`. `data-action` = `choose-today`, `today-retry`, `today-refresh`, `toggle-step`.

Other hooks on the tree page: `data-action="demo-reset"`, `data-role` = `path-add`, `path-add-form`, `path-add-fields`, `path-add-error`, `data-action="path-add-save"`.

## Changing the paths

- **Demo paths:** edit `SEED` in `src/seed.js`. They load on first boot and on Reset demo.
- **In the app:** open an oddie and use Edit this path, or Add a path under the tree. Milestones keep their progress by position.
- **A whole new set:** the intake page.

## Limits to know about

- No accounts. Anyone with the URL can edit the tree, reset it, and use the model and search keys. AI routes are capped at 40 calls per 10 minutes per IP.
- One tree per deployment.
- A milestone is "reached" when 2 of its steps are done, and goes back if you untick one. Milestones marked reached in the seed have no steps and stay reached.
