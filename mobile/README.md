# Oddies

> **Location:** this Expo app lives in `/mobile` of the Oddies repo. Run every command in this
> README from that folder (`cd mobile`). The repo root holds the web app.

An Odyssey Plan-style life app. You travel a horizontal timeline of life paths, pick a branch that
feels exciting today, and the app helps you take real steps down it.

This repo currently contains the **research and task tool**: given a branch such as "music", it
uses [Nimble](https://docs.nimbleway.com/nimble-sdk/getting-started/overview) to research the
topic and returns study material plus a short list of tasks for today. The timeline UI and the
visual design (`DESIGN.md`) come later; the screens here are deliberately plain placeholders.

Built with Expo (SDK 57) and Expo Router. Nimble is called only from Expo API routes, so the API
key never ships in the app.

## Getting started

```sh
nvm use            # Node 22 (see .nvmrc)
npm install
cp .env.example .env.local   # optional: add NIMBLE_API_KEY for real results
npm start          # then press i / a, or scan the QR code with Expo Go
```

Without `NIMBLE_API_KEY` the app runs on mock data, so you can build UI without a key.

## Scripts

| Command             | What it does                                    |
| ------------------- | ----------------------------------------------- |
| `npm start`         | Expo dev server (also serves the API routes)    |
| `npm run build:web` | Export the web app and API routes to `dist/`    |
| `npm test`          | Jest unit tests                                 |
| `npm run typecheck` | `tsc --noEmit`                                  |
| `npm run lint`      | ESLint (`expo lint`)                            |
| `npm run format`    | Prettier, write                                 |
| `npm run check`     | Everything CI runs. Run it before opening a PR. |

## Project layout

```
src/
  app/                 Expo Router routes (screens + API routes). Keep these thin.
    api/               Server-only endpoints: research+api.ts, document+api.ts
    research/          Research screen and in-app reader
  features/
    research/          The research & task tool. See its README.
  theme/tokens.ts      Colors, spacing, type. The one place DESIGN.md will change.
```

New features go in `src/features/<name>/` with their own `index.ts`, so teams can work side by
side without editing each other's files. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Deploying the API routes

The app calls `/api/*` on the dev server during development. For preview and production builds,
deploy the server (for example with EAS Hosting: `npx expo export --platform web` then
`npx eas-cli deploy`), set `NIMBLE_API_KEY` as a server secret there, and set
`EXPO_PUBLIC_API_URL` to the deployed URL for the app build.

### Vercel test deployment

The Vercel adapter in `api/index.js` serves the exported Expo API routes and page routes.
Expo Router's SDK 57 server rendering option generates HTML with the requested world or topic
instead of a placeholder route, so direct links and refreshes hydrate consistently.
Run these commands from `/mobile`, with the repo's shared `/assets` folder present:

```sh
npm ci
npm run check
npx vercel link --project oddies-mobile
npx vercel pull --yes --environment=preview
SENTRY_DISABLE_AUTO_UPLOAD=true npx vercel build
npx vercel deploy --prebuilt
```

Build locally before uploading: the map imports shared artwork from the repo's `/assets`,
and the prebuilt deployment bundles that artwork without deploying the root web app.
The web app calls its API routes on the same origin, so leave `EXPO_PUBLIC_API_URL` empty.
Research uses mock data until `NIMBLE_API_KEY` is configured as a server environment variable
in the Vercel project.

To update the stable test domain after the first deployment, use `--environment=production`
with `vercel pull`, then `--prod` with both `vercel build` and `vercel deploy --prebuilt`.

## Sentry

Crash and error reporting via `@sentry/react-native`, set up in `src/observability/sentry.ts`.
It stays off until `EXPO_PUBLIC_SENTRY_DSN` is set, and only reports from release builds unless
`EXPO_PUBLIC_SENTRY_IN_DEV=true`. For readable stack traces in EAS builds, add `SENTRY_AUTH_TOKEN`,
`SENTRY_ORG` and `SENTRY_PROJECT` as EAS secrets. The Nimble API routes are not instrumented yet.
