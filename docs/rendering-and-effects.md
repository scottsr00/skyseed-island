# Rendering and effects

## Code map and conventions

`dist/app.js` contains the main `draw()` orchestration, `resizeMap()`, `drawMiniMap()`,
Canvas primitives (`rect()`, `ellipse()`, `polygon()`), sprites, world effects, and camera logic.
`dist/surfing.js` supplies coastal waves and surfing artwork. `dist/style.css` owns the surrounding
HUD, panels, responsive controls, and CSS collection art; `dist/index.html` owns markup and SVG icons.

The main renderer uses world coordinates under the camera transform. HUD/minimap and the surfing
view have their own coordinate assumptions. Check transforms and viewport dimensions before
adding a draw call. `resizeMap()` configures resolution/device-pixel ratio and disables Canvas
image smoothing, with backing resolution up to 3× for high-density displays. Surf water intentionally uses smooth subpixel shapes; island scenery retains
pixel contours. Explorer, companion, and beach character details use fractional coordinates
through `characterRect()`, `characterEllipse()`, `characterLimb()`, and `characterHead()`
for finer silhouettes and continuous joints. Explorer arm swing, knee flexion, body bob, and
hair sway follow the existing distance-driven `walkingStep()`; rendering does not advance the gait.
The explorer renderer supplies mounted riders and court play; `drawSeatedBoatRider()` supplies
boat occupants with bent legs, forward arms, and heading-based facing. Side-view
shoulders sit behind the chest, elbows bend forward, and arms counter-swing against their legs.

## Presentation

Full-window browser map with responsive camera proportions, floating crystal/status displays, a
left-side rail of flat pixel-art icons, grouped submenus, and nonmodal map panels, and fishing
actions over the map. Permanent bottom-left fish and chest icons open lifetime catch history and the secret stash; fishing
supplies live beneath Go fishing in the Fishing & travel submenu. Cast feedback and toast messages reserve space above the
suggested actions, with no fishing popup panel. Suggested action buttons share one horizontal
row, scrolling sideways on narrow screens instead of stacking beneath messages.

Keyboard (WASD/arrows), touch movement, and tappable destination markers.

Optional synthesized sound. All pixel artwork is original Canvas code.

`drawDockSign()` mounts matching blue signboards on the fishing, ferry (both landings),
watersports, and unlocked speedboat docks. Dock names appear on these boards instead of
floating labels over the water.

## Layering boundaries

Swimmers and sea mounts pass beneath bridges, piers, and hulls. Airborne water entries draw
above decks and hulls until the 434 ms contact; submersion returns to the water-occupant layer. Raised-timber shadows, water
clipping, coastal wave masks, boat spray, and dragon altitude all affect visibility. Preserve
`draw()` ordering and paired Canvas save/restore operations. See [surfing](surfing.md) for
wave shape and occupant masking, and [world and travel](world-and-travel.md) for movement rules.

Rendering changes should keep effects tied to simulation state. Check whether an effect is
advanced during update or generated at draw time, especially when adding pause/reload behavior.

## Water entry animations

`airborneExplorerPose()` and `drawAirborneExplorer()` reuse the detailed shore explorer for
straight dives, forward rolls, and backflips. Dives extend both arms above the head and straighten
the legs; rolls and backflips pull the knees toward the chest, then open before entry.
`waterEntryFrame()` places each pose on its airborne arc and carries the body beneath the
waterline after the existing 434 ms contact. `drawWaterEntry()` clips the submerging body at the
impact surface, then fades into swimming. The existing 700 ms sequence, random style selection,
contact splash, movement path, pause behavior, and cleanup remain in the update code.

## Shore landings and climbs

`shorePoseFrame()`, `shorePoseTrack()`, and `drawShoreExplorer()` share a detailed articulated
explorer across `drawFastShoreTumble()`, `drawShoreRecovery()`, and `drawShoreClimb()`.
Poses use travel direction, body width, and height; `shoreScreenPoint()` preserves side-view
thickness and projects elevation upward. Falls tuck into a forward roll, open onto the ground,
and match the initial prone recovery pose. Recovery keeps the breathing pause and head shake,
then plants the hands, brings a knee underneath, and stands. Climbing reaches for the actual
shore edge, keeps the hands planted during the pull, raises the near knee while the trailing leg
stays extended, plants the leading foot, then brings the trailing leg underneath and settles into the ordinary explorer silhouette. Existing movement timing, access checks,
goggle tosses, and reset/pause behavior remain owned by the travel update paths.

## Removing swimming gear

