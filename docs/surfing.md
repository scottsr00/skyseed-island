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

`surfSession.phase` includes paddling, riding, airborne, wipeout, and results. The simulation
uses steps of at most 16 ms inside `advanceSurfing()`. Pausing and dialogs must freeze the
relevant simulation and trails. `surfWaveSize()`, `surfRideScale()`, `surfRideView()`,
`surfBarrelState()`, and `surfAirHeading()` connect geometry, artwork, and scoring.

## Rental and coastal artwork

A surf rental shack on Mainland Beach rents a board for 20 crystals until it is returned. Ambient
beach swells have a rounded, shaded lip that peels right to left, trails scattered spray and
whitewater, then flattens into patchy foam against the mainland shore. Crumbling foam follows island
coastlines; water clipping and drawing waves beneath land keep the islands clear. Renting adds
catchable crests in the local break. Wave height increases with distance from shore: the outer break
at 280 world units retains the original full-size wave, while every nearer wave is smaller. Catching
a wave fixes its height for that ride; paddle-out controls show the available size.

## Riding artwork

The face-on riding view uses a broad concave blue wave face with continuous lighting gradients,
smooth water contours, a wider hollow barrel with a dark roof and reflected light along its inner
wall, and a translucent falling curtain tapering toward a later impact farther right. Fine rivulets,
rising white froth ribbons that bend around the breaking lip, subpixel droplets, and irregular foam
eddies add surface detail. Froth runs along the whole crest, thickening toward the break, while face
ribbons rise rapidly around the rolling surface. The crashing lip has a dense boiling foam core with
porous texture and a wider impact plume; its spent whitewater extends to the right edge, tapering as
it ages. Crest plumes, falling fingers of whitewater, and dense broken foam at the base follow the
supplied surfing screenshot as a visual reference. The surfer flexes knees, shifts weight, and
counterbalances with their arms; stronger turns and higher speed generate larger rail spray and a
curved wake left along the actual board path. Landings compress the stance and kick up a short burst
of spray.

## Controls and scoring

E at the shack opens rentals; paddle with WASD/arrows and catch a passing crest with Space/Enter.
Riding switches to a face-on scrolling wave: the surfer stays near screen center, travelling left
while water streams right, with breaking whitewater chasing from the right. Up/W climbs and Down/S
descends; linked up-and-down carves build speed to escape the lip, while coasting loses speed. Ride
half inside the barrel curtain for 4× line points (fully under it earns 2×). Press Space at the
crest while climbing with speed to launch an air, use left/right for spins, then land with the
visible board pointing from straight down (6 o’clock) toward the lower left, excluding horizontal (9
o’clock). Successful airs award points and a speed boost; Down helps align the board. Cutbacks, wave
coverage, linked turns, and clean aerial spins also score points. Heats last 90 seconds or three
wipeouts; another heat uses the same rental. P pauses, X returns to the beach, and touch buttons
mirror the controls. Best scores, rental state, and safe beach positions persist. Controls take
inspiration from the [California Games Lynx
manual](https://atariage.com/manual_html_page.php?SoftwareID=2413); original procedural wave artwork
takes visual inspiration from [Surf
Sandbox](https://store.steampowered.com/app/4480760/Surf_Sandbox/).

## Change boundaries and verification

Wave artwork and collision/scoring geometry must agree at every caught wave size. Coastal waves
clip to water around islands and Mainland Beach; occupant masking and foam interact with the
main renderer. See [rendering](rendering-and-effects.md).

See [testing](testing.md). Focus test names on `surf`, `wave`, `barrel`, `air landing`, `crest`,
`lip`, or `froth`. Verify rental persistence, catch eligibility, size scaling, carving and speed,
visible board landing angle, scoring, pause, exit, and safe reload position. Browser inspection
is required for wave appearance, spray, layering, and keyboard/touch feel.
