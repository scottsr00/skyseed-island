# Skyseed Island
A dependency-free, browser-local pixel-art math adventure for ages 11–12.

Run `npm run dev` and open http://localhost:5173. Run `npm run check` for JavaScript syntax verification.

- Keyboard (WASD/arrows), touch movement, and tappable destination markers.
- Twenty guided interactive math challenges across five island destinations.
- Five crystals per first completion; repeat practice never duplicates rewards.
- Restore a cottage (15), garden (20), and bridge (25). Bridge opens the cavern.
- Sprout hatches after eight discoveries and follows the explorer.
- Progress stored in this browser using localStorage. No account or backend.
- Optional synthesized sound. All pixel artwork is original Canvas code.

The journal links to destinations and offers a confirmed progress reset. Save failures show “Session only.” New deployments preserve local progress on the same origin.

## Verification and publication
`npm test` checks all 20 answers, duplicate rewards, fraction equivalence, upgrade costs, the cavern gate, drawing execution, and walkable destination landing points. These are logic tests with a minimal DOM substitute; browser appearance and touch behavior still need live browser verification.

Sites identity is retained in `.openai/hosting.json`. Initial publication was blocked because the environment could not resolve the Sites Git host. Local preview was also blocked by socket permissions and an unavailable browser host. The game can be opened directly from `dist/index.html` or served with the dev command in a normal local terminal.
