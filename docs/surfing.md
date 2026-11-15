# Surfing

## Code map

`dist/surfing.js` owns the rental and session functions (`rentSurfboard()`, `startSurfing()`,
`catchSurfWave()`, `advanceSurfing()`, `handleSurfKey()`, `stopSurfing()`, `resetSurfing()`),
coastal wave geometry/rendering, and the face-on riding view. `initSurfing()` binds controls.
`surfSession` and `surfClock` are transient globals; `state.surfRental` and `state.surfBest` persist
per age save.

The app supplies shared globals, the shack interaction, frame dispatch from `advanceSwimming()`,
world rendering calls, and safe-save/reset integration. Both scripts share global bindings;
see [architecture](architecture.md) before moving initialization or changing script order.

`surfSession.phase` includes paddling, takeoff, popup, riding, airborne, wipeout, and results. The simulation
uses steps of at most 16 ms inside `advanceSurfing()`. Pausing and dialogs must freeze the
relevant simulation and trails. `surfWaveSize()`, `surfRideScale()`, `surfRideView()`,
`surfBarrelState()`, and `surfAirHeading()` connect geometry, artwork, and scoring.

## Rental and coastal artwork

A surf rental shack on Mainland Beach rents a board for 20 crystals until it is returned. Ambient
beach swells have a rounded, shaded lip that peels right to left, trails scattered spray and
whitewater, then flattens into patchy foam against the mainland shore. `drawBeachShoreWash()`
continues each arriving crest onto the sand as a shallow sheet with a broken foam fringe, then
recedes across damp sand. It draws above the beach surface and beneath beach occupants and props;
`beachWaveWashProfile()` keeps the retreat continuous when the offshore wave cycle wraps.
The upward drifting spray
starts beside the mouth's top edge, where the lip meets the curl, with three lines fanning left.
Crumbling foam follows island coastlines; offshore waves clip to water beneath land. Renting adds
crests in the local break. Coastal wave height increases with distance from shore: the outer break
at 280 world units retains the original full-size wave, while every nearer wave is smaller.
Catching a coastal lip fixes that wave size for the takeoff and ride.

## Riding artwork

The face-on riding view uses a broad concave blue wave face with continuous lighting gradients,
a crest that lowers smoothly ahead of the curling lip via `surfFaceCrest()`, smooth water contours, a wider hollow barrel with a dark roof and reflected light along its inner
wall, and a translucent falling curtain tapering toward a later impact farther right. Fine rivulets,
rising white froth ribbons that bend around the breaking lip, subpixel droplets, and irregular foam
eddies add surface detail. `surfCrestFrothProfile()` gradually increases the crest foam’s width,
density, and brightness toward the curl; a broken core, translucent fringe, and fine spray blend
the shoulder into the falling lip. Froth runs along the whole crest, while face
ribbons follow `surfFaceFlowPoint()`: a pronounced quarter-oval arc with a shallow trough
stands up gradually toward the breaking curl. The upper open face retains a diagonal slope as
water rolls over the back; it does not turn into vertical streaks. `surfBarrelFrothFlowPoint()` continues the
slanted rising wall through a sheared oval roof before folding forward with the lip. The separate
barrel froth pass draws only curved roof fragments, avoiding fixed upward jets beside the curl.
Face, roof, and post-lip streaks keep constant opacity throughout their travel.
`surfFrothRibbonSpan()` keeps each rising ribbon alive until its tail has passed the lip; the
head rolls out of sight first, then the remaining tail follows. Face ribbons use surface clipping
instead of being removed when their scrolling anchor approaches the curl. The crashing lip has a
dense boiling foam core with porous texture and a wider impact plume; its spent whitewater extends to the right edge, tapering as
it ages. Crest plumes, falling fingers of whitewater, and dense broken foam at the base follow the
supplied surfing screenshot as a visual reference. The surfer flexes knees, shifts weight, and
counterbalances with their arms; stronger turns and higher speed generate larger rail spray and a
curved wake left along the actual board path. The board and planted feet follow the full travel
heading through cutbacks, while articulated knees absorb the turn and the shaded torso stays upright.
Rail pressure compresses the stance, banks the board, and extends the counterbalancing arms;
`surfBoardPerspective()` projects the deck from the travel heading and rail lean at the
current face height. Climbing straight up the face and flatter top turns expose more deck;
a committed bottom turn closes the deck toward an edge-on rail. This changes board width
without distorting the nose direction or planted feet;
the rider looks along the direction of travel. The crest and falling lip render before crest
poses. While riding inside the curl, `drawSurfTubeOccupant()` clips the rider and wake behind
the falling curtain, including complete visual occlusion; the curtain never paints through
the parts of the rider still outside it. The pop-up switches to an opaque standing pose
after the feet plant, avoiding a transparent silhouette during the transition. `emitSurfLipSpray()` adds a crest-anchored fan of spray on takeoff and carving within the
top 17% of the face. Spray grows with speed, turn rate, and the closest approach to the lip
during that climb, so later, sharper top turns throw a larger fan. `drawSurfLipSpray()` draws
a denser fan of drifting droplets, mist, and brief translucent water sheets above the lip
and behind the rider. `surfBoardLipDisplacement()` / `surfRenderedCrest()` scoop a local notch
and raise displaced shoulders in the visible crest and its foam fringe; the lip rebounds
over 0.65 seconds. This temporary surface detail leaves the underlying riding geometry intact. It ages with simulation time,
freezes on pause/dialogs, and resets on the next wave. Landings compress the stance and kick up a short burst
of spray.

