const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function loadBrowserScript(path, sandbox) {
  const source = fs.readFileSync(path, "utf8");
  vm.runInNewContext(source, sandbox, { filename: path });
}

function createSandbox() {
  const sandbox = {};
  sandbox.window = sandbox;
  return sandbox;
}

const sandbox = createSandbox();
loadBrowserScript("src/poker-model.js", sandbox);
loadBrowserScript("src/holdem-engine.js", sandbox);
loadBrowserScript("src/review-parser.js", sandbox);

const model = sandbox.PreflopModel;
const holdem = sandbox.HoldemEngine;
const review = sandbox.PreflopReview;

function labelFor(entry) {
  const parsed = model.parseHandEntry(entry, { defaultOffsuit: true });
  assert.ok(parsed.cards?.every(Boolean), `${entry} should parse as a complete hand`);
  return model.handLabel(model.classifyCards(parsed.cards[0], parsed.cards[1]));
}

assert.equal(labelFor("kq"), "KQo");
assert.equal(labelFor("kqo"), "KQo");
assert.equal(labelFor("kjs"), "KJs");
assert.equal(labelFor("tt"), "TT");
assert.equal(labelFor("AsKh"), "AKo");
assert.equal(model.shouldDefaultOffsuit("KQ"), true);
assert.equal(model.shouldDefaultOffsuit("KQs"), false);

assert.equal(model.scenarioAllowed({ playerCount: 9, position: "BB", scenario: "unopened" }), false);
assert.equal(model.scenarioAllowed({ playerCount: 9, position: "BB", scenario: "open" }), true);
assert.equal(model.scenarioAllowed({ playerCount: 9, position: "BB", scenario: "threeBet" }), false);
const validBlindDefense = model.validateSpot({
  playerCount: 9,
  position: "BB",
  scenario: "open",
  cards: model.representativeCards("A9s")
});
assert.equal(validBlindDefense.valid, true);

function hostObject(value) {
  return JSON.parse(JSON.stringify(value));
}

assert.deepEqual(hostObject(review.parseReviewLine("BTN KQ unopened raise", { playerCount: 9 })), {
  line: "BTN KQ unopened raise",
  label: "KQo",
  position: "BTN",
  scenario: "unopened",
  userBucket: "raise"
});

assert.deepEqual(hostObject(review.parseReviewLine("BB A9s facing open call", { playerCount: 9 })), {
  line: "BB A9s facing open call",
  label: "A9s",
  position: "BB",
  scenario: "open",
  userBucket: "call"
});

assert.equal(review.parseReviewLine("BB KQ unopened raise", { playerCount: 9 }).error, "BB cannot take unopened pot in this setup");

const royal = holdem.parseExactCards("As Ks Qs Js Ts", { min: 5, max: 5 });
assert.equal(royal.error, undefined);
assert.equal(holdem.evaluate(royal.cards).name, "Straight flush");

const heroRoyal = holdem.parseExactCards("As Ks", { min: 2, max: 2 }).cards;
const royalBoard = holdem.parseExactCards("Qs Js Ts 2d 3c", { min: 5, max: 5 }).cards;
const lockedEquity = holdem.equityVsRange({
  heroCards: heroRoyal,
  boardCards: royalBoard,
  profile: "any",
  iterations: 1000
});
assert.equal(lockedEquity.exact, true);
assert.equal(lockedEquity.equity, 100);

const postflopResult = holdem.analyzePostflop({
  heroCards: holdem.parseExactCards("As Ks", { min: 2, max: 2 }).cards,
  boardCards: holdem.parseExactCards("Ah 7d 2c", { min: 3, max: 5 }).cards,
  profile: "standard",
  potBB: 12,
  facingBetBB: 0,
  betSizeBB: 8,
  position: "ip",
  initiative: "yes",
  iterations: 6000
});
assert.equal(postflopResult.error, undefined);
assert.ok(postflopResult.equity.trials > 0);
assert.ok(postflopResult.reasons.length >= 3);
assert.ok(["Bet", "Check", "Call", "Fold", "Raise"].includes(postflopResult.action));

console.log("logic tests passed");
