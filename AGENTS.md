# Working on Skyseed Island

## Read only the context needed

Use the README documentation table to select the relevant area document. Read
`docs/architecture.md` for changes to startup, shared state, input routing, or the game loop.
Read `docs/saves-and-profiles.md` when adding persisted fields, changing ownership, migrating
saves, or changing reset behavior. Other tasks can start directly with their area document.
Use `rg` to locate the named functions and relevant tests; avoid loading all docs or entire
runtime/test files by default.

## Repository conventions

- For drafting or publishing GitHub issues, use
  [create-github-issue](.agents/skills/create-github-issue/SKILL.md) and its linked issue guide.
- For selecting and implementing existing GitHub issues, use
  [implement-github-issue](.agents/skills/implement-github-issue/SKILL.md).

- `dist/` contains the maintained source and the published static site. There is no build step.
- Preserve the dependency-free browser runtime unless the task calls for an architecture change.
- `surfing.js` loads before `app.js`; both are classic scripts sharing global bindings. Account
  for initialization order and shared state when moving code.
- Preserve existing question IDs and browser progress. Consult the save document for ownership
  across profiles, age levels, adventure resets, and full profile resets.
- New activities must use the shared energy scaling and safe exhaustion flow described in
  `docs/world-and-travel.md`. Walking and boat travel must remain available at zero energy.
- Changes to an activity should account for its input, update, rendering, save/reload, and cleanup
  paths. Check the relevant area document for integration points.
- Run `npm run check` for JavaScript changes and relevant tests as described in `docs/testing.md`.
  Use browser verification for visual, input, or touch changes; logic tests do not establish appearance.
- Update the owning area document when behavior or code boundaries change. Keep the README as
  a short entry point and avoid duplicating rules across documents. Reference function names
  instead of brittle line numbers; use Git history for past changes.
