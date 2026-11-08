# Learning and rewards

## Code map

In `dist/app.js`: `QUESTION_COUNT`, `questionsByAge`, `buildEarlyQuestions()`,
`buildAdditionalQuestions()`, `locations`, `openQuestion()`, `renderTool()`, `parseNumber()`,
`checkAnswer()`, `visit()`, `journal()`, `buy()`, `earnedSquishies()`, `syncSquishies()`,
`tradeSquishy()`, and the flash-question functions from `startFlash()` through `finishFlash()`.

Questions contain an answer, skill, title, hints, explanation, and workbench configuration.
`questions` points at the selected age bank; destination `ids` select questions within it.

## Curriculum

200 guided math challenges per age level (800 total, 40 per destination) across five island
destinations.

New questions preserve IDs 0–99 and saved progress. Ages 5–6 have 20 questions in each of ten
concepts; ages 7–8 have 15–20 per concept; ages 9–10 have ten per concept; ages 11–12 have 9–10 per
concept. New questions alternate skills within each destination and include three hints and a worked
explanation.

Ages 5–6 cover counting with dot pictures, number order, addition/subtraction within 10, comparing
numbers, shapes, number bonds, patterns, measuring length, and reading picture charts. Ages 7–8
cover place value, addition/subtraction within 100, the 2/5/10 times tables, equal sharing, time,
money, halves/quarters, perimeter, and simple data. Flash arithmetic also adapts to these brackets.

Ages 9–10 balance arithmetic, fractions and tenths, area/perimeter, metric conversions, sequences,
money, elapsed time, missing numbers, and rounding. Ages 11–12 balance whole-number operations,
negative numbers, fractions/decimals/percentages, comparisons, ratios/rates, equations, sequences,
area/perimeter, volume, and angles.

## Discoveries and upgrades

Five crystals per first completion; repeat practice earns crystals after all 200 discoveries are
complete.

Restore a cottage (15), garden (20), and bridge (25). The woodland bridge connects Sunseed Island to
Crystal Cavern.

Sprout hatches after eight discoveries and follows the explorer.

`checkAnswer()` accepts equivalent numeric fractions and percentages through `parseNumber()`;
paired answers preserve order. `answerComplete` prevents duplicate submission rewards.
Already-solved questions give no extra discovery crystals until the entire age bank is solved.
Correct answers also restore energy; see [world and travel](world-and-travel.md).

Discovery results show the answer and outcome before rewards/actions. Next discovery selection
stays on the current destination while it has unsolved questions; destination visits and the
journal are distinct from boat-only island access.

## Collection and trading

Squishees unlock every 50 lifetime crystals: 29 treasures across Common, Uncommon, Hard-to-Find,
Rare, Ultra Rare, and Mythic tiers. Includes the requested NeeDoh catalog, with the original seven
treasures and existing saves preserved. Complete all discoveries to keep earning through repeat
practice.

The stash contains an island trading counter and a six-tier catalog. Earn one trading ticket by
answering 10 flash arithmetic questions correctly in a row, with a fresh 15-second deadline for each
question. Wrong answers, timeouts, and leaving end the streak; retries are unlimited. Flash
questions match the selected age level and award tickets separately from discovery crystals.

Spend one ticket to swap one owned squishee for another in the same tier. Tickets and inventory save
independently per age level. The sole Mythic item has no swap partner until more Mythic items are
added.

Here, “lifetime crystals” means the age save's `earnedCrystals` reward total, which survives
spending. It is separate from explorer-wide lifetime fish counts and resets with that adventure.
The inventory and ticket normalization must preserve existing collection saves. See
[save ownership](saves-and-profiles.md) for reset and age boundaries and admin grants.

## Verification

See [testing](testing.md). Focus test names on `curriculum`, `question`, `discovery`, `answer`,
`fraction`, `squish`, `trading`, or `flash`. Verify uniqueness, concept coverage, worked answers,
legacy IDs, reward deduplication, spending versus earned totals, and age/profile separation.
