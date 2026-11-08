# Skyseed Island

A dependency-free, browser-local pixel-art math adventure for ages 5–6, 7–8, 9–10, and 11–12.
Explore seventeen islands and Mainland Beach, solve 200 challenges per age level, collect treasures,
and play fishing, boating, surfing, and beach activities. Progress saves in this browser; no account
or backend is required.

## Run locally

Requires Node.js for checks/tests and Python 3 for the local server. No dependency installation or
build step is needed.

```sh
npm run dev
```

Open http://localhost:5173. Move with WASD/arrows or touch controls; use E to interact.
Activity-specific controls are documented below and shown in the game.

```sh
npm run check
npm test
```

## Documentation

Read the page relevant to the change, then follow its code references.

| Area | Reference |
| --- | --- |
| File map, startup, game loop, UI, shared state | [Architecture](docs/architecture.md) |
| Storage keys, save ownership, migrations, resets, admin mode | [Saves and profiles](docs/saves-and-profiles.md) |
| Curriculum, discoveries, crystals, collections, trading | [Learning and rewards](docs/learning-and-rewards.md) |
| Map, island access, swimming, energy, mounts | [World and travel](docs/world-and-travel.md) |
| Boats, ferry, anchoring, fuel, fishing | [Boats and fishing](docs/boats-and-fishing.md) |
| Watersports, volleyball, frisbee | [Activities](docs/activities.md) |
| Surf rental, controls, physics, wave artwork | [Surfing](docs/surfing.md) |
| Canvas layering, dragon fire, environmental reactions | [Rendering and effects](docs/rendering-and-effects.md) |
| Automated checks, focused tests, browser verification, hosting | [Testing and publication](docs/testing.md) |

[AGENTS.md](AGENTS.md) provides concise routing and maintenance instructions for coding agents.
Keep detailed behavior in its area document and update it alongside changes.
