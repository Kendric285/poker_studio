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
loadBrowserScript("src/preflop-ranges.js", sandbox);

const model = sandbox.PreflopModel;
const holdem = sandbox.HoldemEngine;
const review = sandbox.PreflopReview;
const ranges = sandbox.PreflopRanges;

assert.equal(ranges.format, "preflop-studio/reference-v1");
assert.equal(ranges.ranges.opening.BTN.includes("A2o"), true);
assert.equal(ranges.sources.some((source) => source.name.includes("Upswing")), true);
assert.equal(ranges.sources.some((source) => source.name.includes("GTO Wizard")), true);

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
    opponentVPIP: "",
    opponentPFR: "",
    limperCount: "1",
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
    recommend({ playerCount = 9, position, scenario, label, fields = {}, styles = [], reads = [], vpips = {} }) {
      Object.entries(defaults).forEach(([id, value]) => { getElement(id).value = value; });
      Object.entries(fields).forEach(([id, value]) => { getElement(id).value = String(value); });
      sandbox.PreflopStudio.state.customStyles = styles;
      sandbox.PreflopStudio.state.playerCount = playerCount;
      sandbox.PreflopStudio.state.buttonSeatIndex = 0;
      sandbox.PreflopStudio.state.vpipBySeat = vpips;
      sandbox.PreflopStudio.setHeroPosition(position, { snap: true });
      sandbox.PreflopStudio.state.scenario = scenario;
      sandbox.PreflopStudio.state.cards = model.representativeCards(label);
      sandbox.PreflopStudio.state.readTags = new Set(reads);
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
assert.equal(model.preflopSituation({ actionType: "limpers", numberOfLimpers: 1 }), "oneLimper");
assert.equal(model.preflopSituation({ actionType: "limpers", numberOfLimpers: 3 }), "multipleLimpers");
assert.equal(model.preflopSituation({ actionType: "openCallers", numberOfCallers: 1 }), "openWithCallers");
assert.equal(model.raiseSizeBucket(2.2), "small");
assert.equal(model.raiseSizeBucket(2.5), "medium");
assert.equal(model.raiseSizeBucket(3.5), "large");
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
const studio = sandbox.PreflopStudio;
studio.state.playerCount = 9;
studio.state.buttonSeatIndex = 0;
studio.setHeroSeatIndex(0, { snap: true });
assert.equal(studio.state.heroPosition, "BTN");
assert.equal(studio.rotateSeatWheel(1, { render: false }), 1);
assert.equal(studio.state.heroPosition, "SB");
assert.equal(studio.rotateSeatWheel(-1, { render: false }), 0);
assert.equal(studio.state.heroPosition, "BTN");
assert.equal(studio.rotateSeatWheel(-1, { render: false }), 8);
assert.equal(studio.state.heroPosition, "CO");
assert.equal(studio.selectSeatFromWheel(4, { render: false }), 4);
assert.equal(studio.state.heroPosition, "UTG+1");
studio.setHeroSeatIndex(studio.seatIndexForPosition("BB"), { snap: true });
assert.equal(studio.state.heroPosition, "BB");
const bbRotation = studio.seatWheelRotationForSeat(studio.seatIndexForPosition("BB"), 9, 0);
assert.equal(studio.nearestSeatIndexForRotation(bbRotation + 6, 9), studio.seatIndexForPosition("BB"));
assert.equal(studio.seatPositionLabel(7, 9, 7), "BTN");
assert.equal(studio.seatPositionLabel(8, 9, 7), "SB");
assert.equal(studio.seatPositionLabel(0, 9, 7), "BB");
assert.equal(studio.seatPositionLabel(3, 10, 0), "UTG");
studio.state.playerCount = 9;
studio.state.buttonSeatIndex = 0;
studio.setHeroSeatIndex(0, { snap: true });
assert.equal(studio.setSeatVpip(1, 42).valid, true);
assert.equal(studio.seatVpip(1), 42);
studio.rotateSeatWheel(2, { render: false });
assert.equal(studio.seatVpip(1), null);
assert.equal(studio.seatVpip(3), 42);
assert.equal(studio.averageOpponentVpip(), 42);
assert.equal(studio.validateVpipValue(-1).valid, false);
assert.equal(studio.validateVpipValue(101).valid, false);
assert.equal(studio.setSeatVpip(3, 101).valid, false);
assert.equal(studio.seatVpip(3), 42);
studio.setHeroSeatIndex(0, { snap: true });
assert.equal(studio.openSeatVpipEditor(1, { render: false }), true);
assert.equal(studio.state.vpipEditorSeat, 1);
assert.equal(studio.openSeatVpipEditor(0, { render: false }), false);
assert.equal(studio.state.vpipEditorSeat, null);
let keyPrevented = false;
studio.setHeroSeatIndex(0, { snap: true });
assert.equal(studio.handleSeatWheelKey({ key: "ArrowRight", preventDefault() { keyPrevented = true; } }, { render: false }), true);
assert.equal(keyPrevented, true);
assert.equal(studio.state.heroPosition, "SB");
assert.equal(studio.rangeDisplayTitle("BB"), "BB defense map");
assert.equal(studio.rangeDisplayTitle("BTN"), "BTN opening map");
assert.equal(studio.rangeActionType("A5s", "BTN", 9), "fourbet");
assert.equal(studio.rangeActionType("KQs", "BTN", 9), "threebet");
assert.equal(studio.rangeActionType("88", "BTN", 9), "call");
assert.equal(studio.rangeActionType("K7o", "BTN", 9), "open");
assert.equal(studio.rangeActionType("Q7o", "BTN", 9), "fringe");
assert.equal(studio.rangeActionType("72o", "BTN", 9), "fold");
assert.equal(studio.rangeActionType("AA", "BB", 9), "threebet");
assert.equal(studio.rangeActionType("K6s", "BB", 9), "call");
assert.equal(studio.rangeCellClasses("A5s", "BTN", 9).join(","), "open,fourbet");
assert.equal(studio.rangeCellClasses("KQs", "BTN", 9).join(","), "open,threebet");
assert.equal(studio.rangeCellClasses("88", "BTN", 9).join(","), "open,call");
assert.equal(studio.rangeCellClasses("K7o", "BTN", 9).join(","), "open");
assert.equal(studio.rangeCellClasses("AA", "BB", 9).join(","), "threebet");
assert.equal(studio.rangeCellClasses("K6s", "BB", 9).join(","), "call");
assert.equal(studio.rangeLegendItems("BB").map((item) => item[0]).join(","), "call,threebet,fringe,");
assert.equal(studio.rangeMetricText("BTN", { combos: 622 }), "622 opening combinations");
assert.equal(studio.rangeMetricText("BB", { combos: 120 }), "120 defense combinations");
assert.equal(studio.rangeScenarioForAction("fourbet", "BTN"), "threeBet");
assert.equal(studio.rangeScenarioForAction("threebet", "BTN"), "open");
assert.equal(studio.rangeScenarioForAction("call", "BTN"), "open");
assert.equal(studio.rangeScenarioForAction("open", "BTN"), "unopened");
assert.equal(studio.rangeScenarioForAction("call", "BB"), "open");
assert.equal(studio.rangePrimarySet("BB", 9).has("K6s"), true);
assert.equal(studio.rangePrimarySet("BB", 9).has("AA"), true);
assert.equal(studio.rangeSecondarySet("BB", 9).has("Q2s"), true);
assert.equal(studio.openingSet("BB", 9).size, 0);
assert.deepEqual(
  hostObject(studio.mergeRangeReference({ ranges: { opening: { BTN: ["AA"], SB: ["KK"] } } }, { ranges: { opening: { BTN: ["QQ"] } } })),
  { ranges: { opening: { BTN: ["QQ"], SB: ["KK"] } } }
);

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
const optionalPolarizedThreeBet = advisor.recommend({
  position: "BTN",
  scenario: "open",
  label: "A5s",
  fields: { aggressorPosition: "CO", aggressorSize: "2.5" }
});
assert.equal(optionalPolarizedThreeBet.action, "MIX");
assert.match(optionalPolarizedThreeBet.headline, /Optional polarized/);
assert.match(optionalPolarizedThreeBet.summary, /not a mandatory 3-bet/);
const linearValueThreeBet = advisor.recommend({
  position: "BTN",
  scenario: "open",
  label: "KQs",
  fields: { aggressorPosition: "CO", aggressorSize: "2.5" }
});
assert.equal(linearValueThreeBet.action, "3-BET");
assert.match(linearValueThreeBet.baseline, /linear value 3-bet/);
const smallPairFlat = advisor.recommend({
  position: "BTN",
  scenario: "open",
  label: "44",
  fields: { aggressorPosition: "CO", aggressorSize: "2.5" }
});
assert.equal(smallPairFlat.action, "CALL");
assert.equal(smallPairFlat.why.some((line) => /Small pairs/.test(line)), true);
assert.equal(advisor.recommend({
  position: "BTN",
  scenario: "threeBet",
  label: "JTs",
  fields: { aggressorPosition: "BB", heroOpenSize: "2.5", aggressorSize: "10" }
}).action, "CALL");
assert.equal(advisor.recommend({
  playerCount: 2,
  position: "BTN/SB",
  scenario: "unopened",
  label: "K3o"
}).action, "RAISE");
assert.equal(advisor.recommend({
  playerCount: 10,
  position: "UTG+2",
  scenario: "unopened",
  label: "KTo"
}).action, "FOLD");
assert.equal(advisor.recommend({
  position: "BB",
  scenario: "open",
  label: "Q2s",
  fields: { aggressorPosition: "BTN", aggressorSize: "2.5", anteBB: "0.1" }
}).action, "CALL");
assert.equal(advisor.recommend({
  position: "BTN",
  scenario: "threeBet",
  label: "44",
  fields: { aggressorPosition: "BB", heroOpenSize: "2.5", aggressorSize: "10" }
}).action, "CALL");
assert.equal(advisor.recommend({
  position: "BTN",
  scenario: "threeBet",
  label: "A5s",
  fields: { aggressorPosition: "BB", heroOpenSize: "2.5", aggressorSize: "10" }
}).action, "4-BET");
const polarizedFourBet = advisor.recommend({
  position: "CO",
  scenario: "threeBet",
  label: "A5s",
  fields: { aggressorPosition: "BTN", heroOpenSize: "2.5", aggressorSize: "7.5" }
});
assert.equal(polarizedFourBet.action, "4-BET");
assert.match(polarizedFourBet.headline, /Polarized 4-bet/);
assert.equal(polarizedFourBet.alternatives.some((line) => /information/.test(line)), true);
assert.equal(advisor.recommend({
  position: "SB",
  scenario: "fourBet",
  label: "QQ",
  fields: { aggressorPosition: "BTN", heroThreeBetSize: "10", aggressorSize: "23" }
}).action, "CALL");
assert.equal(advisor.recommend({
  position: "BTN",
  scenario: "unopened",
  label: "J7o",
  vpips: { "seat-1": 12, "seat-2": 16, "seat-3": 18 }
}).action, "RAISE");
assert.equal(advisor.recommend({
  position: "BTN",
  scenario: "unopened",
  label: "J7o",
  vpips: { "seat-1": 48, "seat-2": 52, "seat-3": 45 }
}).action, "FOLD");
const stationStyle = {
  id: "station",
  name: "Station",
  baseProfile: "standard",
  strengthOffset: 0,
  callBias: "loose",
  aggressionBias: "passive",
  sizeBias: 0.75,
  postflopProfile: "wide"
};
assert.equal(advisor.recommend({
  position: "BTN",
  scenario: "limpers",
  label: "ATs",
  fields: { opponentProfile: "custom:station", limperCount: "2" },
  styles: [stationStyle]
}).sizeBB, 5.75);

// Context-aware preflop regression matrix.
const utgUnopened = advisor.recommend({
  position: "UTG",
  scenario: "unopened",
  label: "AQs"
});
assert.equal(utgUnopened.action, "RAISE");
assert.equal(utgUnopened.context.situation, "unopened");
assert.match(utgUnopened.headline, /Open AQs/);

const btnUnopened = advisor.recommend({
  position: "BTN",
  scenario: "unopened",
  label: "Q8o"
});
assert.equal(btnUnopened.action, "RAISE");
assert.match(btnUnopened.summary, /opening range/);

const btnIsolation = advisor.recommend({
  position: "BTN",
  scenario: "limpers",
  label: "KJo",
  fields: { limperCount: "1" }
});
assert.equal(btnIsolation.action, "RAISE");
assert.equal(btnIsolation.context.situation, "oneLimper");
assert.match(btnIsolation.headline, /Isolation raise/);

const btnWeakOffsuitVsLimp = advisor.recommend({
  position: "BTN",
  scenario: "limpers",
  label: "Q8o",
  fields: { limperCount: "1" }
});
assert.equal(btnWeakOffsuitVsLimp.action, "FOLD");
assert.notEqual(btnWeakOffsuitVsLimp.action, btnUnopened.action);

const coMultiwayOverlimp = advisor.recommend({
  position: "CO",
  scenario: "limpers",
  label: "76s",
  fields: { limperCount: "3" }
});
assert.equal(coMultiwayOverlimp.action, "CALL");
assert.equal(coMultiwayOverlimp.context.situation, "multipleLimpers");
assert.match(coMultiwayOverlimp.headline, /Overlimp/);

const bbSmallButtonOpen = advisor.recommend({
  position: "BB",
  scenario: "open",
  label: "Q2s",
  fields: { aggressorPosition: "BTN", aggressorSize: "2.2" }
});
assert.equal(bbSmallButtonOpen.action, "CALL");
assert.equal(bbSmallButtonOpen.context.raiseSizeBucket, "small");
assert.match(bbSmallButtonOpen.headline, /Big blind defense/);

const bbLargeUtgOpen = advisor.recommend({
  position: "BB",
  scenario: "open",
  label: "A5s",
  fields: { aggressorPosition: "UTG", aggressorSize: "4" }
});
assert.equal(bbLargeUtgOpen.action, "FOLD");
assert.equal(bbLargeUtgOpen.context.raiseSizeBucket, "large");

const smallBlindVsSteal = advisor.recommend({
  position: "SB",
  scenario: "open",
  label: "A5s",
  fields: { aggressorPosition: "BTN", aggressorSize: "2.2" }
});
assert.equal(smallBlindVsSteal.action, "MIX");
assert.match(smallBlindVsSteal.headline, /polarized/i);

const highVpipLowPfrRaise = advisor.recommend({
  position: "BTN",
  scenario: "open",
  label: "A5s",
  fields: { aggressorPosition: "CO", aggressorSize: "2.5", opponentVPIP: "50", opponentPFR: "6" }
});
assert.equal(highVpipLowPfrRaise.action, "FOLD");
assert.match(highVpipLowPfrRaise.summary, /High VPIP does not/);
assert.equal(highVpipLowPfrRaise.context.opponentPFR, 6);

const highVpipHighPfrRaise = advisor.recommend({
  position: "BTN",
  scenario: "open",
  label: "A5s",
  fields: { aggressorPosition: "CO", aggressorSize: "2.5", opponentVPIP: "50", opponentPFR: "30" }
});
assert.equal(highVpipHighPfrRaise.action, "MIX");
assert.notEqual(highVpipHighPfrRaise.action, highVpipLowPfrRaise.action);
assert.equal(highVpipHighPfrRaise.why.some((line) => /genuinely wide/.test(line)), true);

const openPlusCaller = advisor.recommend({
  position: "BTN",
  scenario: "openCallers",
  label: "76s",
  fields: { aggressorPosition: "HJ", aggressorSize: "2.5", callerCount: "1" }
});
assert.equal(openPlusCaller.action, "CALL");
assert.equal(openPlusCaller.context.situation, "openWithCallers");
assert.match(openPlusCaller.headline, /plus 1 caller/);

const inPositionVsThreeBet = advisor.recommend({
  position: "BTN",
  scenario: "threeBet",
  label: "77",
  fields: { aggressorPosition: "BB", heroOpenSize: "2.5", aggressorSize: "10" }
});
assert.equal(inPositionVsThreeBet.action, "CALL");
assert.match(inPositionVsThreeBet.baseline, /in-position/);

const outOfPositionVsThreeBet = advisor.recommend({
  position: "HJ",
  scenario: "threeBet",
  label: "77",
  fields: { aggressorPosition: "BTN", heroOpenSize: "2.5", aggressorSize: "10" }
});
assert.equal(outOfPositionVsThreeBet.action, "FOLD");
assert.notEqual(outOfPositionVsThreeBet.action, inPositionVsThreeBet.action);

assert.equal(new Set(ranges.ranges.isolateVsLimp.one.late).size, ranges.ranges.isolateVsLimp.one.late.length);
assert.equal(new Set(ranges.ranges.overlimp.multiple.late).size, ranges.ranges.overlimp.multiple.late.length);

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
