# Boats and fishing

## Code map

All entry points are in `dist/app.js`.

| Area | Entry points |
| --- | --- |
| Boats | `launchBoat()`, `launchSpeedboat()`, `boardOwnBoat()`, `exitBoat()`, `returnBoat()`, `driveBoat()`, `moveBoat()`, `boatPoseClear()` |
| Ferry | `openFerry()`, `confirmFerryBoarding()`, `buyFerryTicket()`, `boardFerry()`, `advanceFerryRide()` |
| Anchorage | `buyAnchor()`, `anchorBoatAtBeach()`, `returnToAnchoredBoat()`, `restoreBeachAnchor()` |
| Fishing | `fishingTier()`, `fishingTargets()`, `castFishing()`, `reelFishing()`, `landHookedFish()`, `advanceFishing()`, `sponsored()` |

See [world and travel](world-and-travel.md) for island access, swimming, energy, and mounts.
See [saves and profiles](saves-and-profiles.md) for ownership and migration,
[rendering](rendering-and-effects.md) for motors/effects, and [activities](activities.md)
for watersports and beach games.

## Beach anchoring

Buy a permanent 50-crystal anchor in Gear; ownership stays with the explorer across all age levels,
adventure resets, and reloads, including anchors found in older saves; it works with the
fishing boat, speedboat, or ferry. Within 105 world pixels of the shore, Q or Anchor & go ashore parks the boat
and animates the trip ashore. Return to the mooring flag and press E or Return to anchored boat to
reboard. Boat position, type, and anchor ownership persist across reloads; ownership also persists
across age changes and adventure resets.

## Ferry

A ferry waits at the main island dock. A 25-crystal ticket buys one five-minute ride, consumed on
boarding. E at the dock shows a compact map confirmation: Enter/E uses the ticket (or buys and
boards for 25 crystals), and Escape cancels. The upper-right countdown matches the speed and trim
instruments. Time pauses during fishing and question dialogs, but continues ashore; reboard the
parked ferry while time remains. At zero the ferry stops in place and cannot be controlled, but
fishing and disembarking still work. After its rider leaves, the expired ferry returns to the main
dock. Occupied rides and remaining time survive reloads. Legacy permanent passes are removed;
Crystal Cavern no longer requires one.

Tickets and remaining time belong to the current age save. See the save document for migration
from obsolete permanent passes.

## Owned boats

Five total catches unlock a Skyseed Angling Co. sponsorship celebration, unlimited bait, and a
steerable fishing boat at the fishing dock. The fishing boat launches and returns there, with a
boarding button at the fishing dock. Persistent map hints explain casting and boat controls. X /
Exit boat steps onto a nearby dock; offshore, the rider first throws an anchor with an unfurling
rope, then dives into the sea. The boat stays still during the throw and the rope remains while it
is moored. Anchor throws land in clear water at least 72 pixels from the boat. Reboarding
automatically hauls the rope and anchor aboard before steering resumes; beach moorings retain their
anchor position across reloads. Swim with WASD/arrows, walk onto shore, or use E beside your parked
boat to reboard. Fish from your boat or return it to the dock; Crystal Cavern can be reached without
a ferry pass. Sponsorship is saved per age level.

Earn or hold 100 crystals to unlock the main island’s new speedboat dock, southeast of the original
harbour. No crystals are spent. The unlock stays with that explorer across age levels, adventure
resets, and reloads; existing saves with 100 earned crystals or a balance of at least 100 also
qualify, including admin grants. Launch from the dock with E, tap the dock, or use “Launch my
speedboat” in Gear or Fishing & travel. The teal-and-white speedboat has three outboards with
coordinated steering, exhaust, wakes, and trim spray. Its forward acceleration and top speed are 25%
above the fishing boat, with quicker steering response and a tighter turning circle even at full
speed. Its top speed advantage applies at every matching trim setting (175 versus 140 at neutral
trim; 206.5 versus 165.2 at trim 4). Fishing, anchoring at the beach, outer-island docking, saved
parking, reboarding, and dragon-fire explosions work with the speedboat.

## Driving and trim

Boat hull collision checks cover land, docks, built bridges, and other boats, including the tow
boat. Turns and long moves stop before contact; reverse lets a boat move away. Boarding positions
provide hull clearance beside docks.

Boat driving: Up/W applies forward thrust, Down/S brakes before reversing, and Left/A or Right/D
steers smoothly relative to the bow. The vessels accelerate gradually, coast when released, and stop
their momentum on collision.

Press Space while driving a boat to trim the outboard motors: five separate presses raise trim from
0 to 5, then five lower it back to 0. Trim positions 1–4 widen the spray and add up to 18% forward
speed, with position 4 the fastest. At position 5 the props are nearly out of the water: the boat
slows to 75% of its untrimmed top speed while throwing larger twin rooster tails. Starting from rest
at maximum trim takes about 11 seconds to reach its reduced forward top speed. The maximum-trim
rooster tail stays full-sized under forward throttle even from a standstill. Lowering back to 4
restores propulsion; spray fades after releasing the throttle. Holding Space does not repeat trim
changes, and Space still casts while fishing.

## Fuel and fishing

Owned fishing boats and speedboats start with separate full tanks. Each tank supplies five minutes
at maximum speed; consumption is proportional to speed, including reverse, and stops while fishing
or with engines off. Empty boats stop and can still fish to recover gas. Catches refill the current
owned boat up to 100%; catches from shore or the ferry build a reserve that transfers into the next
owned boat boarded, retaining any overflow. Tanks and reserve belong to the explorer and persist
across age levels, resets, and reloads. Relaunching never grants free gas.

Fishing takes place directly on the map. Five crystals buys a rod and five bait; a reusable lure
costs 20 crystals and does not use bait. Shore bait catches Bass, Salmon, and Catfish (+2–5% gas);
shore lures catch Snook, Redfish, and Trout (+5–10%). From any boat in shallow water, bait or lure
catches Tarpon, Wahoo, and Kingfish (+10–15%). Other boats show a hint as they approach the
deep-water boundary. Only the speedboat can enter the darker outer ocean, where it catches Tuna,
Blue-ringed Octopus, and Shark (+10–15%). Lead moving fish with a 0.9-second cast; tap R six times
to reel, with no two-second pauses. Catch badges show lifetime counts for the explorer across age
levels, adventure resets, and reloads. Existing counts migrate once into lifetime totals.

Fishing on an owned boat fills only available tank capacity; excess from that catch is not added
to reserve. Shore and ferry catches accumulate reserve; boarding an owned boat transfers only
what fits and retains unused reserve. Sponsorship uses the current age's catches, not the
explorer-wide lifetime badge total.

## Verification

See [testing](testing.md). Focus test names on `boat`, `ferry`, `gas`, `fish`, or `anchor`.
Verify launch/boarding, hull collision, exit/reboarding, parked vessel type and reload, fuel
ownership, and age/profile cleanup. Visually check dock clearance, anchoring, controls, and spray.
