# Architecture

## Source and entry points

| File | Responsibility |
| --- | --- |
| `dist/index.html` | Static page, canvas, HUD, panels, dialogs, touch controls; script order |
| `dist/style.css` | Layout, responsive UI, controls, CSS collection artwork |
| `dist/app.js` | Shared state, persistence, curriculum, world, most activities, input, Canvas rendering |
| `dist/surfing.js` | Surf rental/session, coastal waves, surfing physics and rendering |
| `tests/game.test.cjs` | Node test suite and VM/DOM substitute |
| `package.json` | Server, syntax check, test commands |
| `.openai/hosting.json` | Sites project identity and static directory |

`dist/` is the maintained source, despite its name. There is no bundler, transpiler, dependency
installation, or generated build output. The ZIP is a separate snapshot; the running app uses
`dist/`. Keep the static site self-contained.

## Initialization and shared state

`index.html` loads `surfing.js` before `app.js`, as classic scripts. Their top-level bindings
share a global lexical environment. Surf functions reference app bindings such as `state`,
`player`, `keys`, `ctx`, and activity flags; these dependencies are resolved when functions run.
This is a file separation, not an isolated module boundary.

`app.js` initializes the profile registry, loads the active age save through `loadProgress()`,
builds the question banks, and initializes world and activity state. Its final startup sequence
restores beach anchorage, calls `initSurfing()`, checks safe player placement, restores an occupied
ferry when applicable, then calls `resizeMap()`, `update()`, `checkSponsorship()`, and schedules
`tick()` with `requestAnimationFrame`.

Persisted age state lives in `state`; explorer-wide fields live in `currentProfile()`. Transient
activities use globals such as `boating`, `swimming`, `dragonFlight`, `wakeboardRide`,
`surfSession`, `volleyball`, and `frisbeeGame`. See [save ownership](saves-and-profiles.md) before
adding fields.

## Frame and input flow

`tick(t)` clamps elapsed time to 40 ms, advances simulation, applies movement, calls `draw()`,
refreshes the nearby interaction prompt, and requests another frame. `advanceSwimming(dt)` is
also the dispatcher for many activities and effects, including surfing, volleyball, frisbee,
watersports, dragons, boat motion, and energy. Its ordering and early returns affect which
systems run together. `advanceFishing(dt)` runs separately.

Keyboard handlers near the end of `app.js`, pointer handlers, `nearby()`, and `interact()` route
actions according to the active activity. `initSurfing()` registers a capture-phase keyboard
handler that takes over during a surf session. Preserve repeat-key handling and focus guards.

Modal dialogs and map panels are different: `document.querySelector('dialog[open]')` gates
simulation/input in several paths, whereas `openMapPanel()` manages nonmodal overlays.
`openMapPanel()`, `closeMapPanel()`, `toggleSubmenu()`, and `keys.clear()` control UI transitions.
Do not assume every open panel pauses the world.

## Rendering and UI

`draw()` orchestrates Canvas layers; `resizeMap()` sets the backing resolution, world viewport,
and transform. `camera` maps world coordinates into the viewport. See
[rendering and effects](rendering-and-effects.md) for layering rules and browser checks.

`update()` refreshes HUD, profile, inventory, and activity UI, and calls `save()`. It is not a
pure rendering function. `save()` also derives safe player positions and parked-vessel state.
Read their implementations before changing how often either is called.

## Change boundaries

A new activity typically needs entry/eligibility checks, input and touch routing, frame updates,
rendering, HUD controls, safe exit, save/reload behavior, and cleanup on player/age/reset changes.
Use the existing `switchProfile()`, `switchAge()`, and reset handlers as the integration checklist.

For future code extraction, prefer explicit inputs/outputs and small owned state boundaries.
Persistence and question data are candidates, but extraction should preserve script ordering,
existing saves, and behavior verified by the VM tests. Documentation does not imply those
boundaries have already been implemented.
