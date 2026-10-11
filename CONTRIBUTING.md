# Contributing

These conventions keep merges painless while several people work on the app at once.

## Branches and pull requests

- Branch from `main`: `feat/<area>-<short-name>`, `fix/<area>-<short-name>`, `chore/...`.
  Example: `feat/timeline-branch-picker`.
- Keep PRs small and focused on one feature folder where possible.
- Run `npm run check` before pushing. CI runs the same thing and must be green to merge.
- **Squash merge** into `main`, with a [Conventional Commit](https://www.conventionalcommits.org)
  title such as `feat(research): add events lane`.
- Bring `main` into your branch with a merge, not a rebase, once others have pulled your branch.

## Where code goes

- **Features live in `src/features/<name>/`** and expose a public `index.ts`. Import other
  features only through that entry point (`@/features/research`), never deep paths.
- **Routes in `src/app/` stay thin**: read params, render a feature component. Adding a screen
  should mean adding a file, not editing a shared one.
- **Shared types are contracts.** Adding optional fields is always fine. Renaming or removing a
  field in a feature's `types.ts` needs a heads-up to whoever consumes it.
- **Styling reads from `src/theme/tokens.ts`.** No hard-coded colors or sizes in components. When
  `DESIGN.md` lands, the token values change in one file and the UI follows.
- **Secrets stay on the server.** Third-party API keys are only read in `src/app/api/*` and
  `src/features/*/server/`. Never prefix a secret with `EXPO_PUBLIC_`, which bundles it into the
  app. ESLint enforces the import boundary.

## Dependencies

- Add Expo/React Native packages with `npx expo install <pkg>` so versions match the SDK.
- Commit `package-lock.json` with any dependency change.
- **Lockfile merge conflicts:** don't hand-edit. Take `main`'s version, then re-run
  `npm install` to re-apply your changes:
  ```sh
  git checkout --theirs package-lock.json   # during a merge of main into your branch
  npm install
  git add package-lock.json
  ```

## Tests

Pure logic (anything in a feature's `core/` or `server/`) gets unit tests in that feature's
`__tests__/`. Server code depends on small function interfaces (for example `SearchFn`) rather than
SDK clients, so tests use plain fakes and never hit the network.

## Formatting

Prettier and EditorConfig settings are committed. Line endings are normalised to LF via
`.gitattributes`, so Windows and macOS teammates don't produce whole-file diffs.
