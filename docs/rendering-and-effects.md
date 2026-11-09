# Rendering and effects

## Code map and conventions

`dist/app.js` contains the main `draw()` orchestration, `resizeMap()`, `drawMiniMap()`,
Canvas primitives (`rect()`, `ellipse()`, `polygon()`), sprites, world effects, and camera logic.
`dist/surfing.js` supplies coastal waves and surfing artwork. `dist/style.css` owns the surrounding
HUD, panels, responsive controls, and CSS collection art; `dist/index.html` owns markup and SVG icons.

The main renderer uses world coordinates under the camera transform. HUD/minimap and the surfing
view have their own coordinate assumptions. Check transforms and viewport dimensions before
adding a draw call. `resizeMap()` configures resolution/device-pixel ratio and disables Canvas
image smoothing. Surf water intentionally uses smooth subpixel shapes; island sprites retain
pixel contours.

## Presentation

Full-window browser map with responsive camera proportions, floating crystal/status displays, a
left-side rail of flat pixel-art icons, grouped submenus, and nonmodal map panels, and fishing
actions over the map. Permanent bottom-left fish and chest icons open lifetime catch history and the secret stash; fishing
supplies live beneath Go fishing in the Fishing & travel submenu. Cast feedback sits above the
normal suggested actions, with no fishing popup panel.

Keyboard (WASD/arrows), touch movement, and tappable destination markers.

Optional synthesized sound. All pixel artwork is original Canvas code.

## Layering boundaries

Swimmers and sea mounts pass beneath bridges, piers, and hulls. Raised-timber shadows, water
clipping, coastal wave masks, boat spray, and dragon altitude all affect visibility. Preserve
`draw()` ordering and paired Canvas save/restore operations. See [surfing](surfing.md) for
wave shape and occupant masking, and [world and travel](world-and-travel.md) for movement rules.

Rendering changes should keep effects tied to simulation state. Check whether an effect is
advanced during update or generated at draw time, especially when adding pause/reload behavior.

## Boat motors and spray

The ferry and fishing boat display twin outboards with trim-adjusted lower units. Spray uses
individual gravity-driven droplets carried by the boat’s motion, with varied launch speeds, fine
mist, and small landing splashes.

Outboards swivel together with steering, reverse their angle for reverse thrust, and direct spray
with the engines. The ferry carries larger outboards. Boarding a boat starts the motors with a brief
exhaust puff and a 0.55-second startup before propulsion engages.

The speedboat uses three coordinated outboards. Vessel performance and trim rules are owned by
[world and travel](world-and-travel.md).

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

Dragon fire also explodes the ferry, sponsored fishing boat, and watersports tow boat when the plume
touches their hull or cabin. The hull stays visible while flames spread for 1.8 seconds, then erupts
into a detailed, smoothly shaded fireball with sparks, rolling smoke, and a water pressure ring.
Sixty-four recognizable pieces (planks, hull panels, glass, engines, rails, and seats) tumble along
gravity-driven trajectories. Each piece checks the shoreline at impact: sea impacts make individual
splash crowns and ripples, with wooden wreckage floating briefly and metal sinking; pieces on land
bounce, slide, and settle. Wreckage fades and the boat returns after 11.8 seconds. Occupants drop
into swimming, and boarding is blocked until the smoke clears. Explosions respect the dragon’s
heading and altitude, pause during dialogs, and clear with explorer, age, or adventure resets.

Spraying a beach volleyball player interrupts that court: the sprayed player throws the ball toward
your position, then walks or swims to collect it and carries it back before play resumes. Balls that
land offshore float with small ripples. Repeated spray does not restart a retrieval; reactions pause
during dialogs and clear on explorer, age, or adventure resets. Boat spray passes in front of a
nearby dragon when the droplets are above his height, and behind him when he flies above them.

Effect entry points include `drawDragonFlame()`, `drawPetDragonFire()`, `drawPlayerHairEffect()`,
`createBoatBlast()`, `drawBoatExplosions()`, `drawBurningTree()`, `drawVolleySprayReactions()`,
and their advance/reset helpers. `resetPetDragon()` clears tree fires, regrowth, boat explosions,
and hair effects; `resetVolleyball()` clears spray reactions.

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
See [boats and fishing](boats-and-fishing.md) for pass access and approach behavior.

## Verification

See [testing](testing.md). Drawing tests use Canvas substitutes: they can detect exceptions and
some geometry regressions, but do not establish visual quality. Inspect the affected scene in a
browser at desktop and narrow/touch sizes. Check camera edges, layering above/below structures,
paused frames, effects lifecycle, and recovery after profile/age/reset changes.
