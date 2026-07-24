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

function createFakeElement(id, value = "") {
  return {
    id,
    value,
    checked: false,
    innerHTML: "",
    textContent: "",
    className: "",
    dataset: {},
    style: {},
    hidden: false,
    options: [],
    tagName: "INPUT",
    addEventListener() {},
    appendChild() {},
    setAttribute() {},
    removeAttribute() {},
    querySelectorAll() { return []; },
    classList: {
      add() {},
      remove() {},
      toggle() {}
    }
  };
}

function loadAdvisorForTest() {
  const elements = new Map();
  const defaults = {
    playerCount: "9",
    currency: "$",
    smallBlind: "1",
    bigBlind: "2",
    anteBB: "0",
    effectiveStack: "100",
    openBase: "2.5",
    environment: "online",
    tableTexture: "normal",
    playersBehind: "normal",
    blindTendency: "normal",
    opponentProfile: "unknown",
    aggressorPosition: "CO",
    aggressorSize: "2.5",
    callerCount: "0",
    heroOpenSize: "2.5",
    heroThreeBetSize: "10"
  };
  const getElement = (id) => {
    if (!elements.has(id)) elements.set(id, createFakeElement(id));
    return elements.get(id);
  };

  Object.entries(defaults).forEach(([id, value]) => elements.set(id, createFakeElement(id, value)));
  sandbox.document = {
    getElementById: getElement,
    querySelectorAll() { return []; },
    createElement() { return createFakeElement("anonymous"); },
    documentElement: { dataset: {} },
    addEventListener() {}
  };
  sandbox.navigator = { clipboard: null };
  sandbox.setTimeout = () => 0;
  sandbox.clearTimeout = () => {};
  sandbox.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
  sandbox.window.scrollTo = () => {};

  const appSource = fs.readFileSync("src/app.js", "utf8");
  const exportMatch = appSource.match(/  window\.PreflopStudio = \{[\s\S]*?\};\n\}\)\(\);\n?$/);
  assert.ok(exportMatch, "app export block should be discoverable for advisor tests");
  const appWithoutBoot = appSource.replace(/  loadPreferences\(\);[\s\S]*?  window\.PreflopStudio = \{[\s\S]*?\};\n\}\)\(\);\n?$/, exportMatch[0]);
  vm.runInNewContext(appWithoutBoot, sandbox, { filename: "src/app.js" });

  return {
    recommend({ playerCount = 9, position, scenario, label, fields = {} }) {
      Object.entries(defaults).forEach(([id, value]) => { getElement(id).value = value; });
      Object.entries(fields).forEach(([id, value]) => { getElement(id).value = String(value); });
      sandbox.PreflopStudio.state.playerCount = playerCount;
      sandbox.PreflopStudio.state.heroPosition = position;
      sandbox.PreflopStudio.state.scenario = scenario;
      sandbox.PreflopStudio.state.cards = model.representativeCards(label);
      sandbox.PreflopStudio.state.readTags = new Set();
      return sandbox.PreflopStudio.buildRecommendation();
    }
  };
}

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
assert.equal(model.initialPotBB({ playerCount: 9, smallBlindBB: 0.5, anteBB: 0 }), 1.5);
assert.equal(model.initialPotBB({ playerCount: 2, smallBlindBB: 0.5, anteBB: 0 }), 1.5);
assert.equal(model.potWithTotalBets({
  playerCount: 9,
  smallBlindBB: 0.5,
  anteBB: 0,
  bets: [{ position: "SB", totalBetBB: 3 }]
}), 4);
assert.equal(model.callCostBB("BB", 3, null, { playerCount: 9, smallBlindBB: 0.5 }), 2);
assert.equal(model.potWithTotalBets({
  playerCount: 2,
  smallBlindBB: 0.5,
  anteBB: 0,
  bets: [{ position: "BTN/SB", totalBetBB: 2.5 }, { position: "BB", totalBetBB: 10 }]
}), 12.5);
assert.equal(model.callCostBB("BTN/SB", 10, 2.5, { playerCount: 2, smallBlindBB: 0.5 }), 7.5);

const advisor = loadAdvisorForTest();
assert.equal(advisor.recommend({
  position: "BB",
  scenario: "open",
  label: "K6s",
  fields: { aggressorPosition: "BTN", aggressorSize: "2.5" }
}).action, "CALL");
assert.equal(advisor.recommend({
  position: "BB",
  scenario: "open",
  label: "A7s",
  fields: { aggressorPosition: "UTG", aggressorSize: "3" }
}).action, "FOLD");
assert.equal(advisor.recommend({
  position: "BTN",
  scenario: "open",
  label: "K9s",
  fields: { aggressorPosition: "CO", aggressorSize: "2.5" }
}).action, "CALL");
assert.equal(advisor.recommend({
  position: "BTN",
  scenario: "threeBet",
  label: "JTs",
  fields: { aggressorPosition: "BB", heroOpenSize: "2.5", aggressorSize: "10" }
}).action, "CALL");
assert.equal(advisor.recommend({
  position: "BTN",
  scenario: "threeBet",
  label: "A5s",
  fields: { aggressorPosition: "BB", heroOpenSize: "2.5", aggressorSize: "10" }
}).action, "4-BET");
assert.equal(advisor.recommend({
  position: "SB",
  scenario: "fourBet",
  label: "QQ",
  fields: { aggressorPosition: "BTN", heroThreeBetSize: "10", aggressorSize: "23" }
}).action, "CALL");

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
