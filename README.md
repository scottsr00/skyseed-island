# Skyseed Island
A dependency-free, browser-local pixel-art math adventure for ages 9–10 and 11–12.

Run `npm run dev` and open http://localhost:5173. Run `npm run check` for JavaScript syntax verification.

- Full-window browser map with responsive camera proportions, floating crystal/status displays, a left-side rail of flat pixel-art icons, grouped submenus, and nonmodal map panels, and fishing controls over the map.
- Keyboard (WASD/arrows), touch movement, and tappable destination markers.
- 100 guided math challenges per age level (20 per destination) across five island destinations.
- Five crystals per first completion; repeat practice earns crystals after all 100 discoveries are complete.
- Restore a cottage (15), garden (20), and bridge (25). Bridge restores a scenic woodland crossing.
- Five islands in a 960 × 600 world (four times the original area), with a following camera and miniature chart. Walkways link the first four islands.
- A ferry waits at the main island dock. A 50-crystal ticket unlocks unlimited animated trips to Crystal Cavern and back, saved separately per age level.
- Fishing takes place directly in the main map’s sea, with inline controls and badges beneath the map. Stop fishing or press Escape to resume walking or steering. Fishing dock on the main island: 5 crystals buys a rod and five casts; refill only after bait runs out. Watch for faint underwater silhouettes, partial surfacing, and wakes, then cast ahead. A bending rod and whipping line carry a tiny worm (or lure) through a 0.9-second cast, ending in splash rings. Click/tap to aim, or use arrow keys and cast with Enter/Space.
- Close/medium/far catches are barracuda, stingray, and shark. A permanent 20-crystal lure unlocks a switchable snook, blue-ring octopus, and blue marlin panel. All six species have saved badges with catch counts per age level.
- Five total catches unlock a Skyseed Angling Co. sponsorship celebration, unlimited bait, and a steerable fishing boat at the main ferry dock. Persistent map hints explain casting and boat controls. X / Exit boat steps onto a nearby dock or triggers an offshore dive and swimming animation. Swim with WASD/arrows, walk onto shore, or use E beside your parked boat to reboard. Fish from your boat or return it to the dock; Crystal Cavern still needs a ferry ticket. Sponsorship is saved per age level.
- Walk off any island shoreline to dive into the sea with the same animation as a boat dive. X or the shoreline Dive button also works, with no sponsorship required. Swim onto land to walk again; Crystal Cavern still requires its ticket. The compact, text-free miniature chart shows all five islands, crossings, docks, your position, and the camera footprint.
- Swim within reach of a surfaced shark to automatically latch on. The shark cruises at a relaxed roughly 1.5 times swimming speed, with gradual turns and an animated tail beat; WASD/arrows steer it around islands. A fading foam wake trails behind the rider. X or Hop off shark returns to swimming, with a brief cooldown before another latch. Shark rides clear when returning to shore, boarding a boat, or changing profiles/age levels.
- Sprout hatches after eight discoveries and follows the explorer.
- Squishees unlock every 50 lifetime crystals: 29 treasures across Common, Uncommon, Hard-to-Find, Rare, Ultra Rare, and Mythic tiers. Includes the requested NeeDoh catalog, with the original seven treasures and existing saves preserved. Complete all discoveries to keep earning through repeat practice.
- The stash contains an island trading counter and a six-tier catalog. Earn one trading ticket by answering 10 flash arithmetic questions correctly in a row, with a fresh 15-second deadline for each question. Wrong answers, timeouts, and leaving end the streak; retries are unlimited. Flash questions match the selected age level and award tickets separately from discovery crystals.
- Spend one ticket to swap one owned squishee for another in the same tier. Tickets and inventory save independently per age level. The sole Mythic item has no swap partner until more Mythic items are added.
- Settings contains named explorer profiles with boy/girl character choices and a character preview. Create a profile, rename it, or switch players from the saved profile picker. Characters appear while walking, boating, diving, and swimming. Each profile saves its own selected age level and independent progress for both age levels, including crystals, collections, trading tickets, upgrades, fish, and ferry access. Existing browser progress belongs to the initial Explorer profile and can be renamed. Profiles use browser localStorage; no account or backend.
- Optional synthesized sound. All pixel artwork is original Canvas code.

The journal links to destinations and offers a confirmed progress reset. Save failures show “Session only.” New deployments preserve local progress on the same origin.

## Verification and publication
`npm test` checks all 100 answers, duplicate rewards, fraction equivalence, upgrade costs, the ferry ticket gate and return trips, drawing execution, and walkable destination landing points. Trading tests cover collection migration, all six tiers, ticket rewards, wrong answers, timeouts, same-tier restrictions, inventory persistence, and age separation. Profile tests cover legacy progress, unique names, character selection, reloads, independent age saves, profile switching during activities, and resets limited to the active profile. These are logic tests with a minimal DOM substitute; browser appearance and touch behavior still need live browser verification.

Sites identity is retained in `.openai/hosting.json`. Initial publication was blocked because the environment could not resolve the Sites Git host. Local preview was also blocked by socket permissions and an unavailable browser host. The game can be opened directly from `dist/index.html` or served with the dev command in a normal local terminal.