`goggleRemovalPose()` drives a hand-to-temple reach, pushes the goggles and snorkel above the
head, then swings the hand toward the water. At 280 ms, `advanceGoggleToss()` captures the release
point; the gear flies independently and splashes at 600 ms. The hand follows through and lowers
by 460 ms. `drawGoggleToss()` replaces the corresponding ordinary arm while the gesture is active,
including prone shore recovery. Held gear follows the explorer until release; the release point
and water target stay fixed afterward. The existing 1300 ms cleanup and profile/reset rules apply.

## Swimming characters

`drawSwimmingCharacter()` uses a shaped shirt with shoulders, a tapered waist, a waistband,
and shading that rolls with the existing arm stroke. `swimmingLegPose()` produces fixed-length
hip/knee/ankle joints with alternating vertical flutter kicks, recovery knee flexion, and delayed ankle
extension. Leg spacing stays fixed; height uses a separate z coordinate. `projectSwimmingLeg()`
projects elevation upward on screen at every swimming heading; `drawSwimmingLeg()` draws tapered trousers, heels, and pointed toes. Kick splashes
follow the animated toes. Surfboard paddling shares the anatomy with a reduced kick amplitude.
All poses derive from the existing swimming/paddling clock and effort. Idle swimmers still settle
to head-only treading, and existing wave clipping, underwater layers, arm strokes, and pauses apply.

## Boat motors and spray

The ferry and fishing boat display twin outboards with trim-adjusted lower units. Spray uses
individual gravity-driven droplets carried by the boat’s motion, with varied launch speeds, fine
mist, and small landing splashes.

Outboards swivel together with steering, reverse their angle for reverse thrust, and direct spray
with the engines. The ferry carries larger outboards. Boarding a boat starts the motors with a brief
exhaust puff and a 0.55-second startup before propulsion engages.

The speedboat uses three coordinated outboards. Vessel performance and trim rules are owned by
[world and travel](world-and-travel.md).

The ferry, fishing boat, speedboat, and watersports tow boat share `boatHullWake()` for
attached foam and `recordHullWake()` for world-space wake emission. At low forward speed, water breaks at the bow. From 18% to 76% of each vessel's
trim-4 top speed, a smooth transition moves the contact aft along its hull edge as it planes.
Slowing moves the contact forward again. `drawBoatBowWake()` follows that waterline, while
`recordBoatMovement()` and `updateTowBoatMotion()` leave wave fragments at the same contact region. Existing fragments
stay in the water through turns and fade after stopping. Reverse emits no bow foam.

Hull contact throws short airborne fans of spray through `drawBoatHullSpray()`, with more
droplets and greater height and reach as speed increases, including at neutral motor trim.
The spray derives from the age and recorded velocity of world-space wake fragments.
`drawBoatWakeArm()` connects successive world-space samples into two narrow, diverging
whitewater arms. A broad translucent wash supports each bright crest, with fine foam spilling
outward and dispersing as it ages. Gaps in recorded water samples break the ribbon.
All four vessels leave a widening, aerated propeller wash between the outer arms.
`ageBoatWake()` and `drawBoatWake()` accept each vessel's motion explicitly; the tow boat keeps
its own samples through rider release and leaves residual foam fading after docking. Its single
outboard uses `drawOutboardMotors()` with its own steering, power, and phase. `boatVelocityStep()`
supplies acceleration, braking, and coasting for both manual driving and the course-following tow boat.

Boat turns drive a damped roll through `advanceHullRoll()` and `boatRollTarget()`, using signed
speed times turn rate. The speedboat leans most, the ferry least; straightening, stopping, fishing,
and anchoring let the hull settle level. The tow boat uses course curvature and preserves its roll
when releasing the rider. Roll is transient simulation state and pauses with dialogs.
`beginBoatHull()` projects the deck, motors, chines, and V-shaped keel using heading and roll.
The shallow chine tapers inward to a raked, varying-depth keel, keeping the exposed bottom V-shaped.
`boatHullLift()` uses squared sine of bank so lift eases smoothly through level during turn reversals;
riders, motors, and cabins follow that lift. Back-face culling and water-surface clipping expose only
the raised, visible underside, so the
amount of bottom showing depends on the viewing angle. Cabins lean with their hull. Seated occupants use the full hull roll for their seat, bent legs,
steering wheel, and upper body at every heading. `beginBoatRiderLean()` projects torso elevation
with the same roll as `boatHullProjection()`; steering reversals follow the actual hull bank
until it settles onto the other side. `drawBoatRiderHead()` follows the banked neckline with
a rigid rotation so the head keeps its proportions instead of stretching with torso foreshortening. `drawBoatSteeringWheel()` supplies a mounted, spoked wheel that stays visible
when parked. Seated riders grip its rim, bending their elbows as they lean; the spokes turn with
outboard steering. The tow-boat driver has a matching wheel. World-space wakes and shadows stay
on the water. Boat shadows use soft oval footprints so a hard-edged shadow cannot resemble
a rectangular hull beneath the banked deck.

