# Preflop Studio

Preflop Studio is a static no-limit hold'em advisor for studying common preflop decisions, practicing quick drills, reviewing simple hand notes, and checking session guardrails.

## Project Structure

- `index.html` - convenience entry that redirects to the studio shell.
- `preflop_studio.html` - static app shell and markup.
- `src/styles.css` - all visual styling and responsive layout rules.
- `src/poker-model.js` - tested core logic for cards, hand notation, positions, scenario legality, action/raise-size buckets, and spot validation.
- `src/holdem-engine.js` - local Hold'em hand evaluator, board parser, range equity calculator, board texture reader, and postflop advisor engine.
- `src/review-parser.js` - tested parser for pasted hand-review notes.
- `src/preflop-ranges.js` - centralized preflop range reference data, metadata, and public source attribution.
- `src/preflop-ranges.personal.example.js` - optional private override template for personal/exported ranges.
- `src/app.js` - browser UI wiring, rendering, drill flow, preflop/postflop advisor output, and local persistence.
- `tests/logic.test.js` - Node regression tests for production-critical logic.
- `package.json` - local test command.

There is still no build step. The source is split into browser-safe classic scripts so the app can be served statically and can still be opened from disk in most desktop browsers.

## Run Locally

Open `preflop_studio.html` directly in a browser, or serve the folder:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Then visit `http://127.0.0.1:8765/preflop_studio.html`.

## Test

Run the regression suite:

```bash
npm test
```

The current suite guards:

- Bare-rank hand entry defaulting, such as `KQ` -> `KQo`.
- Suited, offsuit, pair, and exact-card parsing.
- Big blind scenario legality.
- Valid blind-defense spot validation.
- Rotatable physical-seat wheel mapping, snapping, wraparound, click selection, keyboard selection, and VPIP validation.
- Chair/player VPIP storage that stays visually attached to the same player while action labels rotate.
- Review-note parsing for `unopened`, `facing open`, and illegal BB unopened spots.
- Context-aware opens, isolation raises, overlimps, open-plus-caller decisions, blind defense, and in-position/out-of-position 3-bet responses.
- PFR-aware range adjustments that do not treat high VPIP alone as evidence of a wide raising range.
- Hold'em 5-7 card hand evaluation.
- River equity against a range.
- Postflop advice generation from hand, board, range, pot, and bet size.

## Current Features

- Instant preflop advisor for 2-10 handed NLH spots.
- Text hand entry such as `KQ`, `KQo`, `KQs`, `TT`, or exact cards like `AsKh`.
- Rotatable table seat wheel with a fixed hero selector, dealer marker, drag/button/click selection, keyboard controls, normal page scrolling, and per-opponent VPIP entry that stays with each chair/player.
- Scenario controls for unopened pots, limpers, opens, open plus callers, 3-bets, and 4-bets.
- Separate editable ranges for isolation raises, one/multiple-limper overlimps, opener-position-aware 3-bets, position-aware calls, and raise-size-aware big blind defense.
- Optional aggressor VPIP/PFR inputs; PFR informs raising-range width while VPIP informs expected calling and table stickiness.
- Advisor snapshot with action focus, price check, table fit, and hand plan.
- Average opponent VPIP adjustments for steal pressure, sticky-table sizing, and close preflop decisions.
- Range Lab with simplified opening maps, branch-color overlays for call/3-bet/4-bet nodes, and a separate BB defense map.
- Saved custom player styles for opponent tightness, calling tendency, aggression, sizing bias, and postflop range assumptions.
- Postflop advisor with exact-card board input, real showdown equity estimates, pot odds, MDF guide, board texture, draw detection, and plain-English recommendations.
- Practice Drills with random spot generation, answer scoring, session accuracy, streak, and drill history.
- Tools for blind tax, bankroll/session guardrails, recent recommendations, and simple hand-note review.

## GTO Wizard-Inspired Feature Map

This project does not copy GTO Wizard's proprietary solver outputs, solved ranges, EV data, UI, or paid database. The added features are local, heuristic equivalents inspired by public feature categories GTO Wizard advertises:

