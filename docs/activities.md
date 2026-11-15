# Activities

## Code map and integration

In `dist/app.js`: `nearWatersportsDock()`, `updateWakeboardUI()`, `startWakeboarding()`, `buyWakeboard()`,
`buyWaterskis()`, `canCallWatersportsBoat()`, `callWatersportsBoat()`, `advanceWakeboarding()`, `finishWakeboarding()`, `resetWatersports()`,
`startVolleyball()`, `hitVolleyball()`, `advanceVolleyball()`, `leaveVolleyball()`,
`resetVolleyball()`, `startFrisbee()`, `frisbeeAction()`, `advanceFrisbee()`, `leaveFrisbee()`,
and `resetFrisbee()`.

The `wakeboardRide`, `volleyball`, and `frisbeeGame` globals own active sessions. Their updates
are dispatched through `advanceSwimming()`; keyboard and touch handlers provide matching actions.
Changes must account for `nearby()`/`interact()`, UI availability, entry exclusions, draw order,
safe exit positions, and cleanup in profile/age/reset handlers.

Surfing has its own [document](surfing.md). Boat access and beach anchoring are documented in
[world and travel](world-and-travel.md); persisted ownership is in [saves and profiles](saves-and-profiles.md).

## Watersports

Buy waterskis for 100 crystals or a wakeboard for 25 crystals in Fishing & travel
beneath the Watersports equipment heading, alongside owned status. Purchases stay in this menu;
there is no separate equipment popup. Watersports gear is not listed in Island upgrades. At the Moonwater dock,
normal bottom-screen actions show Start wakeboarding (E) for an owned wakeboard and Start
waterskiing (R) for owned waterskis. Both actions appear when both are owned; either launches
directly without an equipment chooser. E and R work at the dock while a button has keyboard focus.
While the empty tow boat is away, Call watersports boat (E) replaces the launch actions
at the dock. The button and keyboard command bring it straight back to its berth for another
ride, without spending energy or crystals. A blocked berth must be cleared first. The call
is unavailable during a ride, recovery, dialogs, or boat destruction/repairs. When the Woodland Bridge crosses the
usual launch position, the rider starts closer to the tow boat with slack in the rope.
Waterskis appear as twin skis and use the same towing controls. Both purchases save per
explorer and age level. The boat automatically follows the center of the island channel to a
repeating open-water circuit with over 200 pixels of island clearance. WASD/arrows control the
wakeboarder; momentum and stern-mounted rope tension carry the rider through turns. X / Finish
wakeboarding animates the rope dropping and the rider settling into the water, then resumes swimming
at your current position while the empty boat returns to the dock. Hitting an obstacle releases the
rider while the empty boat finishes its programmed route and docks; land crashes use the shark
tumble, prone pause, head shake, and get-up animation. The tow boat uses the same acceleration/coasting helper, hull roll, outboard steering,
planing waterline, hull spray, spreading whitewater, and prop wash as the owned boats. Its
own motion and wake samples stay independent of the player's parked vessel. Course lookahead
slows it before bends; shared swept hull checks stop it before land, timber, or another boat.
The return approach gives the dock more clearance, brakes before the final low-speed docking
maneuver, and leaves foam fading in the water after it parks. Dialogs pause the motion and wakes;
profile, age, and adventure changes clear them. Board ownership and safe reload positions are saved.

## Sailing

Buy a windsurfer for 50 crystals in Fishing & travel or at the Sailing dock on
Moonwater Island, west of the Watersports dock. Ownership follows the other watersports
gear: per explorer and age, retained on reload and removed by adventure/profile resets.
E or tapping the dock buys it first; a second interaction launches into its clear berth.
Up/W accelerates, Down/S brakes, and Left/Right or A/D steers. Touch arrows use the same
controls; X/Escape or Return to Sailing dock ends the session safely on the pier.
Windsurfing uses strenuous energy scaling and returns to this dock on exhaustion.

`windsurfSession`, `startWindsurfing()`, `advanceWindsurfing()`, and `finishWindsurfing()` own
the session. Swimming marks the water occupancy, while the dispatcher bypasses swimmer
movement and sea mounts. Swept board hull checks block islands, piers, bridges, other boats,
and deep ocean. Saves record the safe dock position; activity resets clear the session.

The wind always blows from northwest to southeast. A sailing-only compass HUD shows the
source and direction, plus the current sail-handling stage. `windsurfDrive()` makes a beam
reach fastest, reduces downwind speed, and removes thrust inside a 40-degree head-to-wind
zone. Coasting bleeds speed in this zone; low-speed steering remains available to turn out.
Rig handling briefly reduces drive. `advanceWindsurfing()` uses steps of at most 20 ms.

`windsurferRig()` keeps the mast forward and the clew aft. `drawWindsurfer()` directly reuses
`drawSurfShortboard()` from surfing, including the rails, tail, deck colors and graphics.
`windsurferRiderPose()` keeps feet on the upwind rail, with the torso leaning northwest and
the face looking southeast regardless of board heading. Bent knees, articulated elbows,
gripping/open hands and hair sway animate independently of the board's rotation.

Crossing either wind axis starts an 1100 ms sail flip through `advanceWindsurferRig()`:
release the back hand, guide the clew around the outside of the bow with the front hand, then regrip and
exchange hand roles. `windsurferSailPose()` interpolates the swing and grip exchange without
snapping. The boom takes the long arc around the bow, away from the rider standing behind the
forward mast, rather than sweeping through their torso on the shorter sternward arc.
Tack hysteresis prevents repeated flips while hovering near a wind axis. The flip
clock and hand roles are session-only, pause in dialogs, and clear with the sailing session.
Departing repair crews share the board, wind-oriented rig and rider artwork. `recordWindsurferWake()` feeds
`recordHullWake()` at 0.42 scale, retaining the shared spreading bow foam and spray without
motor wash. Player and crew wakes have separate simulation-owned samples, age while stopped,
and pause in dialogs. Drawing does not advance their clocks.

## Beach volleyball

Mainland Beach spans the southern edge of the map, with colorful umbrellas, sunbathers, strolling
visitors, and three volleyball courts. Walk up to any court and press E / Play volleyball to join a
doubles match with your selected character and an AI beach teammate against two beach players.
WASD/arrows move, Space / Enter / Hit times a return, and X / Escape leaves. A landing ring guides
returns, ball arcs and the net affect play, and the first team to five wins. Matches can be replayed
and preserve access to your anchored boat. A compact top-center scoreboard shows both team
scores; play and leave actions remain in the bottom controls. Game messages are announced to
screen readers without a persistent instruction panel.

## Frisbee

Some Mainland Beach walkers carry frisbees. Stand near one and press X to play catch. Move with
WASD/arrows, press X to throw or catch a nearby disc, and Esc to leave. The compact top-center
scoreboard shows the current catch streak and best streak, with play and leave actions below.

## Verification

See [testing](testing.md). Focus test names on `wakeboard`, `waterski`, `watersports`,
`volleyball`, `frisbee`, `windsurf`, or `Sailing dock`. Verify launch eligibility, controls and touch equivalents, exit,
safe saves, profile/age cleanup, and boat access after returning to the map. For watersports,
check both equipment choices, rope release, collision recovery, and the empty boat returning.
