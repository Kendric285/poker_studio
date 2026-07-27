# Preflop Studio

Preflop Studio is a local-first no-limit hold'em study app. Build a table spot, enter a hand, and get a position-aware recommendation with sizing, pot odds, opponent adjustments, range context, and a postflop plan. It also includes a visual Range Lab, practice drills, a lightweight hand-review analyzer, postflop equity tools, and session guardrails.

The app is designed as an educational decision aid rather than a solver. Its preflop ranges are centralized, inspectable heuristics informed by public strategy references, so the chart, advisor, and drills share the same baseline instead of maintaining separate hand lists.

## Study Workflow

1. Choose the table size, stakes, effective stack, and hero position.
2. Enter a hand using notation such as `A5s`, `KQo`, `TT`, or exact cards such as `AsKh`.
3. Select the action before you: unopened, limpers, facing an open, open plus callers, facing a 3-bet, or facing a 4-bet.
4. Add opponent reads or optional VPIP/PFR data when available.
5. Review the recommended action, size, reasoning, exploit adjustment, commitment warning, and postflop plan.
6. Open the same hand in Range Lab or practice related decisions in Drills.

The baseline favors tight-aggressive fundamentals: raise first-in rather than limp, expand with position, value realized equity, and enter pressure lines with a response to the next raise already planned. Value 3-bets use a linear core. Polarized blocker 3-bets are presented as optional mixes when position and fold equity support them, not as mandatory actions.

## Product Direction: Reference First

The primary job of Preflop Studio is to answer a table-side study question quickly: **what is my baseline range and plan in this exact preflop node?** Practice should reinforce that reference rather than become a separate game.

That suggests the following product hierarchy:

1. **Range reference:** exact spot lookup with the assumptions shown beside the chart.
2. **Decision explanation:** why a hand raises, calls, mixes, or folds and what changes the answer.
3. **Targeted recall:** short drills generated from the same chart, weighted toward mistakes and close boundaries.
4. **Review:** a compact leak report that links every miss back to the relevant range.
5. **Postflop bridge:** a brief plan for the range that reaches the flop, not a replacement for a postflop solver.

The default experience should therefore open quickly, remember the user's usual game, and require as few inputs as possible. Advanced controls can remain available for unusual spots, but the most common saved configuration should be one click away.

## Recommended Update Roadmap

This roadmap was reviewed against public poker-study guidance on 2026-07-27. It prioritizes reference accuracy and retrieval practice over adding more unrelated tools.

### P0 — Make the reference trustworthy and fast

- **Add saved game profiles.** A profile should capture cash/tournament, live/online, player count, stack depth, blind/ante/straddle structure, rake model, and default open sizes. Show the active profile and a concise assumptions badge above every range. Public charts are game-specific rather than universal, and cash-game rake and larger opens materially tighten calls and big-blind defenses.
- **Turn Range Lab into an action-tree browser.** Use a breadcrumb such as `Cash 9-max · 100 BB · BTN opens 2.5 · Hero BB` and expose separate `fold / call / 3-bet` layers. Add back/forward navigation, keyboard search, and a shareable spot identifier. A composite position chart is helpful for orientation, but a reference tool should distinguish opener position, size, callers, hero position, and the next raise.
- **Show frequencies without pretending to have solver precision.** Display combo counts and range percentages for pure actions. Label heuristic mixed actions as qualitative bands such as `mostly raise`, `mix`, or `mostly call` unless an imported source supplies actual weights.
- **Make provenance visible in the UI.** Each chart should show its source type, version date, applicable configuration, and whether it is a bundled heuristic or a personal import. Add a visible warning whenever the selected spot falls outside the chart's calibrated assumptions.
- **Add a compare drawer.** Let the user compare two adjacent contexts—such as BTN versus CO open, 2.5 BB versus 4 BB, or low-rake versus high-rake—and highlight only the hands that change. This teaches the underlying rule instead of encouraging memorization of an isolated grid.

### P1 — Make practice produce durable recall

- **Persist drill history by decision node and hand class.** Track attempts, misses, confidence, last-seen time, and recent accuracy locally. The existing session score disappears too quickly to diagnose a real leak.
- **Add a mistake queue with spaced review.** Resurface missed and slow boundary hands after increasing intervals, while retaining some unseen and previously mastered spots. Retrieval practice and spacing have strong evidence for longer-term retention compared with passive rereading.
- **Interleave related spots.** Mix BTN-versus-BB, CO-versus-BB, blind-versus-steal, and facing-3-bet decisions after the user learns them separately. Interleaving helps the player learn which contextual cue changes the action.
- **Ask for the decision before revealing the grid.** Include a distraction-free mode with hidden ranges, immediate feedback after the answer, and an optional confidence rating. Feedback should show the correct branch, nearest boundary hands, and one short reason.
- **Build drills from leaks, not just random hands.** Offer presets such as `Today's review`, `Blind defense`, `Facing 3-bets`, and `Range edges`. Weight by errors and practical frequency so folds do not dominate the session.

### P2 — Cover the contexts that change preflop ranges

