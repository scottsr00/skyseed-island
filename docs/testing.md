# Testing and publication

## Commands

Requires Node.js for checks/tests and Python 3 for the dev server. No dependencies or build
step are required by the current package scripts.

```sh
npm run check
npm test
npm run dev
```

`check` runs `node --check` on both runtime scripts. `test` runs the Node test suite in
`tests/game.test.cjs`. The dev server serves `dist/` at http://localhost:5173.

For a focused test run, pass a name pattern directly to Node (before the file name):

```sh
node --test --test-name-pattern='ferry|gas' tests/game.test.cjs
node --test --test-name-pattern='surf|barrel' tests/game.test.cjs
```

Search test titles with `rg -n "test\(" tests/game.test.cjs`, then choose a pattern matching
the affected behavior. Each area document suggests relevant terms. Run the full suite for
changes to shared state, persistence, activity dispatch, or script loading.

## Harness and coverage

`game(saved, stored, renderTools)` creates a Node VM context with a minimal DOM, storage,
Canvas substitute, and captured event listeners. It evaluates `surfing.js` before `app.js`,
matching the HTML script order. It returns `run()` for evaluating game expressions, `node()`
for accessing stub UI nodes, and `snapshot()` for reload tests. Interactive workbench rendering
is replaced by default; tests may opt into `renderTools`.

Tests cover the expanded 200-question banks across all four ages, question uniqueness and
legacy IDs, answer parsing, discovery/repeat rewards, upgrades, collections and trading,
profiles and resets, migration/reload behavior, travel/collision, energy, timed ferry rides,
owned boats and fuel, fishing tiers/lifetime catches, mounts, activities, and drawing execution.
Inspect actual test titles/assertions for precise coverage of a proposed change.

## Browser verification

The DOM/Canvas substitutes do not verify actual browser layout, accessibility behavior,
pointer capture, visual quality, or animation feel. For UI/rendering/input changes, serve the
app and exercise the affected flow with keyboard and touch/narrow layouts as applicable.
Check activity entry/exit, dialogs versus nonmodal panels, camera/layering, and safe recovery.
For persistence changes, also verify reload and another profile/age with disposable test progress.

## Hosting

`.openai/hosting.json` retains the Sites project identity and specifies `dist` as the static
directory. Preserve this identity when preparing publication. There is no build step; publish
the current static files. Local development does not itself publish changes.

The app can also be opened from `dist/index.html`, but serving it at a stable local origin is
preferable for consistent browser storage. Same-origin deployments preserve access to existing
local progress; see [saves and profiles](saves-and-profiles.md).

Past DNS, socket, or browser-host failures are historical environment issues, not current
publication requirements. Verify the current environment when performing an actual deployment.