## Controls and scoring

At the shack, the command list offers **Go surfing** (E or tap) without opening a panel.
It rents a board for 20 crystals when needed and starts paddling immediately; existing rentals
are reused without another charge. Insufficient crystals or energy leave the player ashore.
A **Return surfboard** command is available at the shack while a board is rented.
Entering a heat starts the overhead beach paddle-out. Use arrows / WASD (or touch directions)
to reach the shore break, then press Space/Enter or Catch wave within 30 world units of a
curling lip with the board pointing back toward the beach (Down / S). The actual
`paddleHeading` must be within 45 degrees of shoreward, including diagonal approaches;
pointing offshore or sideways rejects the catch with a turn-toward-beach prompt. This
uses the visible board heading as momentum turns, and applies to keyboard and touch alike.
The shore-break distance limits (65–280 units) and minimum 400 ms of paddling still
apply. Catch eligibility follows the moving, repeating curl and surface height used by
`drawBeachWaves()`; distant whitewater and the unbroken crest cannot start a takeoff.
A successful beach catch switches to the face-on wave view, with the surfer prone at the crest
on the shoulder to the left of the curl and the board pointing toward the camera. During paddling, the board and prone
body are foreshortened flat across the crest, with a round, camera-facing head; paddling progress
does not slide the surfer down the face. Elapsed takeoff time moves the curling lip closer:
`takeoff` advances the rider’s depth from 0.50 toward 0.81 over the 9.5-second catch window.
The pop-up retains `popStartX` and carries the rider only 0.08 back onto the shoulder, so
late catches drop close to the curl while early catches have more open face. Pause/dialogs
freeze this approach. Only the successful catch starts the downward pitch,
blending into the push-up and drop over the first 0.44 seconds of the pop-up. Tap Space/Enter or the touch Paddle
button repeatedly (roughly three taps a second) to alternate arm strokes and build catch momentum.
Holding a key does not generate strokes. `surfTakeoffDemand()` scales catch effort with the
selected wave size: small waves fill momentum faster, while the largest waves need about
2.3 times the work and a higher minimum stroke count (6–12 across the size range).
At the same tapping cadence, bigger waves take more strokes and longer to drop in. Players have about 3.5 seconds to make the first
stroke, including a two-second learning grace period. Power decays between taps; after the first
stroke, a pause of about 1.5 seconds
or failing to catch within 9.5 seconds loses the wave and costs a wipeout. A successful catch
runs a 1.15-second push-up, feet-through, standing transition and a descending turn onto the face.
`prepareSurfPaddleOut()` starts beach paddling, `catchSurfWave()` catches the coastal lip,
`prepareSurfTakeoff()` starts the close-up, `paddleSurfStroke()` applies one stroke, and
`surfTakeoffPose()` / `drawSurfTakeoffRider()` animate the prone and pop-up poses. Both takeoff
phases count toward the heat clock and freeze with pause/dialogs.
`recordSurfHullWake()` uses the boat/wakeboarder's shared `recordHullWake()`, `ageBoatWake()`,
and `drawBoatWake()` during paddling, pop-up, and riding: distance-spaced hull contacts,
connected spreading whitewater arms, turbulent center foam, and short-lived hull spray.
It uses 55% of the tow hull's size, further scaled to the caught wave size, and projects the
samples through the scrolling wave camera. `drawSurfHullWake()` clips the shared wake to the
wave face; `s.hullWake` is independent of the boat and wakeboarder accumulators. Riding still
adds turn/landing rail spray. Pauses/dialogs freeze trails, airs stop emission while existing
foam fades, and each new wave resets the samples. `surfWipeout()` captures the starting screen position, board heading, and whether the fall began
in the air. `surfWipeoutPose()` / `drawSurfWipeout()` tumble the detached rider down to the trough
in 0.95 seconds, then submerge the body beneath the trough over 0.28 seconds. A short splash
and foam rings feed a moving patch of overlapping foam lobes, pores, and white bubbles.
`drawSurfWipeoutSplash()` carries this patch up the face; `surfFaceFlowTangent()` locates
the ambient streak at its current position so its short flecks follow the nearby water angles.
The splash leaves no long trail behind it. `drawSurfWipeoutBoard()` tosses
an intact board alongside ordinary falls; air wipeouts split the original deck into two jagged
halves that spin apart. `surfWipeoutBoardPose()` then carries each floating piece along the
same local foam flow up the face, aligns it with the water, and rolls it out of sight over
the crest. `surfWipeoutBoardFlow()` wraps fragments around the local lip and clips them
behind the opaque wave on the far side; they stay opaque rather than fading above it.
Intact boards are swept up with the same flow. The animation uses simulation time, freezes for pause/dialogs, and clears
on the next wave. The broken board is an animation effect within the existing rental.
After the 3.6-second wipeout (including the rising splash), the surfer returns to overhead beach paddling to find the next lip; three
wipeouts end the heat. The selected coastal wave size persists throughout takeoff and riding.
The heat clock starts with takeoff and waits while paddling out.

