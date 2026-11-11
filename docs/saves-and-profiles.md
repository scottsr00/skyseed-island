# Saves and profiles

## Code map

In `dist/app.js`, start with `PROFILE_KEY`, `AGE_LEVELS`, `defaults`, `progressKey()`,
`loadProgress()`, `save()`, `createProfile()`, `switchProfile()`, `switchAge()`,
`requestProfileAction()`, and `confirmProfileAction()`. The current-adventure reset is the
`#confirmReset` click handler. Admin behavior is in `applyAdminOverride()` and `exitAdminMode()`.

## Storage and ownership

All storage is browser `localStorage`, scoped to the page origin. A deployment on the same
origin retains access to saves; a different origin has separate storage. Failed saves display
“Session only.”

| Scope | Contents / behavior |
| --- | --- |
| Profile registry | `skyseed-profiles-v1`: active profile ID and explorer records |
| Legacy explorer age saves | `skyseed-v1` for 11–12; `skyseed-v1-${age}` for other ages |
| Other explorer age saves | `skyseed-profile-${id}-${age}` |
| Legacy age preference | `skyseed-age`; selected age is also kept in each profile |
| Explorer across ages/adventure resets | Name, character, selected age, beach pass, speedboat unlock, energy, lifetime fish, fishing/speedboat fuel tanks, reserve gas |
| Per explorer and age | Solved IDs, crystals, earned reward total, upgrades, collection inventory/tickets, bait/lure, sponsorship progress, watersports gear, surf rental/best score, island visits and saved travel state |
| Session only | Active mini-game simulation, creature rides, effects, admin unlimited-energy mode |

Some profile-wide values are mirrored into `state` for runtime use. Field location alone does
not establish ownership: inspect normalization and `save()` too. Travel state includes a
single-use ferry ticket and remaining ride time; ferry access is not permanent gear.

## Profile management and resets

Settings contains named explorer profiles with boy/girl character choices and a character preview.
Create a profile, rename it, or switch players from the saved profile picker. Characters appear
while walking, boating, diving, and swimming. Each profile saves its own selected age level and
independent progress for all four age levels, including crystals, collections, trading tickets,
upgrades, and fish. Existing browser progress belongs to the initial Explorer profile and can be
renamed. Profiles use browser localStorage; no account or backend. In Settings, Manage selected
profile offers Reset profile to zero (clears all four math levels, permanent gear, lifetime fish,
records, and reserve gas while keeping the name, character, and selected level) and Delete profile
(removes the player and every age save). Both require a confirmation naming the player. Full resets
restore starting energy and fuel; deleting the last player creates a fresh Explorer. The journal’s
Start again option still resets only the current adventure.

`confirmProfileAction()` snapshots storage and attempts rollback if persistence fails.

## Compatibility rules

- On startup, selected ages 5–6 and 7–8 migrate to 9–10 for every saved profile, including
  inactive players and the legacy `skyseed-age` preference. The next save persists the upgraded
  profile registry. Ages 9–10 and 11–12 stay unchanged. Each age's progress remains separate:
  existing 9–10 progress loads normally, and younger-level saves remain untouched rather than
  copying solved IDs or rewards into a different curriculum. Settings disables the younger levels.
- Question IDs 0–99 retain their original meaning; expansion adds IDs 100–199. Preserve solved
  progress when changing curriculum. `loadProgress()` filters and deduplicates valid IDs.
- `travelRules: 2` marks single-ride ferry saves. Old permanent passes are discarded;
  `loadProgress()` clears old ticket ownership and does not convert it into a free ride.
- Beach pass and speedboat ownership migrate from any age save to the explorer. Legacy purchased
  anchors (`anchor: true`) in either a profile or age save become permanent beach passes
  (`beachPass: true`) without charging again. New saves use `beachPass`; anchoring itself is basic
  boat equipment. Full reset removes
  all age saves before loading fresh state so permanent gear cannot migrate back.
- Lifetime catch counts migrate once from age saves when the profile lacks lifetime totals.
  Subsequent catches update both the age count and explorer lifetime count.
- Fuel tanks initialize only when absent. Relaunching or resetting the adventure must not refill
  them. Full profile reset creates fresh tanks.
- `save()` chooses safe activity exit/takeoff positions rather than persisting every transient
  animation. Parked vessel type, location, heading, beach anchorage, and occupied ferry state
  have separate restoration paths. Test reloads as well as ordinary exits.

Boat explosions and repair crews are session-only. `restoreRebuiltBoat()` clears the destroyed
vessel's offshore/beach parking and anchor references immediately and returns its position to the
home dock, so `save()` records safe dock recovery rather than a wreck or mid-build animation.
Remaining ferry time and tickets, fuel/reserve, ownership, and unlocks retain their usual ownership
and countdown rules. Reload restores one docked boat; `resetPetDragon()` clears crews on profile,
age, and adventure/full-profile resets. See [boats and fishing](boats-and-fishing.md).

## Admin override

Settings → Admin override accepts password `11111` to add 1,000 spendable crystals to the active
explorer’s current age level. The grant saves immediately, requires the password each time, and
leaves discovery progress and lifetime earned rewards unchanged.

The password-protected Settings admin override refills and saves the explorer’s normal energy to
100, and also enables session-only unlimited energy for the selected explorer and age level. The
saved refill survives a page refresh. The meter displays “∞ Unlimited,” water activities do not
drain saved energy, and Exit admin mode restores normal limits. Changing player or age, resetting
the adventure, or reloading ends admin mode. The existing 1,000-crystal grant still requires the
password each time.

The password is a client-side convenience control in this browser-local game. Admin grants do
not increase `earnedCrystals` or discovery progress, but can qualify for the speedboat unlock.

## Verification

See [testing](testing.md). Focused test names include `profile`, `legacy`, `migrate`, `reload`,
`age`, `reset`, `gas`, and `admin`. For new fields, verify another player and another age, reload,
current-adventure reset, and full profile reset according to the ownership table.