- `Study / solution browsing` -> Range Lab plus live advisor explanations.
- `Practice / trainer / custom drills` -> Drills tab with random scenarios, answer buckets, feedback, accuracy, and streak.
- `Analyze / hand history review` -> Hand Review Analyzer for pasted plain-text hand notes.
- `Reports / leak finding` -> Analyzer summary with aligned actions, mismatches, skipped lines, and common leak buckets.
- `Table overlays / pot odds / effective stacks` -> Advisor snapshot, pot odds, stack depth, blind tax, and session guardrail tools.
- `Postflop solver study` -> Local equity engine plus solver-inspired advice. This is not a full game-tree solver.

## Preflop Range Reference

The app loads preflop decisions from `src/preflop-ranges.js` before `src/app.js`. The file uses standard two-card labels such as `QQ`, `A5s`, and `KQo`, plus metadata for public references. The bundled ranges are simplified educational heuristics; they are not copied from paid or proprietary charts.

The opening maps remain the first-in baseline. Separate range groups handle isolation raises, overlimps, position-aware 3-bets, calls versus opens, calls versus 3-bets, and good-price blind defenses. Every group is deduplicated by the range helpers and can be overridden independently.

To use a personal/exported chart source, copy `src/preflop-ranges.personal.example.js` to your own local file, fill in only the ranges you want to replace, and load it after `src/preflop-ranges.js` but before `src/app.js`. Arrays in `window.PreflopRangeOverrides` replace the matching bundled range, while omitted keys keep the baseline.

Public references used for calibration and format guidance:

- https://upswingpoker.com/charts/
- https://help.gtowizard.com/ranges-tab/
- https://blog.gtowizard.com/another-update-many-improvements/

## Engine Choice

I checked open-source options before adding postflop advice. TexasSolver is a real open-source C++ GTO solver, but it is AGPL, desktop/console oriented, and too heavy to drop into this static browser app cleanly. PokerHandEvaluator is a strong open-source evaluator reference, but adding external compiled assets is unnecessary for the current personal desktop tool.

The current app uses an in-browser engine instead:

- Parses exact cards like `As Ks` and boards like `Ah 7d 2c`.
- Evaluates 5, 6, and 7-card Hold'em hands.
- Runs exact equity on completed boards and smaller trees.
- Runs seeded Monte Carlo equity on larger flop/turn range simulations.
- Reads board texture, flush/straight draws, overcards, pot odds, MDF, and risk/reward.
- Converts the numbers into clear advice.

Reference pages:

- https://gtowizard.com/
- https://help.gtowizard.com/how-to-use-the-trainer/
- https://help.gtowizard.com/how-to-use-the-hand-history-analyzer/
- https://help.gtowizard.com/custom-solving-faq/
- https://help.gtowizard.com/subscription/
- https://github.com/bupticybee/TexasSolver
- https://github.com/HenryRLee/PokerHandEvaluator

## Hand Review Analyzer Format

The analyzer expects one note per line and looks for:

- A hand: `KQ`, `KQo`, `KQs`, `TT`, `AsKh`
- A position: `UTG`, `MP`, `LJ`, `HJ`, `CO`, `BTN`, `SB`, `BB`
- A spot phrase: `unopened`, `limp`, `facing open`, `open + callers`, `vs 3-bet`, `4-bet`
- Your action: `fold`, `call`, `check`, `raise`, `3-bet`, `4-bet`, `jam`, `mix`

Examples:

```text
BTN KQ unopened raise
BB A9s facing open call
CO 77 vs 3-bet fold
```

## Limitations

- Recommendations are educational heuristics, not solver outputs.
- The app does not include proprietary GTO Wizard data or full game-tree EV calculations.
- Postflop equity is real card/range math, but the betting line is solver-inspired advice, not a solved equilibrium strategy.
- The hand-note analyzer is not a full poker-site hand-history parser.
- Limpers and cold callers are modeled by count rather than by a full position-by-position action history.
- Opponent PFR is a useful range-width signal, but the app does not yet track sample size, raise-first-in, fold-to-3-bet, or squeeze statistics.
- Postflop strategy is summarized as planning guidance only.
- Bankroll/session advice is a simple risk heuristic, not financial advice.

## Next Good Upgrades

- Add persistent drill-session history.
- Add richer hand-history parsing for common poker site formats.
- Add EV-estimate calibration tables per stack depth and rake environment.
- Add board texture drills for postflop planning.
- Add import/export for study plans and reviewed hands.
