# Boats and fishing

## Code map

All entry points are in `dist/app.js`.

| Area | Entry points |
| --- | --- |
| Boats | `launchBoat()`, `launchSpeedboat()`, `boardOwnBoat()`, `exitBoat()`, `returnBoat()`, `driveBoat()`, `moveBoat()`, `boatPoseClear()` |
| Ferry | `openFerry()`, `confirmFerryBoarding()`, `buyFerryTicket()`, `boardFerry()`, `advanceFerryRide()` |
| Anchorage | `buyBeachPass()`, `anchorBoatAtBeach()`, `returnToAnchoredBoat()`, `restoreBeachAnchor()` |
| Fishing | `fishingTier()`, `fishingTargets()`, `castFishing()`, `reelFishing()`, `landHookedFish()`, `advanceFishing()`, `sponsored()` |

See [world and travel](world-and-travel.md) for island access, swimming, energy, and mounts.
See [saves and profiles](saves-and-profiles.md) for ownership and migration,
[rendering](rendering-and-effects.md) for motors/effects, and [activities](activities.md)
for watersports and beach games.

## Beach anchoring

Every boat includes an anchor for ordinary offshore exits. Buy a permanent 50-crystal beach
pass directly in the Fishing & travel menu to access Mainland Beach, including swimming ashore. The pass stays with the explorer
across age levels, adventure resets, and reloads. Older purchased anchors automatically become
beach passes without another charge; a full profile reset removes the pass.

With a pass, within 105 world pixels of the shore, Q or Anchor & go ashore parks the fishing boat,
speedboat, or ferry and animates the trip ashore. Without a pass, the action opens Fishing & travel to buy one.
Return to the mooring flag and press E or Return to anchored boat to reboard. Boat position, type,
and beach mooring persist across reloads.

Arriving offshore without a pass shows a 50-crystal reminder once per approach. Swimmers also
get a Beach pass required purchase action that opens Fishing & travel. Five lifeguard chairs
span the entire coast at equal intervals. The nearest guard climbs down, runs along the sand
to the swimmer’s shoreline position, and waves both arms with a beach-pass reminder. Guards
return to their chairs after the swimmer leaves or buys a pass. They do not restrict ordinary
boat anchors; the beach pass still gates going ashore.

## Ferry