## Dragon shadow

`drawPetDragonBody()` supplies the colored dragon and its ground silhouette from the same
wing, tail, body, leg, head, and horn geometry. The shadow follows heading, mirrored facing,
and the current wingbeat, compressed onto the ground with the existing altitude offset.
Its parts form one filled path so overlapping anatomy has uniform opacity. Fire, water droplets,
and the rider are drawn separately from this silhouette.

## Dragon fire and environmental reactions

If a standing explorer is in the pet dragon’s visible fire plume, a small flame flickers in their
hair for 0.65 seconds, then fades into rising smoke. The effect follows the head, is cosmetic only,
triggers once per breath, pauses for dialogs, and clears on explorer or age changes. Mounted riders
are excluded.

Dragon fire ignites trees touched by its plume, including pines and palms on outer islands. Burning
trees keep their original broadleaf, pine, or palm shape, darken, and burn away from the crown down
to ash over 4.2 seconds. Their rising flames use the dragon’s layered, rippling fire renderer,
including flame tongues and embers. Hit detection follows the dragon’s flight heading and altitude.
Tree fires pause for dialogs and reset with the dragon when changing explorers, age levels, or
resetting the adventure. After burning down, trees gradually grow from a small sapling back to their
original size over five minutes of active play, while the ash fades. Regrowth pauses for dialogs
too.

Beach sunbathers use tapered swimwear, rounded articulated limbs, varied hair and sunglasses.
Resting poses vary between relaxed arms and hands behind the head, with occasional bent knees.
`drawSunbatherHead()` and `drawSunbatherTorso()` keep their appearance consistent while resting,
drying off, fleeing and swimming. `drawSunbatherTowel()` adds striped woven edges and fringe.

Dragon fire also ignites beach umbrellas, including those outside the camera view.
`burnableUmbrellas` registers the fixed umbrellas from `beachSunbathers()`;
`checkDragonFireSceneryHits()` shares the tree plume sampling, heading, and altitude checks.
`drawBurningScenery()` preserves each umbrella's colored canopy and pole while darkening and
consuming them from the canopy down over 4.2 seconds, with flames, smoke, and remaining ash.
Umbrellas stay burned for the session; reload, explorer/age changes, and adventure resets restore
them through the dragon reset path. Each canopy has a raised peak above its curved rim.
Ignition replaces that umbrella owner's spray/drying reaction with a fire reaction: they stand up,
wave both arms, and run toward the local shoreline before swimming just offshore.
`fleeingSunbatherPose()` derives travel from active reaction time, including offscreen updates;
they stay in the water until the dragon/beach resets. Dialogs pause burning and reactions.
Trees keep their existing regrowth.

Dragon fire also explodes the ferry, sponsored fishing boat, speedboat, and watersports tow boat when the plume
touches their hull or cabin. The hull stays visible while flames spread for 1.8 seconds, then erupts
into a detailed, smoothly shaded fireball with sparks, rolling smoke, and a water pressure ring.
Sixty-four recognizable pieces (planks, hull panels, glass, engines, rails, and seats) tumble along
gravity-driven trajectories. Each piece checks the shoreline at impact: sea impacts make individual
splash crowns and ripples, with wooden wreckage floating briefly and metal sinking; pieces on land
bounce, slide, and settle. Wreckage fades after 11.8 seconds, then a repair crew arrives at the home dock. Occupants drop
into swimming, and boarding stays blocked through reconstruction. Explosions respect the dragon’s
heading and altitude, pause during dialogs, and clear with explorer, age, or adventure resets.

Spraying a beach volleyball player interrupts that court: the sprayed player throws the ball toward
your position, then walks or swims to collect it and carries it back before play resumes. Balls that
land offshore float with small ripples. Repeated spray does not restart a retrieval; reactions pause
during dialogs and clear on explorer, age, or adventure resets. Boat spray passes in front of a
nearby dragon when the droplets are above his height, and behind him when he flies above them.