Riding continues on the face-on scrolling wave: the surfer stays near screen center, travelling left
while water streams right, with breaking whitewater chasing from the right. Up/W climbs and Down/S
descends on short presses; linked short up-and-down carves build speed to escape the lip.
Higher lines carry speed and gain ground on the curl; low lines lose speed and fall behind.
Face height contributes both to speed changes and travel relative to the moving opening,
so descending to the trough no longer gives an automatic speed advantage.
Holding any direction progressively tightens the turn: rail pressure builds after 0.28 seconds and
reaches full strength after another 0.65 seconds. Up/Down continue around their climbing/descending
arc instead of stopping at a fixed diagonal; Left/Right rotate in opposite directions with the same
pressure ramp. Releasing or changing direction resets pressure. An engaged turn retains momentum: negative
speed changes from drag and climbing are reduced by 80%, with no extra steering penalty.
Pumping still adds speed; coasting takes full drag adjusted for line height. `advanceSurfTurn()` owns this
riding-only response; airborne spin controls remain separate. From near the top, hold Down or Left;
from near the bottom, hold Up or Right to fit a full 180-degree arc on a medium wave. The turn
then carries the rider back toward the breaking lip. Signed travel, board heading, hull wake, and
cutback scoring follow the actual rotation; a change in rotation direction resets the scored arc.
At the crest, climbing can carry the board past the top instead of pinning the rider there.
`surfTailClearOfLip()` compares the projected squash tail against the local crest at its actual
horizontal position. Turn onto a downward trajectory or jump before the tail leaves the lip;
continuing uphill (or flattening out after crossing) wipes out over the back. The available margin
follows board length, heading, and caught wave size, rather than a fixed timer. Air requests are
resolved before this check, so a timely jump clears the lip. Pauses freeze the crossing.
`surfBoardRotation()` connects the visible board to that heading.
Hold Space (or the touch action) for at least 160 ms while the nose crosses the lip and the rider
turns back down to trigger a snap. `surfNoseOverLip()` checks the visible nose against the crest;
a brief 220 ms reversal window allows the hold to register without requiring keyboard repeats.
`startSurfSnap()` runs a 0.62-second nose-engaged pivot back down the face, releases the tail,
throws a stronger lip burst, and awards points on completion based on snap quality: 150 for
Heck, 300 for Slash, and 500 for Layback Snap. `surfSnapTrick()` labels
small snaps **Heck**, medium snaps **Slash**, and the best snaps **Layback Snap**. `surfSnapPose()` /
`surfBoardFrame()` rigidly pivot the board around its fixed nose, exposing the flat deck
without shearing or stretching its outline. The rider shifts their hips and shoulders back
over the tail, with extended arms for counterbalance. Snap quality is set by crest proximity
and entry speed: the best late snaps yaw the released tail partially left of the planted nose
at peak release, then realign smoothly for the descent. This remains a rigid board rotation; the weight returns forward as the tail reconnects. The maneuver keeps
its speed, freezes for pause/dialogs, and finishes even after Space is released. One hold triggers
one snap. Away from the reversal, fresh Space presses retain normal air controls; paddling still
requires separate taps. The action label advertises holding to snap. Ride
inside the barrel curtain for **Tube Ride!** (half coverage retains 4× line points, fully
under it earns 2×). Each entry adds one completed Tube Ride! to the heat history.
`surfBarrelState()` separates coverage from survival: a rider can remain fully hidden inside
the curl while within 55 wave-view units behind the falling lip’s opening edge. Only exceeding
that distance wipes out from being caught by the break. `surfTubeOpening()` shares the
curtain edge with the occupant clip at every caught wave size. The HUD shows **IN THE TUBE**
while hidden; a faster high line can bring the rider back out. Press Space at the
crest while climbing with speed to launch an air. During flight, the curl continues peeling
forward toward the rider; speed can reduce its approach but cannot send it backward.
Ocean scroll stays forward during aerial spins; signed reversal still applies to riding cutbacks.
Use left/right for spins, then land with the
visible nose pointing anywhere down the face (the open lower half-circle), including back toward
the curl. Horizontal and upward landings wipe out. `surfAerialTrick()` names completed rotations **Single / Double / Triple / Quad Alleyoop**
for a forward (left, negative) spin and **Single / Double / Triple / Quad Backflip** for a
backward (right, positive) spin. The peak signed rotation determines the label even when
the rider adjusts the landing. Successful airs award a speed boost and 300 points for a basic air, with progressively larger
bonuses for completed rotations: 900 for a single, 1,800 for a double, 3,000 for a triple,
and 4,500 for a quad. Failed landings earn no aerial bonus; Down helps align the board.
Each successful pop-up banks a wave-size bonus through `surfWaveBonus()`: 300–1,200 points
across the full wave-size range, rounded to 50 points (about 500 near shore, 800 on a medium
wave, and 1,200 on the largest). Failed takeoffs earn no wave bonus. Each new wave adds its
bonus to the current heat total. Ordinary riding earns only `2 + speed × 4` points per second
(about 2–5), retaining the barrel multipliers above, with no bonus for simply crossing face
bands. Linked carves earn 50 points and completed cutbacks earn `round(200 + speed × 300)`.
Trick complexity supplies the larger rewards instead of time spent coasting. Heats last 90 seconds or three
wipeouts; another heat uses the same rental. P pauses, X returns to the beach, and touch buttons
mirror the controls. Best scores, rental state, and safe beach positions persist. Controls take
inspiration from the [California Games Lynx
manual](https://atariage.com/manual_html_page.php?SoftwareID=2413); original procedural wave artwork
takes visual inspiration from [Surf
Sandbox](https://store.steampowered.com/app/4480760/Surf_Sandbox/).

## Surf HUD

Large speed sits at top left, completed tricks at top center, and large points at top right
with the heat timer directly below. The directional pad and action button are enlarged and
separated at the lower corners, with compact variants for narrow and short screens.
`recordSurfTrick()` keeps up to 12 completed tricks for the current heat; the center shows the
latest name and bonus plus the previous three. It survives wave retries and resets for a new
heat. Instructions stay in a separate lower message so they do not replace completed tricks.
The action button retains its existing keyboard/touch behavior and hold-to-snap support.

## Change boundaries and verification

Wave artwork and collision/scoring geometry must agree at every caught wave size. Coastal waves
clip to water around islands and Mainland Beach; occupant masking and foam interact with the
main renderer. See [rendering](rendering-and-effects.md).

See [testing](testing.md). Focus test names on `surf`, `wave`, `barrel`, `air landing`, `crest`,
`lip`, or `froth`. Verify rental persistence, repeated-stroke catches, missed-wave recovery, pop-up transitions, size scaling, carving and speed,
visible board landing angle, scoring, pause, exit, and safe reload position. Browser inspection
is required for wave appearance, spray, layering, and keyboard/touch feel.
