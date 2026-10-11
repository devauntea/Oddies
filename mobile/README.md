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
| `npm test`          | Jest unit tests                                 |
| `npm run typecheck` | `tsc --noEmit`                                  |
| `npm run lint`      | ESLint (`expo lint`)                            |
| `npm run format`    | Prettier, write                                 |
| `npm run check`     | Everything CI runs. Run it before opening a PR. |

## Project layout

```
src/
  app/                 Expo Router routes (screens + API routes). Keep these thin.
    index.tsx          Home: the world map
    world/[id].tsx     A world's introduction
    you.tsx            The present self up close
    api/               Server-only endpoints: research+api.ts, document+api.ts
    research/          Branch picker, research screen and in-app reader
  features/
    world-map/         The layered home map and world intros. See its README.
    character/         The layered present self: idle, talking, hello. See its README.
    research/          The research & task tool. See its README.
  hooks/               Shared hooks (useReducedMotion)
  theme/tokens.ts      Colors, spacing, type. Mirrors ../assets/tokens.json.
```

Art, the scene layout and design tokens come from the repo's shared `../assets` folder, which the
web app uses too. Metro bundles it through `watchFolders` in `metro.config.js`. See
[../assets/README.md](../assets/README.md) and the motion plan in
[../assets/docs/animation.md](../assets/docs/animation.md).

New features go in `src/features/<name>/` with their own `index.ts`, so teams can work side by
side without editing each other's files. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Deploying the API routes

The app calls `/api/*` on the dev server during development. For preview and production builds,
deploy the server (for example with EAS Hosting: `npx expo export --platform web` then
`npx eas-cli deploy`), set `NIMBLE_API_KEY` as a server secret there, and set
`EXPO_PUBLIC_API_URL` to the deployed URL for the app build.

## Sentry

Crash and error reporting via `@sentry/react-native`, set up in `src/observability/sentry.ts`.
It stays off until `EXPO_PUBLIC_SENTRY_DSN` is set, and only reports from release builds unless
`EXPO_PUBLIC_SENTRY_IN_DEV=true`. For readable stack traces in EAS builds, add `SENTRY_AUTH_TOKEN`,
`SENTRY_ORG` and `SENTRY_PROJECT` as EAS secrets. The Nimble API routes are not instrumented yet.
