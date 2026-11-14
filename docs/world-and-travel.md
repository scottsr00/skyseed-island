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
`bridgeApproachTarget()` gives both ends of built bridges a 12-pixel approach buffer, guiding
slightly off-center walkers onto the deck before shoreline movement can trigger a dive.
`dockDiveTarget()` first checks the facing direction for a clear jump of at least 32 world pixels
and an eight-pixel landing margin from land, timber, and boat hulls. If blocked, it chooses a
clear perpendicular side, preferring the nearer opening. The path may cross the launching deck
but cannot pass through land, a hull, or another structure. With no safe opening the explorer stays
on the dock. `startDive()` turns the explorer toward the chosen landing point.
Ordinary shoreline walking enters the water automatically and does not show a Dive suggestion. No
sponsorship is required. Swimmers and swimming mounts pass underneath bridges, docks, and boat
hulls, with their bodies and splashes hidden by the structures above. Swim onto land to reach onto
the beach and pull yourself up before walking again; Crystal Cavern no longer requires a ferry pass.
The compact, text-free miniature chart shows the islands, crossings, docks, your position, and
the camera footprint.

Walking uses swept ground footprints: buildings, tree trunks, beach umbrellas, and lifeguard
chairs are fixed obstacles. Canopies do not block empty ground beneath their edges. Reposed
sunbathers are low obstacles: `startWalkingHop()` automatically chooses a short jump in the
walking direction, only when the entire path avoids fixed scenery and ends on clear accessible
land. `advanceWalkingHop()` carries the explorer across while `drawWalkingExplorer()` supplies
the raised pose and ground shadow. Hops pause with dialogs, cost no energy, and save the safe
takeoff position; profile/age changes clear them. Movement input resumes after landing.

## Energy

The meter drains throughout active play, including waiting between throws or casts.
Walking, standing on land, and all boat travel are free and remain available at zero energy.
`ENERGY_ACTIVITY_EFFORT` scales a 100-energy meter around a three-minute baseline:

| Activity | Energy / second | Full meter |
| --- | --- | --- |
| Frisbee (light) | 0.417 | 4 minutes |
| Fishing, fish/sea creature rides, pet dragon swimming or flying (moderate) | 0.556 | 3 minutes |
| Swimming, volleyball, surfing, wakeboarding, waterskiing (strenuous) | 0.833 | 2 minutes |

`advancePower()` runs once at the start of the activity dispatcher, before early returns.
Modal dialogs, paused surfing, and surf results do not drain energy. Admin mode stays unlimited.
At zero energy, beach games and surfing exit safely, tow sports return to their safe dock,
creature riders and swimmers return to land, and fishing stops while preserving boat travel.
A correct discovery, repeat-practice, or flash answer restores 25 energy, capped at 100.
Energy stays with the explorer across age changes, resets, and reloads.
Mainland Beach has a Maritime Museum, Snack Shack, and Aquarium with discovery/practice
questions for recharging ashore; see [learning and rewards](learning-and-rewards.md).

For each new activity, register effort in `ENERGY_ACTIVITY_EFFORT`, classify it in
`currentEnergyActivity()`, guard entry with `requireActivityPower()`, and provide a safe exit in
`finishExhaustedActivity()`. Match effort to physical exertion and test drain timing,
exhaustion, pauses, and free travel.

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

Loch Ness monster encounters are currently disabled by `LOCH_NESS_ENABLED`: sightings do not
spawn or render, and swimmers cannot mount the monster. The dormant encounter and ride code
remains available for re-enabling later. Sharks, blue marlin, and the cottage pet dragon
remain available.

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
