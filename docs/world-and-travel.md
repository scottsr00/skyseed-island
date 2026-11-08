# World and travel

## Code map

All entry points are in `dist/app.js`.

| Area | Entry points |
| --- | --- |
| Map and access | `WORLD`, `locations`, `boatIslands`, `islandPolys`, `canWalk()`, `nearby()`, `interact()`, `visitBoatIsland()` |
| Swimming and energy | `diveFromIsland()`, `advanceSwimming()`, `advancePower()`, `restorePower()`, `returnToShoreWithoutPower()` |
| Mounts | `mountPetDragon()`, `landPetDragon()`, `resetPetDragon()`, `advanceSharkRide()`, `dismountShark()` |

See [boats and fishing](boats-and-fishing.md) for vessels, ferry rides, fuel, and beach anchoring.
See [saves and profiles](saves-and-profiles.md) for persistence and ownership,
[activities](activities.md) for beach games, and [rendering](rendering-and-effects.md) for effects.

## Map and access

Seventeen islands in a 6,400 × 1,800 world, with twice the previous map area and open ocean on both
sides of the centered island group. The original five-island region is preserved. Walkways link the
main island, Moonwater, and Sunseed. The former Whispering Island crossing is now a shorter ferry
pier, with the ferry berthed in open water on its west side. Swim to Whispering Island. Restoring
the woodland bridge connects Sunseed Island to Crystal Cavern; ferry tickets pay for rides and do
not gate island access. Twelve outer islands have individual biomes, boat docks, and practice
markers: Palm Cove, Coral Key, Turtle Lagoon, Sunset Atoll, Mango Isle, Starfish Bay, Moonstone
Island, Bamboo Retreat, Ember Island, Aurora Cay, Pearl Haven, and Driftwood Isle. They require
arrival by your sponsored fishing boat, speedboat, or the ferry; journal entries, swimming, and
creature rides do not grant access. Use X near an outer dock to step ashore and E or Climb into boat
to reboard. Island visits and the parked boat persist across reloads.

Walk off any island shoreline to dive into the sea with the same animation as a boat dive. Bridges
and docks keep walkers on the timber; press X or the Dive button to enter the water explicitly.
Ordinary shoreline walking enters the water automatically and does not show a Dive suggestion. No
sponsorship is required. Swimmers and swimming mounts pass underneath bridges, docks, and boat
hulls, with their bodies and splashes hidden by the structures above. Swim onto land to reach onto
the beach and pull yourself up before walking again; Crystal Cavern no longer requires a ferry pass.
The compact, text-free miniature chart shows the islands, crossings, docks, your position, and
the camera footprint.

## Energy

The top energy meter is active. Swimming drains 0.65 energy per second. Riding sharks, marlins, sea
dragons, or a swimming pet dragon drains 0.325 energy per second, half the swimming rate. Correct
discovery, repeat-practice, or flash answers restore 25 energy, capped at 100. At zero energy the
explorer returns safely to land and must solve a problem before swimming or launching a boat again.
Saved energy stays with the explorer across age changes, resets, and reloads.

## Sea mounts and pet dragon

Swim within reach of a surfaced shark to automatically latch on. The shark cruises at a relaxed
roughly 1.5 times swimming speed, with gradual turns and an animated tail beat; WASD/arrows steer it
around islands. A fading foam wake trails behind the rider. Every ten seconds the shark smoothly
submerges and resurfaces, briefly leaving only the rider’s bright snorkel above water; steering
continues underwater. All swimmers also wear the snorkel alongside their goggles. X or Hop off shark
returns to swimming, with a brief cooldown before another latch. Approaching an unlocked shoreline
makes the shark dive offshore while the rider rolls onto walkable beach. Shark rides clear when
returning to shore, boarding a boat, or changing profiles/age levels.

All sea animal rides (shark, blue marlin, and Loch Ness monster) share steering and shoreline
avoidance, a ten-second dive cycle, head-first submerging beneath bridges, snorkel and foam wakes,
and the same quick shore tumble, prone pause, head shake, and recovery.

Occasional Loch Ness monster sightings appear briefly in open water, with a tiny wake, two separate
humps, and a long-necked head pointing along its direction of travel. A flowing side-to-side wave
animates its neck, humps, and tail. Swim within reach to catch a ride; arrows/WASD steer, X or Hop
off dismounts, and approaching an unlocked beach rolls the rider ashore as the monster dives.
Sightings have a 70% chance at checks every 30–60 seconds of eligible active play, remain temporary,
and clear on profile or age changes.

Blue marlin also surface near swimmers, with a blue back, silver belly, forked tail, and long bill.
Swim within reach to ride one; arrows/WASD steer and X or Hop off dismounts. Marlin dive beneath
bridges and land riders safely on unlocked beaches. Riding does not award a fishing catch or require
a lure.

A violet pet dragon waits beside the cottage. Press E nearby or tap Fly on pet dragon, then steer
with WASD/arrows. It flaps its wings, casts a ground shadow, and flies over land and water. X
descends onto clear accessible island ground or splashes down in open water. In water the dragon
folds its wings, paddles, and leaves a wake; X takes off again, and swimming toward an unlocked
beach climbs ashore. Swimming uses the rider’s energy; Return to cottage brings the rider home.
Boat-only island gates remain in effect. Flight saves use the last safe takeoff point, and
the pet returns to the cottage on profile/age changes or reload.

## Verification

See [testing](testing.md). Focus test names on `island`, `bridge`, `swim`, `shark`, `marlin`,
`dragon`, or `energy`. Check access boundaries, water entry/exit, mount/dismount, safe positions,
and profile/age cleanup. Inspect shoreline transitions and layering in a browser.