- **Separate cash and tournament baselines.** Add antes and stack-depth buckets for tournaments, then treat ICM and bounty contexts as later, explicitly separate modes. Do not apply a chip-EV cash chart to an ICM decision.
- **Model rake explicitly.** At minimum provide low, medium, and high-rake presets and explain that higher rake generally reduces marginal calls, especially from the blinds. A later version can accept percentage, cap, and no-flop-no-drop rules.
- **Add straddled-pot profiles.** Recalculate effective depth in straddle units, identify the new first-to-act seat, and provide a deliberately tighter baseline. A straddle is not merely a larger big blind.
- **Add squeeze and cold-4-bet nodes.** These are common reference lookups and need the opener, caller positions, sizes, and players behind. They should not be approximated by the current open-plus-callers branch forever.
- **Treat heads-up and short-handed play as distinct configurations.** Avoid silently promoting a full-ring range when the positional structure and blind frequency have changed.

### P3 — Turn review into a study plan

- **Import real hand histories.** Parse common site formats into normalized preflop nodes and preserve the original line for inspection.
- **Report leaks by opportunity as well as error count.** Useful metrics include RFI by position, fold/call/3-bet versus open, blind defense versus position and size, fold to 3-bet, and squeeze opportunities. Always show sample size; VPIP/PFR alone cannot support every exploit.
- **Link every report cell back to reference and drill.** A user should be able to click `BB overfold versus BTN` and immediately see the comparison chart or start a focused drill.
- **Add a weekly local-first study summary.** Recommend one or two high-volume leaks, not a long list. Keep raw hands and player notes on-device unless the user explicitly exports them.

### Scope Guardrails

- Keep all bundled outputs clearly labeled as educational heuristics until they are calibrated against a licensed or user-imported solution set.
- Do not imply that a single chart is correct across different rake, sizing, stack, ante, straddle, or ICM assumptions.
- Prefer a small number of stable action buckets over invented decimal frequencies.
- Keep exploit advice separate from the baseline and state the read or statistic that triggers it.
- Resist expanding the postflop advisor until the preflop reference can represent the full common action tree reliably.

### Why These Priorities

- Upswing's public chart library separates ranges by format, position, stack size, and raise size; its big-blind guidance also explains why cash-game rake and worse pot odds tighten defense: https://upswingpoker.com/charts/ and https://upswingpoker.com/big-blind-defend-strategy-mtt-vs-cash/
- GTO Wizard's study documentation emphasizes viewing strategy, range composition, action breakdowns, and reports from a precisely selected game tree. Its training guidance recommends focusing practice on strategically related decisions and mixed preflop hands: https://help.gtowizard.com/study-mode/ and https://help.gtowizard.com/training-ideas/
- Recent GTO Wizard analysis identifies two recurring population leaks—3-betting too tightly and playing too passively from the blinds—which supports giving those nodes first-class reference and drill coverage: https://blog.gtowizard.com/punish-the-unstudied-preflop-mistakes-sizing-tells/
- Straddles change both effective stack depth and the number of blinds/players behind, so they deserve their own configuration rather than a sizing adjustment: https://upswingpoker.com/straddle-pots-tips/
- Learning-science reviews support retrieval practice and spacing for durable retention, while classroom research also finds a benefit from interleaving retrieval across related concepts: https://doi.org/10.1038/s44159-022-00089-1 and https://pubmed.ncbi.nlm.nih.gov/35436145/

## Project Structure

- `index.html` - convenience entry that redirects to the studio shell.
- `preflop_studio.html` - static app shell and markup.
- `src/styles.css` - all visual styling and responsive layout rules.
- `src/poker-model.js` - tested core logic for cards, hand notation, positions, scenario legality, action/raise-size buckets, and spot validation.
- `src/holdem-engine.js` - local Hold'em hand evaluator, board parser, range equity calculator, board texture reader, and postflop advisor engine.
- `src/review-parser.js` - tested parser for pasted hand-review notes.
- `src/preflop-ranges.js` - centralized preflop range reference data, metadata, and public source attribution.
- `src/preflop-ranges.personal.example.js` - optional private override template for personal/exported ranges.
- `src/spades.png` - browser tab and saved-shortcut icon.
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

## Range Lab Colors

For non-big-blind positions, a colored hand is first-in playable unless it is marked as a borderline exploit. Green is therefore the base opening color, while the stripe shows how that same hand can continue in a later branch:

- Green fill: open first-in.
- Blue stripe: opening hand with a call-versus-open branch.
- Purple stripe: opening hand with a 3-bet branch.
- Red stripe: opening hand with a 4-bet branch.
- Amber: borderline exploit that depends more heavily on the table and opponent.
- Uncolored: fold by default.

The big blind uses a separate defense map because it cannot open first-in. Clicking a range cell loads a representative hand and the matching scenario into the advisor, allowing the chart recommendation and detailed explanation to be checked together.

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

The opening maps remain the first-in baseline. Separate range groups handle isolation raises, soft-table overlimps, position-aware linear value 3-bets, optional polarized blocker 3-bets, calls versus opens, calls versus 3-bets, good-price blind defenses, and polarized 4-bet bluffs. Every group is deduplicated by the range helpers and can be overridden independently.

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

The immediate implementation sequence from the roadmap is:

1. Saved game profiles plus visible assumptions/provenance.
2. Exact-node Range Lab navigation and context comparison.
3. Persistent mistake history and a spaced `Today's review` queue.
4. Rake-aware cash presets, tournament stack/ante presets, and straddled-pot profiles.
5. Squeeze/cold-4-bet nodes and hand-history-driven leak reports.
