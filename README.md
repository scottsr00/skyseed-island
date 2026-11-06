# Skyseed Island
A dependency-free, browser-local pixel-art math adventure for ages 9–10 and 11–12.

Run `npm run dev` and open http://localhost:5173. Run `npm run check` for JavaScript syntax verification.

- Keyboard (WASD/arrows), touch movement, and tappable destination markers.
- 100 guided math challenges per age level (20 per destination) across five island destinations.
- Five crystals per first completion; repeat practice earns crystals after all 100 discoveries are complete.
- Restore a cottage (15), garden (20), and bridge (25). Bridge restores a scenic woodland crossing.
- Five islands in a 960 × 600 world (four times the original area), with a following camera and miniature chart. Walkways link the first four islands.
- A ferry waits at the main island dock. A 50-crystal ticket unlocks unlimited animated trips to Crystal Cavern and back, saved separately per age level.
- Fishing takes place directly in the main map’s sea, with inline controls and badges beneath the map. Stop fishing or press Escape to resume walking or steering. Fishing dock on the main island: 5 crystals buys a rod and five casts; refill only after bait runs out. Click/tap ahead of moving fish, or aim with arrow keys and cast with Enter/Space.
- Close/medium/far catches are barracuda, stingray, and shark. A permanent 20-crystal lure unlocks a switchable snook, blue-ring octopus, and blue marlin panel. All six species have saved badges with catch counts per age level.
- Five total catches unlock a Skyseed Angling Co. sponsorship celebration, unlimited bait, and a steerable fishing boat at the main ferry dock. Fish from your boat or return it to the dock; Crystal Cavern still needs a ferry ticket. Sponsorship is saved per age level.
- Sprout hatches after eight discoveries and follows the explorer.
- Age selector keeps independent island progress, crystals, and squishy stashes for each level. Progress stored in this browser using localStorage. No account or backend.
- Optional synthesized sound. All pixel artwork is original Canvas code.

The journal links to destinations and offers a confirmed progress reset. Save failures show “Session only.” New deployments preserve local progress on the same origin.

## Verification and publication
`npm test` checks all 100 answers, duplicate rewards, fraction equivalence, upgrade costs, the ferry ticket gate and return trips, drawing execution, and walkable destination landing points. These are logic tests with a minimal DOM substitute; browser appearance and touch behavior still need live browser verification.

Sites identity is retained in `.openai/hosting.json`. Initial publication was blocked because the environment could not resolve the Sites Git host. Local preview was also blocked by socket permissions and an unavailable browser host. The game can be opened directly from `dist/index.html` or served with the dev command in a normal local terminal.