Effect entry points include `drawDragonFlame()`, `drawPetDragonFire()`, `drawPlayerHairEffect()`,
`createBoatBlast()`, `drawBoatExplosions()`, `drawBurningTree()`, `drawVolleySprayReactions()`,
and their advance/reset helpers. `advancePetDragonFire()` also owns independent `boatRepairs`
clocks and dispatches crews when debris expires, carrying any excess simulation time forward.
`advanceSwimming()` runs this effect update before activity/anchor early returns; its later
`advancePetDragon(dt, false)` updates the dragon without advancing fire twice.
`boatRepairFrame()` derives arrival, construction, and departure poses without mutation.
`boatBuildPlan()` orders the vessel's features; `boatBuildPart()` gives each feature two discrete
steps. `drawBoatRepairs()` draws the cradle and frame, then calls the matching vessel renderer
with the current build plan. Vessel renderers gate paint, deck, cabin walls/roof/windows/chimney,
flagpole/flag, windscreen/tower, wheel, and individual engines rather than clipping a finished sprite.
`drawOutboardMotors()` installs each engine's bracket/lower unit before its cowling;
`drawBoatSteeringWheel()` installs the column before its wheel. Normal rendering defaults to all
features complete. `drawBoatRepairWorker()` shares `drawLifeguardSprite()` with a work uniform
and suspended, hammering, jumping, or braced windsurfing poses. `boatRepairCrewPose()` derives
parachute descent and canopy folding, an 800 ms jump onto a water-fixed board, then accelerating
sail-off and a short final fade. `drawRepairParachute()` draws the canopy and suspension lines;
`drawRepairWindsurfer()` draws the board, upright mast, filled sail, boom, and wake.
`createBoatRepair()` selects independent clear-water departure routes with
`boatRepairWindsurfRoute()`; no crew collision or movement changes the explorer or repaired vessel.
`drawBoatRepairCrew()` draws all of this above the dock without mutating animation state.
Arrival remains 3 seconds; departure is 7 seconds. All crew/tool motion uses the repair clock,
so dialogs freeze it too.
Timing and recovery policy are detailed in [boats and fishing](boats-and-fishing.md).
`resetPetDragon()` clears tree fires, regrowth, boat explosions, repair crews, and hair effects; `resetVolleyball()` clears spray reactions.

## Beach lifeguards

`BEACH_LIFEGUARDS` places five evenly spaced elevated chairs with red-and-white sunshades
along the full coast. `advanceBeachLifeguards()` controls descending, running, waving, returning,
and climbing back up. `drawBeachLifeguards()` draws the chairs, guards, and waving reminder
inside `drawMainlandBeach()`. `drawLifeguardSprite()` supplies distinct front, back, left, and
right walking poses; facing follows travel and alternating arm/leg strides follow distance moved.
`lifeguardLadderPose()` traces a 1.5-second path from seat to top rails, down the sloped ladder,
and onto the sand. `drawClimbingLifeguard()` alternates hand grips and tucked knees facing the
ladder; returning guards walk to its foot and reverse the climb into their seats.
Animation uses simulation time, pauses for dialogs, and is not saved.
`sprayBeachLifeguards()` sweeps each boat-spray droplet against the guard’s visible sprite bounds using
the rendered `y - z` projection, including seated and climbing guards. Real maximum-trim spray
peaks below the seat height, so requiring that physical elevation would miss visible splashes. A splashed guard uses the same ladder/run/wave sequence,
with a WATCH THE SPRAY warning even when the boater owns a beach pass. The reaction lasts up to
12 seconds and ends early when the boater leaves the coast or vessel. Repeated spray does not
restart it. Spray checks use their own per-droplet cursor so other beach reactions still work.
`resetBeachLifeguards()` clears reactions and approach reminders on profile/age/adventure changes.
Dragon fire checks all five `burnableLifeguardChairs` using the shared plume hit test, including
stations outside the camera view. A chair burns to permanent session ash over 4.2 seconds.
`igniteLifeguardChair()` interrupts the guard's current action; they jump clear over 0.8 seconds,
then dig and shovel sand into a growing castle for 20 seconds of active play.
`lifeguardDigPose()` eases a 2.6-second reach/plant/press/scoop/lift/throw/recover cycle.
`drawDiggingLifeguard()` keeps staggered feet planted while knees, hips, torso and head follow
the effort; articulated elbows keep both hands on one rigid shovel. Sand stays on the blade
until the throw, then arcs onto the growing castle. Head, shoulders, and feet turn toward the
castle during the lift and throw, then ease back toward the excavation for the next scoop.
All poses use active simulation time.
`advanceLifeguardRebuild()` then sends them up the sand steps over 1.5 seconds to sit facing
the ocean. `lifeguardStation()` makes the finished castle their new lookout, so warnings and
return trips keep working. The castle is sand and does not burn. Dialogs pause the sequence;
dragon reset, reload, and profile/age/adventure changes restore the original chairs and guards.
See [boats and fishing](boats-and-fishing.md) for pass access and approach behavior.

## Verification

See [testing](testing.md). Drawing tests use Canvas substitutes: they can detect exceptions and
some geometry regressions, but do not establish visual quality. Inspect the affected scene in a
browser at desktop and narrow/touch sizes. Check camera edges, layering above/below structures,
paused frames, effects lifecycle, and recovery after profile/age/reset changes.
