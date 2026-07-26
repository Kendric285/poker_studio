# Preflop Studio

Preflop Studio is a static no-limit hold'em advisor for studying common preflop decisions, practicing quick drills, reviewing simple hand notes, and checking session guardrails.

## Project Structure

- `index.html` - convenience entry that redirects to the studio shell.
- `preflop_studio.html` - static app shell and markup.
- `src/styles.css` - all visual styling and responsive layout rules.
- `src/poker-model.js` - tested core logic for cards, hand notation, positions, scenario legality, action buckets, and spot validation.
- `src/holdem-engine.js` - local Hold'em hand evaluator, board parser, range equity calculator, board texture reader, and postflop advisor engine.
- `src/review-parser.js` - tested parser for pasted hand-review notes.
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
- Hold'em 5-7 card hand evaluation.
- River equity against a range.
- Postflop advice generation from hand, board, range, pot, and bet size.

## Current Features

- Instant preflop advisor for 2-10 handed NLH spots.
- Text hand entry such as `KQ`, `KQo`, `KQs`, `TT`, or exact cards like `AsKh`.
- Rotatable table seat wheel with a fixed hero selector, dealer marker, drag/button/click selection, keyboard controls, normal page scrolling, and per-opponent VPIP entry that stays with each chair/player.
- Scenario controls for unopened pots, limpers, opens, open plus callers, 3-bets, and 4-bets.
- Advisor snapshot with action focus, price check, table fit, and hand plan.
- Average opponent VPIP adjustments for steal pressure, sticky-table sizing, and close preflop decisions.
- Range Lab with simplified position-opening matrices.
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
- Postflop strategy is summarized as planning guidance only.
- Bankroll/session advice is a simple risk heuristic, not financial advice.

## Next Good Upgrades

- Add persistent drill-session history.
- Add richer hand-history parsing for common poker site formats.
- Add EV-estimate calibration tables per stack depth and rake environment.
- Add board texture drills for postflop planning.
- Add import/export for study plans and reviewed hands.