A ferry waits at the main island dock. A 25-crystal ticket buys one five-minute ride, consumed on
boarding. Fishing & travel uses a title and purchase or use button for each item, without descriptive
subtext or a Go fishing navigation link. Ferry Pass switches from purchase to boarding controls after purchase. Buying a pass here does not move the player or start the timer.
E at the dock shows a compact map confirmation: Enter/E uses the ticket (or buys and
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
Launch fishing boat action in the normal map actions near the fishing dock, outside the fishing menu.
Dock commands are Go fishing (F), Launch fishing boat (E, once sponsored), and Dive into the sea
(X, when clear water is within reach). `canFishAtDock()` gates the dock actions and fishing shortcut. Persistent map hints explain casting and boat controls. X /
Exit boat automatically moors at a nearby dock, parallel to the pier, with the stern toward land and bow facing open
water, then steps ashore. `nearbyBoatDock()` includes the berth approach and picks the closest
berth; dock exits take priority over beach anchoring. `dockedBoatPose()` keeps a small hull gap (2.5 pixels for the ferry, four for owned boats) alongside the pier, sliding along its length
to clear shore and trying the other side when occupied. It provides hull clearance
and the same stern-first pose for Return boat. Dock boarding reach includes the clearance
needed by parallel hulls beside narrow island shorelines. Saved ferries parked beside a dock
adopt the snug berth on reload; occupied rides and offshore/beach moorings retain their positions. Offshore, the rider first throws an anchor with an unfurling
rope, then dives into the sea. The boat stays still during the throw and the rope remains while it
is moored. Anchor throws land in clear water at least 72 pixels from the boat. Reboarding
automatically hauls the rope and anchor aboard before steering resumes; beach moorings retain their
anchor position across reloads. Swim with WASD/arrows, walk onto shore, or use E beside your parked
boat to reboard. Fish from your boat or return it to the dock; Crystal Cavern can be reached without
a ferry pass. Sponsorship is saved per age level.

Earn or hold 100 crystals to unlock the main island’s new speedboat dock, southeast of the original
harbour. No crystals are spent. The unlock stays with that explorer across age levels, adventure
resets, and reloads; existing saves with 100 earned crystals or a balance of at least 100 also
qualify, including admin grants. Launch with E at the dock or tap the dock. Fishing & travel
provides supplies, beach pass, ferry pass, and watersports purchases.
The teal-and-white speedboat has three outboards with
coordinated steering, exhaust, wakes, and trim spray. Its forward acceleration and top speed are 25%
above the fishing boat, with quicker steering response and a tighter turning circle even at full
speed. Its top speed advantage applies at every matching trim setting (175 versus 140 at neutral
trim; 206.5 versus 165.2 at trim 4). Fishing, anchoring at the beach, outer-island docking, saved
parking, reboarding, and dragon-fire explosions work with the speedboat.

## Automatic boat repairs

Dragon fire can destroy the sponsored fishing boat, speedboat, ferry, and watersports tow boat.
After the existing 11.8-second ignition/explosion/debris sequence, two repair workers parachute onto
that vessel's home dock over 3 seconds and rebuild it for free. Construction gives every feature two distinct steps: frame then hull, primer then paint,
unfinished then finished deck, steering column then wheel, and each engine's mounting/lower unit
then its cowling, one engine at a time. The speedboat adds its windscreen frame then glass; the
tow boat fits then finishes its tower. The ferry separately builds cabin walls, roof, windows,
chimney, flagpole, and flag, each in two steps. Dock labels name the current feature and step.
The crew descends under colored parachutes, lands on the pier, and folds the canopies before
construction starts. Workers stand and hammer while building. On completion, each worker jumps
onto a waiting windsurfer and sails away through a clear sea lane, leaving a wake. `BOAT_REPAIR_TIMING` keeps all
durations together: fishing 20 seconds, tow 30 seconds, speedboat 40 seconds, ferry 60 seconds,
measured from crew arrival. Departure takes 7 seconds, including an 800 ms jump onto the boards; the vessel is usable
as soon as construction finishes, subject to ordinary sponsorship, ownership, energy, and ticket rules.

`boatUnavailable()` guards launching, ferry confirmation, reboarding, beach returns, and tow
activities through destruction, crew arrival, and construction. Dock interactions explain that
repairs are underway. Each vessel has an independent session-only `boatRepairs` entry; repeated
fire cannot restart a repair. Repairs progress offscreen and during other activities, but modal
dialogs pause their clocks. Rendering never advances construction.

`restoreRebuiltBoat()` returns the vessel to its home berth and clears its stale parking, beach
mooring, and anchor references as soon as destruction is registered. Offshore occupants stay
swimming; interrupted fishing, driving, or towing never resumes automatically. Rebuilding does
not change sponsorship, unlocks, equipment, fuel tanks/reserve, tickets, or remaining ferry time.
Existing ferry countdown rules continue during repairs. Reload ends the session-only effects,
with one docked vessel and the usual safe saved explorer position. Profile/age switches and
adventure/full-profile resets clear explosions and crews through `resetPetDragon()`.

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

Fishing takes place directly on the map, without a fishing panel or distance labels. Buy supplies
in the left Fishing & travel submenu. Start fishing from the dock or boat actions, or with F. Five crystals buys five bait; lures
cost 20 crystals, are used automatically once owned, and do not use bait. There is no tackle
selector. Shore fishing always catches Bass, Salmon, and Catfish (+2–5% gas), with bait or lures.
Existing Snook, Redfish, and Trout catch records remain in the lifetime log. The permanent
bottom-left fish icon toggles `catchHistory`; `updateCatchHistory()` shows the selected explorer’s
lifetime species counts and total, across ages and adventures. Feedback appears above the normal
map actions; Reel appears when a fish is hooked, and Stop fishing remains available throughout.
Click/tap water to cast, use arrows to aim, Enter/Space to cast, R to reel, and Escape to stop.
There is no separate tackle selector, shop popup, or catch log inside the fishing activity. From any boat in shallow water, bait or lure
catches Tarpon, Wahoo, and Kingfish (+10–15%). Other boats show a hint as they approach the
deep-water boundary. Only the speedboat can enter the darker outer ocean, where it catches Tuna,
Blue-ringed Octopus, and Shark (+10–15%). Lead moving fish with a 0.9-second cast; tap R six times
to reel, with no two-second pauses. Catch badges show lifetime counts for the explorer across age
levels, adventure resets, and reloads. Existing counts migrate once into lifetime totals.

Fishing on an owned boat fills only available tank capacity; excess from that catch is not added
to reserve. Shore and ferry catches accumulate reserve; boarding an owned boat transfers only
what fits and retains unused reserve. Sponsorship uses the current age's catches, not the
explorer-wide lifetime badge total.

`fishingCastPose()` drives the rod and gripping hand through backswing, release, and follow-through.
`drawFishingAngler()` renders the detailed explorer, braced legs, jointed arms, and attached reel for
idle aiming, casting, and hooked-fish retrieval on shore and all three boats. `hookedFishingPose()`
drives the loaded-rod lean and reel crank from elapsed simulation time and each accepted pull.
Fishing replaces the ordinary walking/boat occupant sprite so no static arms remain beneath the pose.
Drawing does not advance fishing state; dialogs pause the cast and reel animation clocks.

## Verification

See [testing](testing.md). Focus test names on `boat`, `ferry`, `gas`, `fish`, or `anchor`.
Verify launch/boarding, hull collision, exit/reboarding, parked vessel type and reload, fuel
ownership, and age/profile cleanup. Visually check dock clearance, anchoring, controls, and spray.
