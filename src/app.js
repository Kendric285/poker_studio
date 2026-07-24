(() => {
  "use strict";

  const model = window.PreflopModel;
  const holdem = window.HoldemEngine;
  const reviewTools = window.PreflopReview;
  if (!model || !holdem || !reviewTools) throw new Error("Preflop Studio modules failed to load.");

  const $ = (id) => document.getElementById(id);
  const ranksAsc = "23456789TJQKA";
  const ranksDesc = [...ranksAsc].reverse();
  const suits = [
    { code: "S", symbol: "♠", color: "black" },
    { code: "H", symbol: "♥", color: "red" },
    { code: "D", symbol: "♦", color: "red" },
    { code: "C", symbol: "♣", color: "black" }
  ];

  const POSITION_LAYOUTS = {
    2: ["BTN/SB", "BB"],
    3: ["BTN", "SB", "BB"],
    4: ["CO", "BTN", "SB", "BB"],
    5: ["HJ", "CO", "BTN", "SB", "BB"],
    6: ["LJ", "HJ", "CO", "BTN", "SB", "BB"],
    7: ["MP", "LJ", "HJ", "CO", "BTN", "SB", "BB"],
    8: ["UTG+1", "MP", "LJ", "HJ", "CO", "BTN", "SB", "BB"],
    9: ["UTG", "UTG+1", "MP", "LJ", "HJ", "CO", "BTN", "SB", "BB"],
    10: ["UTG", "UTG+1", "UTG+2", "MP", "LJ", "HJ", "CO", "BTN", "SB", "BB"]
  };

  const state = {
    view: "coach",
    playerCount: 9,
    heroPosition: "BTN",
    scenario: "unopened",
    cards: [null, null],
    activeCardSlot: 0,
    rangePosition: "BTN",
    readTags: new Set(),
    lastResult: null,
    drill: {
      current: null,
      correct: 0,
      volume: 0,
      streak: 0,
      history: []
    }
  };

  const rankValue = (r) => ranksAsc.indexOf(r);
  const pairsFrom = (minimum) => {
    const start = rankValue(minimum);
    return Array.from({ length: ranksAsc.length - start }, (_, i) => {
      const r = ranksAsc[start + i]; return r + r;
    });
  };
  const combosFrom = (high, minimumLow, suffix) => {
    const out = [], hi = rankValue(high), lo = rankValue(minimumLow);
    for (let i = lo; i < hi; i += 1) out.push(high + ranksAsc[i] + suffix);
    return out;
  };
  const setOf = (...items) => new Set(items.flat(Infinity));

  const OPEN = {
    "UTG": setOf(pairsFrom("5"), ["A2s","A3s","A4s","A5s"], combosFrom("A","9","s"), combosFrom("K","T","s"), combosFrom("Q","T","s"), ["JTs","T9s"], combosFrom("A","J","o"), ["KQo"]),
    "UTG+1": setOf(pairsFrom("4"), ["A2s","A3s","A4s","A5s"], combosFrom("A","8","s"), combosFrom("K","T","s"), combosFrom("Q","T","s"), ["JTs","T9s"], combosFrom("A","J","o"), ["KQo"]),
    "MP": setOf(pairsFrom("4"), ["A2s","A3s","A4s","A5s"], combosFrom("A","8","s"), combosFrom("K","9","s"), combosFrom("Q","T","s"), ["JTs","T9s","98s"], combosFrom("A","T","o"), combosFrom("K","J","o"), ["QJo"]),
    "LJ": setOf(pairsFrom("3"), ["A2s","A3s","A4s","A5s"], combosFrom("A","7","s"), combosFrom("K","9","s"), combosFrom("Q","9","s"), combosFrom("J","9","s"), ["T9s","98s","87s","76s"], combosFrom("A","9","o"), combosFrom("K","T","o"), ["QJo","JTo"]),
    "HJ": setOf(pairsFrom("2"), combosFrom("A","2","s"), combosFrom("K","8","s"), combosFrom("Q","9","s"), combosFrom("J","9","s"), combosFrom("T","8","s"), combosFrom("9","7","s"), combosFrom("8","6","s"), combosFrom("7","5","s"), ["65s","54s"], combosFrom("A","8","o"), combosFrom("K","T","o"), combosFrom("Q","T","o"), ["JTo"]),
    "CO": setOf(pairsFrom("2"), combosFrom("A","2","s"), combosFrom("K","5","s"), combosFrom("Q","7","s"), combosFrom("J","7","s"), combosFrom("T","7","s"), combosFrom("9","6","s"), combosFrom("8","5","s"), combosFrom("7","4","s"), ["64s","65s","54s"], combosFrom("A","5","o"), combosFrom("K","9","o"), combosFrom("Q","9","o"), combosFrom("J","9","o"), ["T9o"]),
    "BTN": setOf(pairsFrom("2"), combosFrom("A","2","s"), combosFrom("K","2","s"), combosFrom("Q","2","s"), combosFrom("J","4","s"), combosFrom("T","5","s"), combosFrom("9","5","s"), combosFrom("8","5","s"), combosFrom("7","4","s"), ["64s","65s","53s","54s","43s"], combosFrom("A","2","o"), combosFrom("K","7","o"), combosFrom("Q","8","o"), combosFrom("J","8","o"), combosFrom("T","8","o"), ["98o"]),
    "SB": setOf(pairsFrom("2"), combosFrom("A","2","s"), combosFrom("K","4","s"), combosFrom("Q","6","s"), combosFrom("J","7","s"), combosFrom("T","7","s"), combosFrom("9","6","s"), combosFrom("8","5","s"), combosFrom("7","4","s"), ["64s","65s","54s"], combosFrom("A","5","o"), combosFrom("K","9","o"), combosFrom("Q","9","o"), combosFrom("J","9","o"), ["T9o"]),
    "BB": new Set()
  };

  const FRINGE = {
    "UTG": setOf(["44","A8s","K9s","Q9s","J9s","98s","ATo","KJo","QJo"]),
    "UTG+1": setOf(["33","A7s","K9s","Q9s","J9s","98s","ATo","KJo","QJo"]),
    "MP": setOf(["33","A7s","K8s","Q9s","J9s","87s","A9o","KTo","QTo","JTo"]),
    "LJ": setOf(["22","A6s","K8s","Q8s","J8s","T8s","65s","A8o","K9o","QTo"]),
    "HJ": setOf(["K7s","Q8s","J8s","T7s","96s","85s","74s","A7o","K9o","Q9o","J9o"]),
    "CO": setOf(["K4s","Q6s","J6s","T6s","95s","84s","73s","A4o","K8o","Q8o","J8o","T8o","98o"]),
    "BTN": setOf(["J2s","J3s","T2s","T3s","T4s","94s","84s","73s","63s","52s","K6o","Q7o","J7o","T7o","97o","87o"]),
    "SB": setOf(["K2s","K3s","Q4s","Q5s","J5s","J6s","T6s","95s","84s","73s","A4o","K8o","Q8o","J8o","T8o","98o"]),
    "BB": new Set()
  };

  const HU_OPEN = setOf(
    pairsFrom("2"), combosFrom("A","2","s"), combosFrom("A","2","o"),
    combosFrom("K","2","s"), combosFrom("K","4","o"), combosFrom("Q","2","s"), combosFrom("Q","6","o"),
    combosFrom("J","2","s"), combosFrom("J","7","o"), combosFrom("T","2","s"), combosFrom("T","7","o"),
    combosFrom("9","2","s"), combosFrom("9","6","o"), combosFrom("8","3","s"), combosFrom("8","6","o"),
    combosFrom("7","3","s"), combosFrom("6","3","s"), ["54s","53s","43s"]
  );
  const HU_FRINGE = setOf(["K3o","Q5o","J6o","T6o","95o","85o","75o","64o","74o","63o","52s","42s","32s"]);

  const THREEBET_TIGHT = setOf(pairsFrom("Q"), ["AKs","AKo"]);
  const THREEBET_NORMAL = setOf(pairsFrom("J"), ["AQs","AKs","AKo"]);
  const THREEBET_WIDE = setOf(pairsFrom("T"), ["AJs","AQs","AKs","AQo","AKo","KQs"]);
  const THREEBET_VERY_WIDE = setOf(pairsFrom("9"), ["ATs","AJs","AQs","AKs","AJo","AQo","AKo","KQs","KQo"]);
  const CALL_TIGHT = setOf(["JJ","TT","99","AQs","AJs","KQs"]);
  const CALL_NORMAL = setOf(["JJ","TT","99","88","77","AQs","AJs","ATs","KQs","KJs","QJs","JTs","T9s","AQo"]);
  const CALL_WIDE = setOf([...CALL_NORMAL,"66","55","A9s","KTs","QTs","98s","87s","AJo","KQo"]);
  const BB_DEFEND_EXTRA = setOf(["44","33","22","A8s","A7s","A6s","A5s","A4s","A3s","A2s","K9s","K8s","Q9s","J9s","T8s","98s","87s","76s","65s","A9o","KTo","QTo","JTo"]);
  const LIGHT_3BET = setOf(["A2s","A3s","A4s","A5s","KTs","KJs","QTs","QJs","JTs"]);
  const PREMIUM_DRILL_HANDS = ["AA","KK","QQ","JJ","TT","AKs","AKo","AQs","AQo","KQs"];
  const BLIND_DEFENSE_DRILL_HANDS = ["A9o","A8s","A5s","KTo","K9s","QTo","Q9s","JTo","J9s","T8s","98s","87s","76s","65s","44","33","22"];
  const DOMINATED_DRILL_HANDS = ["AJo","ATo","A9o","KQo","KJo","KTo","QJo","QTo","JTo"];
  const DRILL_SCENARIOS = ["unopened","limpers","open","openCallers","threeBet","fourBet"];

  function normalizedPosition(position) {
    if (position === "UTG+2") return "MP";
    if (position === "BTN/SB") return "BTN";
    return position;
  }

  function openingSet(position) {
    if (position === "BTN/SB") return HU_OPEN;
    return OPEN[normalizedPosition(position)] || OPEN.MP;
  }
  function fringeSet(position) {
    if (position === "BTN/SB") return HU_FRINGE;
    return FRINGE[normalizedPosition(position)] || FRINGE.MP;
  }

  function classifyCards(c1, c2) {
    const a = rankValue(c1.rank), b = rankValue(c2.rank);
    const high = Math.max(a,b), low = Math.min(a,b);
    return { high, low, highRank: ranksAsc[high], lowRank: ranksAsc[low], pair: a === b, suited: c1.suit === c2.suit, gap: high - low };
  }
  function handLabel(hand) { return hand.pair ? hand.highRank + hand.highRank : hand.highRank + hand.lowRank + (hand.suited ? "s" : "o"); }
  function pairAtLeast(hand, minimum) { return hand.pair && hand.high >= rankValue(minimum); }
  function suitedAce(hand) { return hand.suited && hand.highRank === "A"; }
  function suitedConnector(hand) { return hand.suited && !hand.pair && hand.gap === 1; }
  function suitedOneGapper(hand) { return hand.suited && !hand.pair && hand.gap === 2; }
  function suitedBroadway(hand) { return hand.suited && hand.low >= rankValue("T"); }
  function offsuitBroadway(hand) { return !hand.suited && !hand.pair && hand.low >= rankValue("T"); }
  function dominatedOffsuit(label) { return ["ATo","AJo","KJo","KQo","QJo","QTo","JTo"].includes(label); }
  function premium(label) { return ["AA","KK","QQ","AKs","AKo"].includes(label); }
  function speculative(hand) { return (hand.pair && hand.high <= rankValue("9")) || suitedConnector(hand) || suitedOneGapper(hand) || suitedAce(hand); }
  function late(position) { return ["HJ","CO","BTN","BTN/SB"].includes(position); }

  function cardText(card) {
    if (!card) return "";
    const suit = suits.find((s) => s.code === card.suit);
    return `${card.rank}${suit.symbol}`;
  }
  function cardCode(card) { return card ? `${card.rank}${card.suit}` : ""; }
  function inputCardCode(card) { return card ? `${card.rank}${card.suit.toLowerCase()}` : ""; }
  function currency(value, digits = 0) {
    const symbol = ($("currency").value || "$ ").trim();
    const n = Number(value);
    return Number.isFinite(n) ? `${symbol}${n.toFixed(digits)}` : "—";
  }
  function bbToMoney(bb) { return bb * Number($("bigBlind").value || 0); }
  function formatSize(bb) { return `${bb.toFixed(bb < 10 ? 1 : 0)} BB · ${currency(bbToMoney(bb), bbToMoney(bb) < 10 ? 2 : 0)}`; }
  function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }
  function storageGet(key, fallback = null) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw == null ? fallback : raw;
    } catch { return fallback; }
  }
  function storageSet(key, value) {
    try { window.localStorage.setItem(key, value); return true; }
    catch { return false; }
  }
  function storageRemove(key) {
    try { window.localStorage.removeItem(key); return true; }
    catch { return false; }
  }

  function positionLayout() { return POSITION_LAYOUTS[state.playerCount]; }
  function preflopIndex(position) { return positionLayout().indexOf(position); }
  function postflopOrder() {
    const layout = positionLayout();
    if (state.playerCount === 2) return ["BB", "BTN/SB"];
    const early = layout.filter((p) => !["BTN","SB","BB"].includes(p));
    return ["SB","BB", ...early, "BTN"];
  }
  function inPosition(hero, villain) { return postflopOrder().indexOf(hero) > postflopOrder().indexOf(villain); }
  function heroPostedBB() {
    if (state.heroPosition === "SB" || state.heroPosition === "BTN/SB") return Number($("smallBlind").value) / Number($("bigBlind").value);
    if (state.heroPosition === "BB") return 1;
    return 0;
  }

  function renderSeats() {
    const layer = $("seatsLayer");
    layer.innerHTML = "";
    const layout = positionLayout();
    if (!layout.includes(state.heroPosition)) state.heroPosition = layout.includes("BTN") ? "BTN" : layout[0];
    if (!layout.includes(state.rangePosition)) state.rangePosition = state.heroPosition;

    const clockwise = state.playerCount === 2
      ? ["BTN/SB", "BB"]
      : ["BTN", "SB", "BB", ...layout.filter((p) => !["BTN","SB","BB"].includes(p))];
    const startAngle = 68;
    const rx = 42.5, ry = state.playerCount >= 9 ? 40.5 : 38.5;
    clockwise.forEach((position, index) => {
      const angle = (startAngle + index * (360 / clockwise.length)) * Math.PI / 180;
      const x = 50 + rx * Math.cos(angle);
      const y = 50 + ry * Math.sin(angle);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "seat" + (position === state.heroPosition ? " hero" : "");
      const aggressor = currentAggressorPosition();
      if (aggressor && position === aggressor && position !== state.heroPosition) btn.classList.add("aggressor");
      btn.style.left = `${x}%`;
      btn.style.top = `${y}%`;
      btn.dataset.position = position;
      btn.innerHTML = `<span class="seat-pos">${position}</span><span class="seat-role">${position === state.heroPosition ? "You" : position === aggressor ? "Aggressor" : "Seat"}</span>`;
      btn.addEventListener("click", () => {
        state.heroPosition = position;
        renderAllCore();
      });
      layer.appendChild(btn);

      if (position === "BTN" || position === "BTN/SB") {
        const d = document.createElement("div");
        d.className = "dealer-button";
        d.textContent = "D";
        d.style.left = `${clamp(x - 5, 3, 94)}%`;
        d.style.top = `${clamp(y + (y < 50 ? 9 : -9), 4, 94)}%`;
        layer.appendChild(d);
      }
    });
    $("heroStatus").textContent = state.heroPosition;
  }

  function currentAggressorPosition() {
    const el = $("aggressorPosition");
    return el ? el.value : null;
  }

  function renderCards(options = {}) {
    [0,1].forEach((index) => {
      const slot = $(`cardSlot${index + 1}`);
      const card = state.cards[index];
      if (!card) {
        slot.textContent = "＋";
        slot.className = "card-slot empty";
      } else {
        slot.textContent = cardText(card);
        const suit = suits.find((s) => s.code === card.suit);
        slot.className = `card-slot ${suit.color}`;
      }
    });
    const valid = state.cards.every(Boolean);
    $("feltHand").textContent = valid ? `${cardText(state.cards[0])} ${cardText(state.cards[1])}` : "Choose two cards";
    syncHandInput(options);
  }

  function renderStatus() {
    const symbol = ($("currency").value || "$ ").trim();
    const sb = Number($("smallBlind").value || 0), bb = Number($("bigBlind").value || 0);
    $("stakeStatus").textContent = `${symbol}${sb} / ${symbol}${bb}`;
    $("stackStatus").textContent = `${Number($("effectiveStack").value || 0)} BB`;
    $("feltContext").textContent = `${state.playerCount}-handed · ${symbol}${sb} / ${symbol}${bb}`;
  }

  function scenarioAllowed(scenario, position = state.heroPosition) {
    return model.scenarioAllowed({ playerCount: state.playerCount, scenario, position });
  }

  function ensureAllowedScenario() {
    if (scenarioAllowed(state.scenario)) return;
    const fallbackOrder = ["unopened","open","limpers","fourBet","openCallers","threeBet"];
    state.scenario = fallbackOrder.find((scenario) => scenarioAllowed(scenario)) || "unopened";
    showToast(`The selected seat cannot normally enter that action sequence. Switched to ${scenarioName(state.scenario).toLowerCase()}.`);
  }

  function scenarioButtonUpdate() {
    document.querySelectorAll("#scenarioSegments .segment").forEach((button) => {
      const allowed = scenarioAllowed(button.dataset.scenario);
      button.disabled = !allowed;
      button.title = allowed ? "" : "This action sequence is not available from the selected seat in a standard unstraddled game.";
      button.classList.toggle("active", button.dataset.scenario === state.scenario);
    });
  }

  function profileOptions() {
    return `<option value="unknown" selected>Unknown</option><option value="nit">Very tight</option><option value="standard">Standard</option><option value="loose">Loose-aggressive</option><option value="callingStation">Calls too much</option><option value="wild">Wild / jams too wide</option>`;
  }

  function positionOptions(filter = "all") {
    const layout = positionLayout();
    let positions = layout;
    if (filter === "beforeHero") positions = layout.filter((p) => preflopIndex(p) < preflopIndex(state.heroPosition));
    if (filter === "afterHero") positions = layout.filter((p) => preflopIndex(p) > preflopIndex(state.heroPosition));
    if (!positions.length) positions = layout.filter((p) => p !== state.heroPosition);
    return positions.map((p) => `<option value="${p}">${p}</option>`).join("");
  }

  function defaultOpenSizeBB() { return $("environment").value === "live" ? 3 : 2.5; }

  function renderDynamicFields() {
    const wrap = $("dynamicFields");
    const baseOpen = defaultOpenSizeBB();
    let html = `
      <div class="field"><label for="openBase">Default open size</label><div class="input-with-suffix"><input id="openBase" type="number" min="2" max="8" step="0.5" value="${baseOpen}"><span>BB</span></div></div>
      <div class="field"><label for="anteBB">Ante per player</label><div class="input-with-suffix"><input id="anteBB" type="number" min="0" max="5" step="0.05" value="0"><span>BB</span></div></div>`;

    if (state.scenario === "limpers") {
      html += `<div class="field"><label for="limperCount">Limpers</label><input id="limperCount" type="number" min="1" max="9" value="2"></div><div class="field"><label for="opponentProfile">Typical limper</label><select id="opponentProfile">${profileOptions()}</select></div>`;
    }
    if (["open","openCallers"].includes(state.scenario)) {
      html += `<div class="field"><label for="aggressorPosition">Opener position</label><select id="aggressorPosition">${positionOptions("beforeHero")}</select></div><div class="field"><label for="opponentProfile">Opener profile</label><select id="opponentProfile">${profileOptions()}</select></div><div class="field"><label for="aggressorSize">Open size</label><div class="input-with-suffix"><input id="aggressorSize" type="number" min="2" max="20" step="0.5" value="3"><span>BB</span></div></div>`;
      if (state.scenario === "openCallers") html += `<div class="field"><label for="callerCount">Cold callers</label><input id="callerCount" type="number" min="1" max="8" value="1"></div>`;
    }
    if (state.scenario === "threeBet") {
      html += `<div class="field"><label for="heroOpenSize">Your open</label><div class="input-with-suffix"><input id="heroOpenSize" type="number" min="2" max="10" step="0.5" value="${baseOpen}"><span>BB</span></div></div><div class="field"><label for="aggressorPosition">3-bettor position</label><select id="aggressorPosition">${positionOptions("afterHero")}</select></div><div class="field"><label for="opponentProfile">3-bettor profile</label><select id="opponentProfile">${profileOptions()}</select></div><div class="field"><label for="aggressorSize">3-bet size</label><div class="input-with-suffix"><input id="aggressorSize" type="number" min="5" max="50" step="0.5" value="10"><span>BB</span></div></div>`;
    }
    if (state.scenario === "fourBet") {
      html += `<div class="field"><label for="heroThreeBetSize">Your 3-bet</label><div class="input-with-suffix"><input id="heroThreeBetSize" type="number" min="5" max="30" step="0.5" value="10"><span>BB</span></div></div><div class="field"><label for="aggressorPosition">4-bettor position</label><select id="aggressorPosition">${positionOptions("beforeHero")}</select></div><div class="field"><label for="opponentProfile">4-bettor profile</label><select id="opponentProfile">${profileOptions()}</select></div><div class="field"><label for="aggressorSize">4-bet size</label><div class="input-with-suffix"><input id="aggressorSize" type="number" min="12" max="100" step="0.5" value="23"><span>BB</span></div></div>`;
    }

    wrap.innerHTML = html;
    const refreshFromDynamicField = () => { renderSeats(); renderStatus(); savePreferences(); autoAnalyze(); };
    wrap.querySelectorAll("input").forEach((el) => el.addEventListener("input", refreshFromDynamicField));
    wrap.querySelectorAll("select").forEach((el) => el.addEventListener("change", refreshFromDynamicField));
    renderSeats();
  }

  function openRangeDescription(position) {
    if (position === "BTN/SB") return "Heads-up button range. Position after the flop supports a much wider open.";
    if (["UTG","UTG+1","UTG+2"].includes(position)) return "Early position. Keep the range strong because many players remain behind.";
    if (["MP","LJ"].includes(position)) return "Middle position. Add suited aces, broadways, pairs, and selected connectors.";
    if (position === "HJ") return "The first clearly wide attacking seat at most full-ring tables.";
    if (position === "CO") return "A wide late-position range with substantial steal value.";
    if (position === "BTN") return "The widest standard opening seat because you retain position after the flop.";
    if (position === "SB") return "Wide enough to attack, but out-of-position play makes weak opens less forgiving.";
    return "The big blind does not open when action folds through. It either wins the pot or responds to prior action.";
  }

  function handCombos(label) { return label.length === 2 ? 6 : label.endsWith("s") ? 4 : 12; }
  function rangeStats(set) {
    let combos = 0;
    set.forEach((label) => { combos += handCombos(label); });
    return { combos, percent: combos / 1326 * 100 };
  }

  function renderRangePositionList() {
    const count = Number($("rangePlayerCount").value);
    const layout = POSITION_LAYOUTS[count].filter((p) => p !== "BB");
    if (!layout.includes(state.rangePosition)) state.rangePosition = layout.includes("BTN") ? "BTN" : layout[0];
    $("rangePositionList").innerHTML = layout.map((position) => {
      const stats = rangeStats(openingSet(position));
      return `<button class="position-choice ${position === state.rangePosition ? "active" : ""}" data-position="${position}"><span>${position}</span><small>${stats.percent.toFixed(1)}%</small></button>`;
    }).join("");
    document.querySelectorAll(".position-choice").forEach((button) => button.addEventListener("click", () => { state.rangePosition = button.dataset.position; renderRangeLab(); }));
  }

  function matrixLabel(row, col) {
    const r1 = ranksDesc[row], r2 = ranksDesc[col];
    if (row === col) return r1 + r1;
    return row < col ? r1 + r2 + "s" : r2 + r1 + "o";
  }

  function representativeCards(label) {
    if (label.length === 2) return [{ rank: label[0], suit: "S" }, { rank: label[1], suit: "H" }];
    if (label.endsWith("s")) return [{ rank: label[0], suit: "S" }, { rank: label[1], suit: "S" }];
    return [{ rank: label[0], suit: "S" }, { rank: label[1], suit: "H" }];
  }

  function allHandLabels() {
    const labels = [];
    for (let row = 0; row < 13; row += 1) {
      for (let col = 0; col < 13; col += 1) labels.push(matrixLabel(row,col));
    }
    return labels;
  }

  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function uniqueLabels(labels) {
    return [...new Set(labels)].filter(Boolean);
  }

  function drillHandPool(focus, position, scenario) {
    if (focus === "premium") return PREMIUM_DRILL_HANDS;
    if (focus === "blindDefense") return BLIND_DEFENSE_DRILL_HANDS;
    if (focus === "dominated") return DOMINATED_DRILL_HANDS;
    if (focus === "close") {
      const fringe = [...fringeSet(position)];
      const tactical = scenario === "unopened"
        ? fringe
        : [...CALL_NORMAL, ...CALL_WIDE, ...LIGHT_3BET, ...BB_DEFEND_EXTRA, ...DOMINATED_DRILL_HANDS];
      return uniqueLabels(tactical.length ? tactical : fringe);
    }
    return allHandLabels();
  }

  function availableDrillScenarios() {
    const selected = $("drillScenario")?.value || "mixed";
    const scenarios = selected === "mixed" ? DRILL_SCENARIOS : [selected];
    return scenarios.filter((scenario) => positionLayout().some((position) => scenarioAllowed(scenario, position)));
  }

  function availableDrillPositions(scenario) {
    return positionLayout().filter((position) => scenarioAllowed(scenario, position));
  }

  function chooseDrillPosition(scenario) {
    const candidates = availableDrillPositions(scenario);
    const selected = $("drillPosition")?.value || "random";
    if (selected === "current" && candidates.includes(state.heroPosition)) return state.heroPosition;
    if (selected !== "random" && selected !== "current" && candidates.includes(selected)) return selected;
    if (selected !== "random" && selected !== "current") showToast(`${selected} is not available for this table size or spot. Dealt a nearby legal seat.`);
    return randomItem(candidates);
  }

  function actionBucket(action) {
    return model.actionBucket(action);
  }

  function bucketName(bucket) {
    return model.bucketName(bucket);
  }

  function normalizeHandEntry(value) {
    return model.normalizeHandEntry(value);
  }

  function sortedRanks(first, second) {
    return model.rankValue(first) >= model.rankValue(second) ? [first, second] : [second, first];
  }

  function shouldDefaultOffsuit(value) {
    return model.shouldDefaultOffsuit(value);
  }

  function parseHandEntry(value, options = {}) {
    return model.parseHandEntry(value, options);
  }

  function currentHandInputLabel() {
    return state.cards.every(Boolean) ? handLabel(classifyCards(state.cards[0], state.cards[1])) : "";
  }

  function setHandInputInvalid(isInvalid) {
    const input = $("handInput");
    input.classList.toggle("invalid", isInvalid);
    if (isInvalid) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
  }

  function syncHandInput(options = {}) {
    const input = $("handInput");
    if (options.preserveActiveHandInput && document.activeElement === input) {
      setHandInputInvalid(false);
      return;
    }
    input.value = currentHandInputLabel();
    setHandInputInvalid(false);
  }

  function applyHandEntry(value, options = {}) {
    const notify = Boolean(options.notify);
    const parsed = parseHandEntry(value, options);
    if (parsed.cards) {
      state.cards = parsed.cards;
      renderCards({ preserveActiveHandInput: Boolean(options.preserveInput) });
      renderRangeLab();
      if (options.analyze !== false) autoAnalyze();
      return true;
    }

    if (options.clearOnIncomplete) {
      state.cards = [null, null];
      renderCards({ preserveActiveHandInput: true });
      renderRangeLab();
      renderResultEmpty();
    }
    setHandInputInvalid(Boolean(value.trim()) && !parsed.incomplete);
    if (notify && parsed.error) {
      setHandInputInvalid(true);
      showToast(parsed.error);
    }
    return false;
  }

  function renderRangeLab() {
    renderRangePositionList();
    const openSet = openingSet(state.rangePosition), fringe = fringeSet(state.rangePosition);
    const stats = rangeStats(openSet);
    $("rangeTitle").textContent = `${state.rangePosition} opening range`;
    $("rangeDescription").textContent = openRangeDescription(state.rangePosition);
    $("rangePercent").textContent = `${stats.percent.toFixed(1)}%`;
    $("rangeCombos").textContent = `${stats.combos} combinations`;
    const selected = state.cards.every(Boolean) ? handLabel(classifyCards(state.cards[0], state.cards[1])) : "";
    const matrix = $("rangeMatrix");
    matrix.innerHTML = "";
    for (let row = 0; row < 13; row += 1) {
      for (let col = 0; col < 13; col += 1) {
        const label = matrixLabel(row,col);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "range-cell";
        if (openSet.has(label)) button.classList.add("open");
        else if (fringe.has(label)) button.classList.add("fringe");
        if (label === selected) button.classList.add("selected");
        button.textContent = label;
        button.title = `Load ${label} into the coach`;
        button.addEventListener("click", () => {
          state.cards = representativeCards(label);
          const coachCount = Number($("playerCount").value);
          if (coachCount !== Number($("rangePlayerCount").value)) {
            $("playerCount").value = $("rangePlayerCount").value;
            state.playerCount = Number($("playerCount").value);
          }
          if (positionLayout().includes(state.rangePosition)) state.heroPosition = state.rangePosition;
          state.scenario = "unopened";
          switchView("coach");
          renderAllCore();
          showToast(`${label} loaded into the coach.`);
        });
        matrix.appendChild(button);
      }
    }
  }

  function withArticle(phrase) { return /^[aeiou]/i.test(phrase) ? `an ${phrase}` : `a ${phrase}`; }

  function handFamily(hand, label) {
    if (["AA","KK","QQ"].includes(label)) return "premium pair";
    if (hand.pair && hand.high >= rankValue("T")) return "big pair";
    if (hand.pair) return "small or medium pair";
    if (suitedAce(hand)) return "suited ace";
    if (suitedBroadway(hand)) return "suited broadway";
    if (offsuitBroadway(hand)) return "offsuit broadway";
    if (suitedConnector(hand)) return "suited connector";
    if (suitedOneGapper(hand)) return "suited one-gapper";
    return hand.suited ? "suited hand" : "offsuit hand";
  }

  function postflopPlan(hand, label) {
    if (["AA","KK","QQ","JJ","TT"].includes(label)) return {
      goal: "Build value on safe boards without treating one pair as invincible.",
      good: "Low, disconnected boards where worse pairs and top pairs can continue.",
      danger: "Overcards, connected multiway boards, and passive players suddenly applying heavy pressure."
    };
    if (hand.pair) return {
      goal: "Win a large pot when you flop a set, not force a small pair to showdown.",
      good: `Flops containing a ${hand.highRank}, especially against top-pair-heavy ranges.`,
      danger: "Calling multiple streets only because you started with a pocket pair."
    };
    if (suitedAce(hand)) return {
      goal: "Make the nut flush, strong draws, or a top pair that dominates weaker aces.",
      good: "Two cards of your suit, wheel connectivity, and ace-high boards against loose ranges.",
      danger: "Getting pot committed with a weak ace against a tight or underbluffed range."
    };
    if (suitedConnector(hand) || suitedOneGapper(hand)) return {
      goal: "Make disguised straights, flushes, and high-equity combo draws.",
      good: "Connected middle boards and strong multi-draw textures.",
      danger: "Paying too much with one weak pair or a dominated non-nut draw."
    };
    if (suitedBroadway(hand) || offsuitBroadway(hand)) return {
      goal: "Make top pair with a strong kicker and collect value from weaker broadways.",
      good: "Boards where your top pair clearly dominates the continuing range.",
      danger: "Reverse domination and playing a stack-sized pot with only one pair."
    };
    return {
      goal: "Realize equity cheaply and avoid inflating the pot with weak one-pair value.",
      good: "Two pair, trips, or strong draws.",
      danger: "Calling because the pot is already large rather than because the price and range justify it."
    };
  }

  function initialPotBB() {
    const count = state.playerCount;
    const sbRatio = Number($("smallBlind").value) / Number($("bigBlind").value);
    const ante = Number($("anteBB")?.value || 0);
    return sbRatio + 1 + count * ante;
  }

  function selectedReads() { return state.readTags; }
  function currentProfile() { return $("opponentProfile")?.value || "unknown"; }

  function recommendationBase(action, className, headline, summary, sizeBB, confidence, metrics, why, alternatives, commitment, plan, baseline, exploit) {
    return { action, className, headline, summary, sizeBB, confidence, metrics, why, alternatives, commitment, plan, baseline, exploit };
  }

  function confidenceFor(borderline, readsMatter = false) { return borderline ? "Medium" : readsMatter ? "Medium-high" : "High"; }

  function unopenedRecommendation(hand, label) {
    if (state.heroPosition === "BB") return recommendationBase("NO DECISION", "mix", "The hand is over before the big blind acts", "If every player folds through the small blind, the big blind wins the pot automatically.", 0, "High", {}, ["Choose a different position for an unopened-pot decision."], [], "There is no additional decision to make.", postflopPlan(hand,label), "No baseline action", "No exploit needed");
    const openSet = openingSet(state.heroPosition), fringe = fringeSet(state.heroPosition);
    const inRange = openSet.has(label), isFringe = fringe.has(label);
    const aggressiveBehind = $("playersBehind").value === "squeezy" || $("blindTendency").value === "aggressive";
    const favorable = late(state.heroPosition) && $("blindTendency").value === "tight" && !aggressiveBehind;
    let size = Number($("openBase").value || defaultOpenSizeBB());
    if ($("environment").value === "live" && $("tableTexture").value === "loosePassive") size += 1;
    if (state.heroPosition === "SB" || state.heroPosition === "BTN/SB") size += 0.5;
    const family = handFamily(hand,label);
    if (inRange) {
      const borderline = isFringe || aggressiveBehind && !premium(label) && !pairAtLeast(hand,"T");
      if (borderline && aggressiveBehind) return recommendationBase("MIX", "mix", `${label} is a close open`, "The baseline range opens this hand, but aggressive players behind reduce how often it realizes equity.", size, "Medium", {}, [
        `${label} is ${withArticle(family)} near the lower part of the opening range.`,
        "Frequent 3-bets make marginal opens less profitable.",
        "Folding the bottom of a range is different from becoming overly tight."
      ], ["Raise more often when the players behind are passive.", "Fold more often when a strong player has position on you."], "Do not defend a later 3-bet only because you already opened.", postflopPlan(hand,label), "Open-raise rather than limp first in.", "Trim the weakest opens when the table attacks them correctly.");
      return recommendationBase("RAISE", "raise", `Open ${label}`, "This hand belongs in the simplified opening range for your position and table size.", size, confidenceFor(false), {}, [
        `${label} is ${withArticle(family)} with enough strength or playability for ${state.heroPosition}.`,
        `${positionLayout().length - 1 - preflopIndex(state.heroPosition)} player(s) remain behind you.`,
        "Entering as the raiser gives you initiative and a chance to win without seeing a flop."
      ], ["Limping first in usually sacrifices fold equity.", "Calling is not available because nobody has entered the pot."], "If you later face heavy action, reassess from zero. The open is sunk money.", postflopPlan(hand,label), "Raise or fold in unopened pots.", $("blindTendency").value === "sticky" ? "Use the larger size and keep the range value-heavy against sticky blinds." : "No major deviation is needed without a stronger read.");
    }
    if (isFringe && favorable) return recommendationBase("RAISE", "raise", `Steal with ${label}`, "This is outside the default range, but tight blinds make a selective late-position steal reasonable.", size, "Medium", {}, [
      "Tight blinds increase immediate fold equity.",
      "The hand is close enough to the baseline range to use selectively.",
      "The exploit stops working if the blinds defend or 3-bet more often."
    ], ["Fold at a normal or aggressive table.", "Do not widen every offsuit hand just because one steal is available."], "A failed steal is not a reason to continue after the conditions change.", postflopPlan(hand,label), "Fold by default.", "Open as a targeted exploit against over-folding blinds.");
    return recommendationBase("FOLD", "fold", `Fold ${label}`, "The hand is outside the simplified opening range for this seat.", 0, "High", {}, [
      `${label} is ${withArticle(family)} that does not realize enough equity from ${state.heroPosition}.`,
      "More players behind means more chances to run into a stronger range.",
      "Folding now avoids difficult dominated-pair decisions later."
    ], ["It may become an open from a later seat.", "A suited version may have enough playability where the offsuit version does not."], "Folding costs no additional chips. You do not need to recover blinds on this hand.", postflopPlan(hand,label), "Fold.", "Only widen with a clear table-specific reason.");
  }

  function limpedRecommendation(hand,label) {
    const limpers = clamp(Number($("limperCount").value || 1), 1, state.playerCount - 1);
    const profile = currentProfile();
    const oop = ["SB","BB"].includes(state.heroPosition);
    const stack = Number($("effectiveStack").value || 100);
    let size = Number($("openBase").value || defaultOpenSizeBB()) + limpers;
    if (oop) size += 1;
    if ($("environment").value === "live" && $("tableTexture").value === "loosePassive") size += 1;
    const strong = premium(label) || pairAtLeast(hand,"9") || ["ATs","AJs","AQs","AKs","AJo","AQo","AKo","KJs","KQs","KQo","QJs"].includes(label);
    const playable = late(state.heroPosition) && (["A8s","A9s","KTs","QTs","JTs","T9s"].includes(label) || hand.pair && hand.high >= rankValue("5"));
    const canOverlimp = speculative(hand) && stack >= 80 && (!oop || state.heroPosition === "BB");
    if (strong || playable && profile !== "nit") return recommendationBase("RAISE", "raise", `Isolate with ${label}`, "Your hand is strong enough to build a pot against ranges that entered passively.", size, strong ? "High" : "Medium", {}, [
      "Limping ranges are generally weaker than opening ranges.",
      `The size accounts for ${limpers} limper${limpers > 1 ? "s" : ""}${oop ? " and your positional disadvantage" : ""}.`,
      selectedReads().has("callsTooMuch") ? "The observed calling tendency supports a larger, value-heavy raise." : "The raise can win immediately or create a pot where you hold the stronger range."
    ], ["Overlimping lets weaker hands realize equity cheaply.", "A tiny raise is likely to create a large multiway pot."], "If several players call, one pair becomes less valuable. Do not confuse a large preflop pot with an obligation to stack off.", postflopPlan(hand,label), "Raise strong and playable value hands over limpers.", profile === "callingStation" || selectedReads().has("callsTooMuch") ? "Size up for value and reduce bluff isolation raises." : "Use normal isolation pressure.");
    if (state.heroPosition === "BB") return recommendationBase("CHECK", "call", `Check ${label}`, "You can see the flop without investing another chip.", 0, "High", {}, [
      "The big blind already has the option to check after limpers.",
      canOverlimp ? "The hand has enough speculative value to take a free flop." : "Even a weak hand should take the free option rather than fold.",
      "Raising is optional only when the limpers are likely to fold or call with much worse."
    ], ["Do not fold when checking is free.", "Do not automatically inflate the pot with a marginal hand."], "A free flop does not mean you must continue when you make a weak pair.", postflopPlan(hand,label), "Check.", "Raise selectively against limp-folders, not automatically.");
    if (canOverlimp && late(state.heroPosition)) return recommendationBase("CALL", "call", `Overlimp ${label}`, "Deep stacks and position allow this speculative hand to realize value at a low price.", 1, "Medium", {}, ["The hand can make sets, straights, flushes, or strong draws.", "Position improves equity realization.", "The call stays small relative to the effective stack."], ["Fold if a large raise behind is likely.", "Do not overlimp dominated offsuit broadways just because the price looks cheap."], "The preflop call buys a chance to improve. It does not buy the right to chase every draw.", postflopPlan(hand,label), "Call selectively with deep, playable hands.", "Prefer raising when the limpers fold too much.");
    return recommendationBase("FOLD", "fold", `Skip the limp with ${label}`, "The hand is likely to make weak pairs and expensive second-best holdings.", 0, "High", {}, ["Cheap calls accumulate quickly over a session.", "The hand lacks enough nut potential or domination value.", "Position does not rescue every suited or connected hand."], ["A deeper stack and later position can make selected speculative hands playable.", "The big blind can check instead of folding when no raise occurred."], "You are not losing the pot by folding. You are declining a negative-price entry.", postflopPlan(hand,label), "Fold.", "Do not copy the table's loose calls without a clear reason.");
  }

  function rangeStrength(position, profile) {
    let score = preflopIndex(position) <= 1 ? 2 : late(position) ? 0 : 1;
    if (profile === "nit") score += 2;
    if (profile === "standard") score += 0;
    if (profile === "loose") score -= 1;
    if (profile === "callingStation") score += 1;
    if (profile === "wild") score -= 2;
    if (selectedReads().has("jamsWide") || selectedReads().has("bluffsTooMuch")) score -= 1;
    if (selectedReads().has("underbluffs")) score += 1;
    return clamp(score, -2, 4);
  }

  function facingOpenRecommendation(hand,label) {
    const opener = $("aggressorPosition").value;
    const profile = currentProfile();
    const openSize = Number($("aggressorSize").value || 3);
    const callers = state.scenario === "openCallers" ? clamp(Number($("callerCount").value || 1),1,8) : 0;
    const stack = Number($("effectiveStack").value || 100);
    const ip = inPosition(state.heroPosition, opener);
    const strength = rangeStrength(opener, profile);
    const bigOpen = openSize >= 5 || openSize / stack >= .08;
    const callCost = Math.max(0, openSize - heroPostedBB());
    const potBefore = initialPotBB() + openSize + callers * openSize;
    const potOdds = callCost / (potBefore + callCost) * 100;
    let valueSet = THREEBET_NORMAL;
    if (strength >= 3) valueSet = THREEBET_TIGHT;
    if (strength <= 0) valueSet = THREEBET_WIDE;
    if (strength <= -1 || selectedReads().has("jamsWide")) valueSet = THREEBET_VERY_WIDE;
    const value3bet = valueSet.has(label);
    const bluff3bet = LIGHT_3BET.has(label) && strength <= 1 && openSize <= 3.5 && callers === 0 && (ip || state.heroPosition === "SB") && profile !== "callingStation" && !selectedReads().has("callsTooMuch");
    let callSet = strength >= 3 ? CALL_TIGHT : strength <= 0 ? CALL_WIDE : CALL_NORMAL;
    let canCall = callSet.has(label);
    if (state.heroPosition === "BB" && !bigOpen) canCall = canCall || BB_DEFEND_EXTRA.has(label);
    if (!ip && state.heroPosition !== "BB" && !premium(label)) canCall = canCall && !dominatedOffsuit(label);
    if (bigOpen && !premium(label)) canCall = canCall && (pairAtLeast(hand,"T") || ["AQs","AKs","AQo","AKo","KQs"].includes(label));
    if (callers > 0 && speculative(hand) && stack >= 100 && ip && !dominatedOffsuit(label)) canCall = true;
    const multiplier = ip ? 3 : 4;
    const threeBetSize = openSize * multiplier + callers * openSize;
    const plan = postflopPlan(hand,label);

    if (value3bet || bluff3bet) {
      const isBluff = bluff3bet && !value3bet;
      return recommendationBase("3-BET", "raise", `${isBluff ? "Pressure" : "Value 3-bet"} with ${label}`, isBluff ? "This hand blocks strong continues and plays better as a raise-or-fold candidate than as a flat call." : "Your hand is strong enough to build the pot against the selected opening range.", threeBetSize, isBluff ? "Medium" : "High", { potOdds }, [
        isBluff ? "The hand has useful blockers and retains equity when called." : "Worse hands can continue against this range and player profile.",
        `${ip ? "Position" : "Being out of position"} supports a ${multiplier}x base multiplier.`,
        callers ? `The size increases because ${callers} caller${callers > 1 ? "s" : ""} added dead money.` : "A larger raise denies equity and avoids inviting the field in."
      ], [isBluff ? "Fold if the opener is tight, oversized, or likely to call every 3-bet." : "Calling may under-realize value and invite players behind.", "Do not use a tiny 3-bet that gives everyone an easy price."], "A 3-bet creates a larger pot, but it does not commit the entire stack. Reevaluate a 4-bet using its range and price.", plan, isBluff ? "Use selected blocker hands as low-frequency 3-bets." : "3-bet for value.", profile === "callingStation" || selectedReads().has("callsTooMuch") ? "Remove bluff 3-bets and widen only the value side." : "The selected profile supports the displayed range.");
    }

    if (canCall) return recommendationBase("CALL", "call", `Call with ${label}`, "The hand has enough equity and playability to continue without inflating the pot.", callCost, confidenceFor(bigOpen || !ip, true), { potOdds }, [
      `You need roughly ${potOdds.toFixed(1)}% equity before accounting for future betting.`,
      ip ? "Position improves equity realization after the flop." : state.heroPosition === "BB" ? "The big blind's discount supports a wider defense." : "The call is acceptable, but out-of-position realization lowers confidence.",
      callers ? "The extra callers improve immediate price but reduce the value of one-pair hands." : "Calling keeps weaker opens and bluffs in the opponent's range."
    ], ["3-bet hands that gain more from fold equity or value isolation.", "Fold hands that mainly make dominated top pairs."], "Call because the current price and range justify it, not because folding feels like surrendering the blind.", plan, "Continue by calling.", selectedReads().has("overvaluesPairs") && hand.pair ? "Set value improves, but do not pay any price merely to flop a set." : "No major adjustment without a stronger read.");

    return recommendationBase("FOLD", "fold", `Fold ${label} to the open`, "The hand lacks enough strength, position, or nut potential for this price.", 0, "High", { potOdds }, [
      bigOpen ? "The larger open worsens your price and lowers implied odds." : "The hand remains outside the default continuing range.",
      dominatedOffsuit(label) ? "It frequently makes an expensive second-best top pair." : "It does not realize enough equity against the selected range.",
      strength >= 2 ? "The opener's position or profile indicates a strong range." : "Even a wide opener does not make every hand a profitable defense."
    ], ["Continue wider in the big blind against small late-position opens.", "3-bet selected blockers rather than flatting weak dominated hands."], "The chips already posted as a blind are sunk. Compare the additional call with the pot and range.", plan, "Fold.", profile === "wild" ? "A proven wild opponent can widen value continues, but evidence should come before hero calls." : "Respect the selected range until you observe a clear deviation.");
  }

  function facingThreeBetRecommendation(hand,label) {
    const villain = $("aggressorPosition").value;
    const profile = currentProfile();
    const open = Number($("heroOpenSize").value || 3);
    const threeBet = Number($("aggressorSize").value || 10);
    const stack = Number($("effectiveStack").value || 100);
    const ip = inPosition(state.heroPosition, villain);
    const strength = rangeStrength(villain, profile);
    const callCost = Math.max(0, threeBet - open);
    const potBefore = initialPotBB() + open + threeBet;
    const potOdds = callCost / (potBefore + callCost) * 100;
    const sizePressure = threeBet / stack;
    const wild = strength <= 0 || selectedReads().has("jamsWide") || selectedReads().has("bluffsTooMuch");
    const value4bet = ["AA","KK"].includes(label) || (wild && ["QQ","AKs","AKo"].includes(label));
    const callStrong = ["QQ","JJ","TT","AKs","AKo","AQs"].includes(label) || (wild && ["99","AQo","AJs","KQs"].includes(label));
    const plan = postflopPlan(hand,label);
    const fourBetSize = sizePressure >= .25 ? stack : Math.min(stack, threeBet * (ip ? 2.2 : 2.4));

    if (value4bet) return recommendationBase(fourBetSize >= stack ? "ALL-IN" : "4-BET", "raise", `${label} can play for stacks`, "The hand is at the top of your range against the selected 3-betting profile.", fourBetSize, "High", { potOdds }, [
      "The opponent can continue with worse value hands or overly aggressive bluffs.",
      fourBetSize >= stack ? "The stack is shallow enough that a non-all-in 4-bet would leave an awkward remainder." : "The sizing applies maximum pressure without unnecessarily committing every hand.",
      selectedReads().has("jamsWide") ? "The observed wide-jam tendency materially widens your value response." : "The hand remains strong even without a special read."
    ], ["Calling can be used selectively in position, but may miss value.", "Folding the top of range would be too exploitable."], "Being willing to stack off with a top-range hand is not the same as being pot committed with a marginal hand.", plan, "4-bet for value.", wild ? "Continue wider because the 3-bettor is demonstrably over-aggressive." : "Use the normal top-range response.");

    if (callStrong && sizePressure < .25) return recommendationBase("CALL", "call", `Continue with ${label}`, "The hand is strong enough to defend against this 3-bet without automatically building a stack-sized pot.", callCost, "Medium-high", { potOdds }, [
      `The immediate call requires about ${potOdds.toFixed(1)}% equity.`,
      ip ? "Position supports calling and preserving the opponent's bluffs." : "Out-of-position play makes the defense more difficult, so the range stays tighter.",
      "The 3-bet size is not so large that continuing automatically commits the stack."
    ], ["4-bet the top of the range for value.", "Fold dominated or speculative opens that cannot realize equity in a low-SPR pot."], "Your original open is sunk. The only question is whether the new call is profitable against the current range and size.", plan, "Call selected strong hands.", profile === "nit" || selectedReads().has("underbluffs") ? "Fold the bottom of this calling range against underbluffed 3-bets." : "No large deviation is needed.");

    return recommendationBase("FOLD", "fold", `Release ${label} to the 3-bet`, "The hand is not strong enough to continue in a large pot against the selected range and sizing.", 0, "High", { potOdds }, [
      "Opening a hand does not obligate you to defend it.",
      sizePressure >= .25 ? "The 3-bet consumes a large share of the effective stack." : "The hand remains below the appropriate defense threshold.",
      dominatedOffsuit(label) ? "Domination creates expensive top-pair mistakes." : "The hand lacks enough strength or nut potential."
    ], ["Defend wider against proven wide 3-bettors.", "Position and a smaller size can move borderline hands into the calling range."], "This is the exact spot where sunk-cost thinking becomes expensive. The open is gone. Protect the remaining stack.", plan, "Fold.", wild ? "Even against a wild player, avoid widening all the way to weak dominated holdings." : "Respect unknown and tight 3-bets.");
  }

  function facingFourBetRecommendation(hand,label) {
    const profile = currentProfile();
    const heroThreeBet = Number($("heroThreeBetSize").value || 10);
    const fourBet = Number($("aggressorSize").value || 23);
    const stack = Number($("effectiveStack").value || 100);
    const callCost = Math.max(0, fourBet - heroThreeBet);
    const potBefore = initialPotBB() + heroThreeBet + fourBet;
    const potOdds = callCost / (potBefore + callCost) * 100;
    const wild = profile === "wild" || selectedReads().has("jamsWide") || selectedReads().has("bluffsTooMuch");
    const premiumStack = ["AA","KK"].includes(label) || (wild && ["QQ","AKs","AKo"].includes(label));
    const cautiousCall = ["QQ","AKs","AKo"].includes(label) && fourBet / stack < .28 && profile !== "nit" && !selectedReads().has("underbluffs");
    const plan = postflopPlan(hand,label);
    if (premiumStack) return recommendationBase("ALL-IN", "raise", `Continue for stacks with ${label}`, "The hand is strong enough against the selected 4-betting range.", stack, "High", { potOdds }, ["The hand sits at the top of your 3-betting range.", wild ? "The opponent's observed over-aggression widens the profitable stack-off range." : "AA and KK remain clear value continues against normal ranges.", "Calling often leaves too little stack behind to improve the decision."], ["Do not slow-play if a call would create an awkward tiny stack-to-pot ratio."], "This is a range-based stack-off, not a decision caused by the chips already invested.", plan, "Jam for value.", wild ? "Widen carefully to QQ and AK when the evidence is strong." : "Keep the range premium.");
    if (cautiousCall) return recommendationBase("CALL", "call", `Call the 4-bet with ${label}`, "The size and profile allow a controlled continue, especially when position helps.", callCost, "Medium", { potOdds }, [`The direct price is about ${potOdds.toFixed(1)}%.`, "The hand retains strong equity against a non-nit range.", "The remaining stack still allows a postflop decision."], ["Fold against a tight, underbluffed 4-bettor.", "Jam instead when the stack is already shallow."], "Do not call because the pot looks too large to abandon. Call only if the range and remaining stack support it.", plan, "Continue selectively.", "This recommendation is highly opponent-dependent.");
    return recommendationBase("FOLD", "fold", `Fold ${label} to the 4-bet`, "At most stakes, unknown 4-bets are value-heavy enough that marginal continues lose money.", 0, "High", { potOdds }, ["The 4-betting range is usually much stronger than the opening or 3-betting range.", "The remaining decision involves the whole stack, not just the amount already invested.", selectedReads().has("underbluffs") ? "Your underbluff read makes the fold even clearer." : "Without evidence of excessive aggression, default to discipline."], ["Continue wider only against a proven wide 4-bettor.", "AA and KK remain standard stack-offs."], "The chips in your 3-bet are sunk. Saving the rest is a profitable outcome when the range is crushed.", plan, "Fold.", "Avoid hero calls based only on unusual hands you have seen other players show.");
  }

  function buildRecommendation() {
    const validation = model.validateSpot({ playerCount: state.playerCount, position: state.heroPosition, scenario: state.scenario, cards: state.cards });
    if (!validation.valid) throw new Error(validation.error);
    const hand = classifyCards(state.cards[0], state.cards[1]);
    const label = handLabel(hand);
    if (state.scenario === "unopened") return unopenedRecommendation(hand,label);
    if (state.scenario === "limpers") return limpedRecommendation(hand,label);
    if (["open","openCallers"].includes(state.scenario)) return facingOpenRecommendation(hand,label);
    if (state.scenario === "threeBet") return facingThreeBetRecommendation(hand,label);
    return facingFourBetRecommendation(hand,label);
  }

  function advisorNotes(result, label, hand) {
    const action = result.action;
    const remaining = Math.max(0, positionLayout().length - 1 - preflopIndex(state.heroPosition));
    const stack = Number($("effectiveStack").value || 100);
    const reads = selectedReads().size;
    const pressure = action === "FOLD"
      ? ["Protect Stack", "No extra chips is a profitable result when range or price is wrong."]
      : action === "CALL"
        ? ["Realize Equity", "Take the price, then avoid turning one pair into a stack-off by default."]
        : action === "CHECK"
          ? ["Free Flop", "See the board for no added cost and make the next decision from scratch."]
          : action === "MIX"
            ? ["Close Spot", "Let table conditions decide the frequency instead of forcing one rigid answer."]
            : ["Apply Pressure", "Know the response to a raise before putting the next chips in."];
    const price = Number.isFinite(result.metrics?.potOdds)
      ? [`${result.metrics.potOdds.toFixed(1)}% Price`, "Future betting and position still matter more than the raw pot odds."]
      : [`${stack} BB Stack`, stack < 40 ? "Lower stack depth makes dominated calls and speculative flats less forgiving." : "There is enough depth to prioritize range quality and postflop control."];
    const table = state.scenario === "unopened"
      ? [`${remaining} Behind`, remaining >= 5 ? "Many players still act, so dominated hands need extra discipline." : "Late position lowers pressure, but weak opens still need a clear reason."]
      : $("tableTexture").value === "loosePassive"
      ? ["Value Lean", "Size up thinner for value and reduce low-equity bluffs."]
      : $("tableTexture").value === "aggressive" || $("playersBehind").value === "squeezy"
        ? ["Pressure Behind", "Trim marginal opens and avoid loose calls that invite squeezes."]
        : reads ? [`${reads} Read${reads > 1 ? "s" : ""}`, "Use the selected tendencies, but keep the baseline as the anchor."]
          : ["Baseline First", "No strong table read yet, so let position and range drive the play."];
    const handNote = hand.pair
      ? ["Pair Plan", hand.high >= rankValue("T") ? "Big pairs want value, but bad boards still deserve respect." : "Small pairs need set value or a cheap path to showdown."]
      : hand.suited
        ? ["Suited Plan", suitedAce(hand) ? "Nut potential matters most; weak top pair is not the prize." : "Prefer draws, position, and implied odds over weak-pair attachment."]
        : ["Offsuit Plan", dominatedOffsuit(label) ? "Watch reverse domination when top pair appears." : "Win with initiative or clear pair strength, not stubborn curiosity."];
    return [
      { label: "Advisor focus", title: pressure[0], body: pressure[1] },
      { label: "Price check", title: price[0], body: price[1] },
      { label: "Table fit", title: table[0], body: table[1] },
      { label: "Hand plan", title: handNote[0], body: handNote[1] }
    ];
  }

  function renderResultEmpty() {
    state.lastResult = null;
    $("resultPanel").innerHTML = `<div class="result-empty"><strong>Add your cards to see the spot.</strong><br />The result will separate the baseline decision from the opponent-specific adjustment.</div>`;
  }

  function autoAnalyze(options = {}) {
    if (!state.cards.every(Boolean)) {
      renderResultEmpty();
      return false;
    }

    try {
      renderResult(buildRecommendation(), { saveHistory: Boolean(options.saveHistory) });
      return true;
    } catch (error) {
      if (options.notify) showToast(error.message || "Check the inputs and try again.");
      return false;
    }
  }

  function renderResult(result, options = {}) {
    state.lastResult = result;
    const hand = classifyCards(state.cards[0], state.cards[1]);
    const label = handLabel(hand);
    const notes = advisorNotes(result, label, hand);
    const sizeDisplay = result.sizeBB > 0 ? formatSize(result.sizeBB) : result.action === "CHECK" ? "No additional chips" : "0 BB";
    const potOdds = Number.isFinite(result.metrics?.potOdds) ? `${result.metrics.potOdds.toFixed(1)}%` : "Not applicable";
    const className = result.className;
    $("resultPanel").innerHTML = `
      <article class="result-card">
        <div class="result-banner">
          <div class="action-badge ${className}">${result.action}</div>
          <div class="result-title"><h2>${result.headline}</h2><p>${result.summary}</p></div>
          <div class="result-size"><span>Suggested size or cost</span><strong>${sizeDisplay}</strong></div>
        </div>
        <div class="result-body">
          <div class="metric-row">
            <div class="metric"><span>Hand</span><strong>${label}</strong></div>
            <div class="metric"><span>Position</span><strong>${state.heroPosition}</strong></div>
            <div class="metric"><span>Pot odds</span><strong>${potOdds}</strong></div>
            <div class="metric"><span>Confidence</span><strong>${result.confidence}</strong></div>
          </div>
          <section class="advisor-snapshot" aria-label="Advisor snapshot">
            <div class="section-heading"><span>Read The Spot</span><strong>What matters most right now</strong></div>
            <div class="advisor-grid">${notes.map((note) => `<div class="advisor-note"><span>${note.label}</span><strong>${note.title}</strong><p>${note.body}</p></div>`).join("")}</div>
          </section>
          <section class="advice-layout" aria-label="Decision explanation">
            <div class="reason-panel">
              <div class="section-heading"><span>Decision Logic</span><strong>Why this is the play</strong></div>
              <ol class="reason-list">${result.why.map((x) => `<li><span>${x}</span></li>`).join("")}</ol>
            </div>
            <aside class="avoid-panel">
              <div class="section-heading"><span>Discipline</span><strong>What not to force</strong></div>
              <ul class="avoid-list">${result.alternatives.map((x) => `<li>${x}</li>`).join("")}</ul>
            </aside>
          </section>
          <div class="commitment"><span>Pot-commitment check</span><strong>${result.commitment}</strong></div>
          <section class="plan-section" aria-label="Postflop plan">
            <div class="section-heading"><span>After The Flop</span><strong>Plan before chips go in</strong></div>
            <div class="plan-row">
              <div class="plan-card"><h4>Goal</h4><p>${result.plan.goal}</p></div>
              <div class="plan-card"><h4>Good boards</h4><p>${result.plan.good}</p></div>
              <div class="plan-card danger"><h4>Main danger</h4><p>${result.plan.danger}</p></div>
            </div>
          </section>
          <section class="baseline-grid" aria-label="Baseline and exploit">
            <div class="baseline-card"><span>Baseline</span><strong>${result.baseline}</strong></div>
            <div class="baseline-card exploit"><span>Exploit adjustment</span><strong>${result.exploit}</strong></div>
          </section>
          <div class="result-footer"><div class="confidence">Educational heuristic for NLH preflop study, not a solver output.</div><div style="display:flex;gap:8px"><button class="soft-btn small" id="copyResultBtn">Copy summary</button><button class="soft-btn small" id="studyHandBtn">View in Range Lab</button></div></div>
        </div>
      </article>`;
    $("copyResultBtn").addEventListener("click", copyResult);
    $("studyHandBtn").addEventListener("click", () => { state.rangePosition = state.heroPosition === "BB" ? (positionLayout().includes("BTN") ? "BTN" : positionLayout()[0]) : state.heroPosition; $("rangePlayerCount").value = state.playerCount; switchView("ranges"); renderRangeLab(); });
    if (options.saveHistory) saveRecent(result, label);
  }

  function postflopDrawText(draws) {
    const labels = [];
    if (draws.flushDraw) labels.push("flush draw");
    if (draws.straightDraw) labels.push("straight draw");
    if (draws.gutshot) labels.push("gutshot");
    if (draws.backdoorFlush) labels.push("backdoor flush");
    if (draws.overcards) labels.push(`${draws.overcards} overcard${draws.overcards > 1 ? "s" : ""}`);
    return labels.length ? labels.join(", ") : "No major draw";
  }

  function parsePostflopInputs() {
    const hero = holdem.parseExactCards($("postflopHandInput").value, { min: 2, max: 2 });
    const board = holdem.parseExactCards($("postflopBoardInput").value, { min: 3, max: 5 });
    const errors = [];
    setInputInvalid("postflopHandInput", Boolean(hero.error));
    setInputInvalid("postflopBoardInput", Boolean(board.error));
    if (hero.error) errors.push(`Hand: ${hero.error}`);
    if (board.error) errors.push(`Board: ${board.error}`);
    if (errors.length) return { error: errors.join(" ") };
    return {
      heroCards: hero.cards,
      boardCards: board.cards,
      profile: $("postflopProfile").value,
      position: $("postflopPosition").value,
      initiative: $("postflopInitiative").value,
      iterations: Number($("postflopIterations").value || 15000),
      potBB: Number($("postflopPot").value || 0),
      facingBetBB: Number($("postflopFacingBet").value || 0),
      betSizeBB: Number($("postflopBetSize").value || 0)
    };
  }

  function setInputInvalid(id, isInvalid) {
    const input = $(id);
    if (!input) return;
    input.classList.toggle("invalid", isInvalid);
    if (isInvalid) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
  }

  function renderPostflopEmpty(message = "Add a hand and board to see postflop advice.") {
    $("postflopResultPanel").innerHTML = `<div class="result-empty"><strong>${message}</strong><br />Use exact cards so suits and blockers are calculated correctly.</div>`;
  }

  function renderPostflopResult(result, input) {
    const boardText = input.boardCards.map(inputCardCode).join(" ");
    const handText = input.heroCards.map(inputCardCode).join(" ");
    const facingBet = Number(input.facingBetBB || 0);
    const sizeLabel = facingBet > 0 ? `Call ${facingBet.toFixed(1)} BB` : `Test bet ${result.plannedBet.toFixed(1)} BB`;
    const method = result.equity.exact ? "Exact" : "Monte Carlo";
    const priceLabel = facingBet > 0 ? `${result.potOdds.toFixed(1)}%` : "No bet faced";
    const mdfLabel = facingBet > 0 ? `${result.mdf.toFixed(1)}%` : "Not needed";
    $("postflopResultPanel").innerHTML = `
      <article class="result-card postflop-result-card">
        <div class="result-banner">
          <div class="action-badge ${result.tone}">${result.action}</div>
          <div class="result-title"><h2>${result.headline}</h2><p>${result.summary}</p></div>
          <div class="result-size"><span>Current price</span><strong>${sizeLabel}</strong></div>
        </div>
        <div class="result-body">
          <div class="metric-row postflop-metric-row">
            <div class="metric"><span>Street</span><strong>${result.street}</strong></div>
            <div class="metric"><span>Your hand</span><strong>${handText}</strong></div>
            <div class="metric"><span>Board</span><strong>${boardText}</strong></div>
            <div class="metric"><span>Made hand</span><strong>${result.handName}</strong></div>
            <div class="metric"><span>Equity</span><strong>${result.equity.equity.toFixed(1)}%</strong></div>
            <div class="metric"><span>Engine</span><strong>${method} · ${result.equity.trials.toLocaleString()}</strong></div>
          </div>
          <section class="advice-layout postflop-advice" aria-label="Postflop decision explanation">
            <div class="reason-panel">
              <div class="section-heading"><span>Decision Logic</span><strong>Why this line makes sense</strong></div>
              <ol class="reason-list">${result.reasons.map((reason) => `<li><span>${reason}</span></li>`).join("")}</ol>
            </div>
            <aside class="avoid-panel">
              <div class="section-heading"><span>Watch Out</span><strong>Easy mistakes in this spot</strong></div>
              <ul class="avoid-list">${result.cautions.map((caution) => `<li>${caution}</li>`).join("")}</ul>
            </aside>
          </section>
          <section class="solver-grid" aria-label="Solver-style metrics">
            <div class="solver-tile"><span>Pot odds</span><strong>${priceLabel}</strong><p>The equity needed to call the current bet.</p></div>
            <div class="solver-tile"><span>MDF guide</span><strong>${mdfLabel}</strong><p>How much of your range should continue versus this size.</p></div>
            <div class="solver-tile"><span>Board texture</span><strong>${result.texture.label}</strong><p>${result.texture.connected || result.texture.monotone ? "Expect stronger made hands and draws." : "Ranges are less connected here."}</p></div>
            <div class="solver-tile"><span>Draws</span><strong>${postflopDrawText(result.draws)}</strong><p>Backup equity if the hand is not already strong.</p></div>
          </section>
          <div class="result-footer"><div class="confidence">Equity is calculated by the local Hold'em engine. Advice is solver-inspired, not a solved GTO tree.</div></div>
        </div>
      </article>`;
  }

  function analyzePostflop() {
    if (!$("postflopResultPanel")) return false;
    const input = parsePostflopInputs();
    if (input.error) {
      renderPostflopEmpty(input.error);
      return false;
    }
    try {
      const result = holdem.analyzePostflop(input);
      if (result.error) {
        renderPostflopEmpty(result.error);
        return false;
      }
      renderPostflopResult(result, input);
      return true;
    } catch (error) {
      renderPostflopEmpty(error.message || "The engine could not evaluate this spot.");
      return false;
    }
  }

  function schedulePostflopAnalyze() {
    clearTimeout(schedulePostflopAnalyze.timer);
    schedulePostflopAnalyze.timer = setTimeout(analyzePostflop, 120);
  }

  function useCoachHandForPostflop() {
    if (!state.cards.every(Boolean)) {
      showToast("Choose a preflop hand first.");
      return;
    }
    $("postflopHandInput").value = state.cards.map(inputCardCode).join(" ");
    analyzePostflop();
    showToast("Coach hand loaded into Postflop.");
  }

  function copyResult() {
    if (!state.lastResult) return;
    const label = handLabel(classifyCards(state.cards[0], state.cards[1]));
    const text = `${label} from ${state.heroPosition}: ${state.lastResult.action}. ${state.lastResult.headline}. ${state.lastResult.summary}`;
    navigator.clipboard?.writeText(text).then(() => showToast("Recommendation copied.")).catch(() => showToast("Copy was not available in this browser."));
  }

  function saveRecent(result, label) {
    const item = {
      id: Date.now(),
      cards: state.cards.map(cardCode),
      label,
      position: state.heroPosition,
      players: state.playerCount,
      scenario: state.scenario,
      action: result.action,
      timestamp: new Date().toISOString()
    };
    const history = readHistory().filter((entry) => !(entry.label === item.label && entry.position === item.position && entry.scenario === item.scenario));
    history.unshift(item);
    storageSet("preflopStudioHistory", JSON.stringify(history.slice(0,6)));
    renderHistory();
  }

  function readHistory() {
    try { return JSON.parse(storageGet("preflopStudioHistory", "[]")); }
    catch { return []; }
  }

  function parseCardCode(code) {
    if (!code || code.length < 2) return null;
    return { rank: code[0], suit: code[1] };
  }

  function renderHistory() {
    const list = $("recentList");
    const history = readHistory();
    if (!history.length) { list.innerHTML = `<div style="color:var(--muted);font-size:.85rem">No analyzed hands yet.</div>`; return; }
    list.innerHTML = history.map((item) => `<button class="recent-item" data-id="${item.id}"><span class="recent-cards">${item.label}</span><span><span style="display:block;font-weight:800">${item.position} · ${item.players}-max</span><span class="recent-meta">${scenarioName(item.scenario)}</span></span><span class="recent-action">${item.action}</span></button>`).join("");
    document.querySelectorAll(".recent-item").forEach((button) => button.addEventListener("click", () => {
      const item = history.find((x) => String(x.id) === button.dataset.id);
      if (!item) return;
      $("playerCount").value = item.players;
      state.playerCount = item.players;
      state.heroPosition = item.position;
      state.scenario = item.scenario;
      state.cards = item.cards.map(parseCardCode);
      switchView("coach");
      renderAllCore();
      showToast(`${item.label} loaded. Recheck contextual fields before analyzing.`);
    }));
  }

  function setCoachSpot(spot) {
    state.heroPosition = spot.position;
    state.scenario = spot.scenario;
    state.cards = representativeCards(spot.label);
  }

  function evaluateDrillSpot(spot, shouldSync = true) {
    const previous = {
      heroPosition: state.heroPosition,
      scenario: state.scenario,
      cards: state.cards.map((card) => card ? { ...card } : null)
    };
    setCoachSpot(spot);
    renderAllCore();
    const result = buildRecommendation();
    if (!shouldSync) {
      state.heroPosition = previous.heroPosition;
      state.scenario = previous.scenario;
      state.cards = previous.cards;
      renderAllCore();
    }
    return result;
  }

  function dealDrillSpot() {
    let scenarios = availableDrillScenarios();
    if (!scenarios.length) return null;
    const focus = $("drillFocus")?.value || "all";
    if (focus === "blindDefense" && scenarios.includes("open")) scenarios = ["open"];
    const scenario = randomItem(scenarios);
    let position = chooseDrillPosition(scenario);
    if (focus === "blindDefense" && availableDrillPositions(scenario).includes("BB")) position = "BB";
    const pool = drillHandPool(focus, position, scenario);
    const label = randomItem(pool);
    return { id: Date.now(), label, position, scenario };
  }

  function renderDrillStats() {
    const volume = state.drill.volume;
    const accuracy = volume ? Math.round(state.drill.correct / volume * 100) : 0;
    $("drillAccuracy").textContent = `${accuracy}%`;
    $("drillCorrect").textContent = String(state.drill.correct);
    $("drillVolume").textContent = String(volume);
    $("drillStreak").textContent = String(state.drill.streak);
    const history = state.drill.history.slice(0, 6);
    $("drillHistory").innerHTML = history.length
      ? history.map((item) => `<div class="drill-history-item ${item.correct ? "correct" : "missed"}"><strong>${item.correct ? "✓" : "×"}</strong><span>${item.label} · ${item.position} · ${scenarioName(item.scenario)}</span><strong>${item.action}</strong></div>`).join("")
      : `<div style="color:var(--muted);font-size:.85rem">No drill answers yet.</div>`;
  }

  function renderDrillSpot() {
    const spot = state.drill.current;
    document.querySelectorAll(".answer-btn").forEach((button) => {
      button.disabled = !spot;
      button.classList.remove("correct", "missed");
    });
    if (!spot) {
      $("drillHand").textContent = "Ready";
      $("drillContext").textContent = "Deal a drill hand to begin.";
      $("drillFeedback").textContent = "Answer the spot to start building a session profile.";
      renderDrillStats();
      return;
    }
    $("drillHand").textContent = spot.label;
    $("drillContext").textContent = `${spot.position} · ${scenarioName(spot.scenario)} · ${$("effectiveStack").value || 100} BB`;
    $("drillFeedback").textContent = "Choose the action bucket that best matches the advisor.";
    renderDrillStats();
  }

  function newDrillHand(options = {}) {
    const spot = dealDrillSpot();
    if (!spot) { showToast("No legal drill spot is available for this table setup."); return; }
    const sync = options.forceSync || $("drillAutoLoad").value === "yes";
    const result = evaluateDrillSpot(spot, sync);
    state.drill.current = { ...spot, result };
    renderDrillSpot();
    if (sync && state.view !== "coach") showToast(`${spot.label} loaded in Coach.`);
  }

  function answerDrill(answer) {
    const spot = state.drill.current;
    if (!spot) { newDrillHand(); return; }
    const result = spot.result || buildRecommendation();
    const correctAnswer = actionBucket(result.action);
    const correct = answer === correctAnswer;
    state.drill.volume += 1;
    if (correct) {
      state.drill.correct += 1;
      state.drill.streak += 1;
    } else {
      state.drill.streak = 0;
    }
    state.drill.history.unshift({ label: spot.label, position: spot.position, scenario: spot.scenario, action: result.action, correct });
    state.drill.history = state.drill.history.slice(0, 8);
    document.querySelectorAll(".answer-btn").forEach((button) => {
      const bucket = button.dataset.answer;
      button.classList.toggle("correct", bucket === correctAnswer);
      button.classList.toggle("missed", bucket === answer && !correct);
    });
    $("drillFeedback").innerHTML = `<strong>${correct ? "Correct" : "Review this one"}:</strong> Advisor action is ${result.action}. ${result.headline}`;
    renderDrillStats();
  }

  function scenarioName(scenario) {
    return model.scenarioName(scenario);
  }

  function renderTax() {
    const players = Number($("taxPlayers").value), hands = Number($("taxHands").value), sb = Number($("taxSB").value), bb = Number($("taxBB").value), ante = Number($("taxAnte").value), symbol = ($("taxCurrency").value || "$ ").trim();
    if (![players,hands,sb,bb,ante].every(Number.isFinite) || players < 2 || bb <= 0) { $("taxOutput").innerHTML = ""; return; }
    const orbit = sb + bb + players * ante;
    const perHand = orbit / players;
    const total = perHand * hands;
    const bb100 = perHand / bb * 100;
    $("taxOutput").innerHTML = `<div class="metric"><span>Per orbit</span><strong>${symbol}${orbit.toFixed(2)}</strong></div><div class="metric"><span>Per hand</span><strong>${symbol}${perHand.toFixed(2)}</strong></div><div class="metric"><span>${hands} hands</span><strong>${symbol}${total.toFixed(2)}</strong></div><div class="metric"><span>Forced BB / 100</span><strong>${bb100.toFixed(2)}</strong></div>`;
  }

  function renderSessionAdvisor() {
    const bankroll = Number($("sessionBankroll").value);
    const buyIn = Number($("sessionBuyIn").value);
    const stopLossBI = Number($("sessionStopLoss").value);
    const tableQuality = $("sessionTableQuality").value;
    const symbol = ($("currency").value || "$ ").trim();
    if (![bankroll,buyIn,stopLossBI].every(Number.isFinite) || bankroll <= 0 || buyIn <= 0 || stopLossBI < 0) { $("sessionOutput").innerHTML = ""; return; }
    const buyIns = bankroll / buyIn;
    const stopLoss = stopLossBI * buyIn;
    const stopPct = stopLoss / bankroll * 100;
    let level = "Ready", className = "ready", advice = "The game fits the bankroll if the table is genuinely good and you can leave on the planned stop.";
    if (buyIns < 15 || stopPct > 20 || tableQuality === "tough" && buyIns < 25) {
      level = "High Risk";
      className = "risky";
      advice = "Move down, buy in smaller, or skip this lineup unless there is a very clear edge.";
    } else if (buyIns < 30 || stopPct > 10 || tableQuality === "unknown") {
      level = "Caution";
      className = "caution";
      advice = "Keep the session short, table-select hard, and do not chase after the stop-loss hits.";
    }
    if (tableQuality === "soft" && className !== "risky") advice = "A soft table can justify taking the seat, but the stop-loss still needs to be real.";
    $("sessionOutput").innerHTML = `<div class="metric"><span>Bankroll depth</span><strong>${buyIns.toFixed(1)} BI</strong></div><div class="metric"><span>Stop-loss cost</span><strong>${symbol}${stopLoss.toFixed(0)}</strong></div><div class="metric"><span>Bankroll at risk</span><strong>${stopPct.toFixed(1)}%</strong></div><div class="metric"><span>Game fit</span><strong>${level}</strong></div><div class="advisor-summary ${className}"><span>Advisor note</span><strong>${level}</strong><p>${advice}</p></div>`;
  }

  function parseReviewLine(line) {
    return reviewTools.parseReviewLine(line, { playerCount: state.playerCount, defaultPosition: state.heroPosition });
  }

  function analyzeReviewHands() {
    const lines = $("reviewInput").value.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    if (!lines.length) {
      $("reviewOutput").innerHTML = `<div class="advisor-summary caution"><span>Analyzer</span><strong>No hands found</strong><p>Add one hand note per line.</p></div>`;
      return;
    }
    const items = lines.map(parseReviewLine);
    const reviewed = [];
    const misses = [];
    items.forEach((item) => {
      if (item.error) { misses.push(item); return; }
      try {
        const result = evaluateDrillSpot(item, false);
        const advisorBucket = actionBucket(result.action);
        const match = advisorBucket === item.userBucket;
        reviewed.push({ ...item, result, advisorBucket, match });
      } catch (error) {
        misses.push({ ...item, error: error.message || "Could not evaluate hand" });
      }
    });
    const total = reviewed.length;
    const matches = reviewed.filter((item) => item.match).length;
    const accuracy = total ? Math.round(matches / total * 100) : 0;
    const mismatches = reviewed.filter((item) => !item.match);
    const leakCounts = mismatches.reduce((acc, item) => {
      const key = `${bucketName(item.userBucket)} vs ${item.result.action}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const leakSummary = Object.entries(leakCounts).sort((a,b) => b[1] - a[1])[0];
    const summaryClass = !total ? "caution" : accuracy >= 75 ? "ready" : accuracy >= 50 ? "caution" : "risky";
    const summaryTitle = !total ? "Needs cleaner input" : accuracy >= 75 ? "Solid Alignment" : accuracy >= 50 ? "Review Misses" : "Major Leak Alert";
    const summaryBody = leakSummary ? `Most common mismatch: ${leakSummary[0]} (${leakSummary[1]} hand${leakSummary[1] > 1 ? "s" : ""}).` : "Recorded actions mostly align with the advisor baseline.";
    const missRows = mismatches.slice(0, 5).map((item) => `<div class="recent-item"><span class="recent-cards">${item.label}</span><span><span style="display:block;font-weight:800">${item.position} · ${scenarioName(item.scenario)}</span><span class="recent-meta">You: ${bucketName(item.userBucket)} · Advisor: ${item.result.action}</span></span><span class="recent-action">Review</span></div>`).join("");
    const parseRows = misses.slice(0, 3).map((item) => `<div class="recent-item"><span class="recent-cards">?</span><span><span style="display:block;font-weight:800">${item.error}</span><span class="recent-meta">${item.line}</span></span><span class="recent-action">Skip</span></div>`).join("");
    $("reviewOutput").innerHTML = `
      <div class="metric"><span>Reviewed</span><strong>${total}</strong></div>
      <div class="metric"><span>Aligned</span><strong>${matches}</strong></div>
      <div class="metric"><span>Accuracy</span><strong>${accuracy}%</strong></div>
      <div class="metric"><span>Skipped</span><strong>${misses.length}</strong></div>
      <div class="advisor-summary ${summaryClass}"><span>Leak report</span><strong>${summaryTitle}</strong><p>${summaryBody}</p></div>
      ${missRows || parseRows ? `<div class="advisor-summary"><span>Review queue</span>${missRows}${parseRows}</div>` : ""}`;
  }

  function openDeck(slot) {
    state.activeCardSlot = slot;
    $("modalBackdrop").hidden = false;
    $("deckPopover").hidden = false;
    renderDeck();
    setTimeout(() => $("closeDeckBtn").focus(), 0);
  }
  function closeDeck() { $("modalBackdrop").hidden = true; $("deckPopover").hidden = true; }
  function renderDeck() {
    const grid = $("deckGrid"); grid.innerHTML = "";
    suits.forEach((suit) => {
      ranksDesc.forEach((rank) => {
        const card = { rank, suit: suit.code };
        const selected = state.cards.some((existing) => existing && cardCode(existing) === cardCode(card));
        const button = document.createElement("button");
        button.type = "button";
        button.className = `deck-card ${suit.color}${selected ? " selected" : ""}`;
        button.textContent = `${rank}${suit.symbol}`;
        button.disabled = selected;
        button.addEventListener("click", () => {
          state.cards[state.activeCardSlot] = card;
          const next = state.cards.findIndex((c) => !c);
          renderCards();
          renderRangeLab();
          autoAnalyze();
          if (next >= 0) { state.activeCardSlot = next; renderDeck(); }
          else closeDeck();
        });
        grid.appendChild(button);
      });
    });
  }

  function randomHand() {
    const deck = [];
    suits.forEach((suit) => ranksDesc.forEach((rank) => deck.push({ rank, suit: suit.code })));
    const first = Math.floor(Math.random() * deck.length);
    const card1 = deck.splice(first,1)[0];
    const card2 = deck[Math.floor(Math.random() * deck.length)];
    state.cards = [card1, card2];
    renderCards(); renderRangeLab();
    autoAnalyze();
  }

  function showToast(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2400);
  }

  function switchView(view) {
    state.view = view;
    document.querySelectorAll(".view").forEach((el) => el.classList.toggle("active", el.id === `view-${view}`));
    document.querySelectorAll(".nav-tab, .mobile-nav-btn").forEach((el) => el.classList.toggle("active", el.dataset.view === view));
    if (view === "postflop") analyzePostflop();
    if (view === "drills" && !state.drill.current) newDrillHand();
    if (view === "ranges") renderRangeLab();
    if (view === "tools") { renderTax(); renderSessionAdvisor(); renderHistory(); }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function savePreferences() {
    const data = {
      playerCount: state.playerCount,
      heroPosition: state.heroPosition,
      currency: $("currency").value,
      smallBlind: $("smallBlind").value,
      bigBlind: $("bigBlind").value,
      effectiveStack: $("effectiveStack").value,
      environment: $("environment").value,
      tableTexture: $("tableTexture").value,
      playersBehind: $("playersBehind").value,
      blindTendency: $("blindTendency").value,
      theme: document.documentElement.dataset.theme
    };
    storageSet("preflopStudioPreferences", JSON.stringify(data));
  }

  function loadPreferences() {
    try {
      const data = JSON.parse(storageGet("preflopStudioPreferences", "null"));
      if (!data) return;
      ["currency","smallBlind","bigBlind","effectiveStack","environment","tableTexture","playersBehind","blindTendency"].forEach((key) => { if (data[key] != null && $(key)) $(key).value = data[key]; });
      if (data.playerCount && POSITION_LAYOUTS[data.playerCount]) { state.playerCount = Number(data.playerCount); $("playerCount").value = String(data.playerCount); }
      if (data.heroPosition && POSITION_LAYOUTS[state.playerCount].includes(data.heroPosition)) state.heroPosition = data.heroPosition;
      if (data.theme) document.documentElement.dataset.theme = data.theme;
    } catch { /* ignore malformed local data */ }
  }

  function resetSpot() {
    state.playerCount = 9;
    state.heroPosition = "BTN";
    state.scenario = "unopened";
    state.cards = [null,null];
    state.readTags.clear();
    $("playerCount").value = "9";
    $("currency").value = "$";
    $("smallBlind").value = "1";
    $("bigBlind").value = "2";
    $("effectiveStack").value = "100";
    document.querySelectorAll(".read-tag").forEach((button) => button.classList.remove("active"));
    renderResultEmpty();
    renderAllCore();
  }

  function renderAllCore() {
    state.playerCount = Number($("playerCount").value);
    ensureAllowedScenario();
    renderDynamicFields();
    renderSeats();
    renderCards();
    scenarioButtonUpdate();
    renderStatus();
    $("rangePlayerCount").value = String(state.playerCount);
    renderRangeLab();
    savePreferences();
    autoAnalyze();
  }

  function bindEvents() {
    document.querySelectorAll(".nav-tab, .mobile-nav-btn").forEach((button) => button.addEventListener("click", () => switchView(button.dataset.view)));
    $("mobileViewBtn").addEventListener("click", () => {
      const order = ["coach","postflop","drills","ranges","tools"];
      switchView(order[(order.indexOf(state.view) + 1) % order.length]);
    });
    $("themeBtn").addEventListener("click", () => {
      document.documentElement.dataset.theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      savePreferences();
    });
    $("playerCount").addEventListener("change", () => { state.playerCount = Number($("playerCount").value); const layout = positionLayout(); if (!layout.includes(state.heroPosition)) state.heroPosition = layout.includes("BTN") ? "BTN" : layout[0]; renderAllCore(); });
    ["currency","smallBlind","bigBlind","effectiveStack"].forEach((id) => $(id).addEventListener("input", () => { renderStatus(); savePreferences(); renderSessionAdvisor(); autoAnalyze(); }));
    ["environment","tableTexture","playersBehind","blindTendency"].forEach((id) => $(id).addEventListener("change", () => { renderDynamicFields(); savePreferences(); autoAnalyze(); }));
    document.querySelectorAll("#scenarioSegments .segment").forEach((button) => button.addEventListener("click", () => { if (!scenarioAllowed(button.dataset.scenario)) return; state.scenario = button.dataset.scenario; renderDynamicFields(); scenarioButtonUpdate(); renderSeats(); autoAnalyze(); }));
    $("cardSlot1").addEventListener("click", () => openDeck(0));
    $("cardSlot2").addEventListener("click", () => openDeck(1));
    $("handInput").addEventListener("input", () => applyHandEntry($("handInput").value, { clearOnIncomplete: true, defaultOffsuit: shouldDefaultOffsuit($("handInput").value), preserveInput: true }));
    $("handInput").addEventListener("blur", () => {
      if (!$("handInput").value.trim()) return;
      if (normalizeHandEntry($("handInput").value) === normalizeHandEntry(currentHandInputLabel())) { syncHandInput(); return; }
      applyHandEntry($("handInput").value, { notify: true, defaultOffsuit: true });
    });
    $("handInput").addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      if (!applyHandEntry($("handInput").value, { notify: true, defaultOffsuit: true })) $("handInput").select();
    });
    $("randomHandBtn").addEventListener("click", randomHand);
    $("clearCardsBtn").addEventListener("click", () => { state.cards = [null,null]; renderCards(); renderRangeLab(); autoAnalyze(); });
    $("closeDeckBtn").addEventListener("click", closeDeck);
    $("modalBackdrop").addEventListener("click", closeDeck);
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeDeck(); });
    $("readTags").addEventListener("click", (event) => {
      const button = event.target.closest(".read-tag"); if (!button) return;
      const key = button.dataset.read;
      if (state.readTags.has(key)) state.readTags.delete(key); else state.readTags.add(key);
      button.classList.toggle("active", state.readTags.has(key));
      autoAnalyze();
    });
    $("coachForm").addEventListener("submit", (event) => {
      event.preventDefault();
      try {
        if ($("handInput").value.trim() && !applyHandEntry($("handInput").value, { notify: true, defaultOffsuit: true, analyze: false })) return;
        if (autoAnalyze({ notify: true, saveHistory: true })) showToast("Recommendation saved.");
      }
      catch (error) { showToast(error.message || "Check the inputs and try again."); }
    });
    $("resetBtn").addEventListener("click", resetSpot);
    $("rangePlayerCount").addEventListener("change", () => { state.rangePosition = POSITION_LAYOUTS[Number($("rangePlayerCount").value)].filter((p) => p !== "BB").at(-2) || POSITION_LAYOUTS[Number($("rangePlayerCount").value)][0]; renderRangeLab(); });
    ["postflopHandInput","postflopBoardInput","postflopPot","postflopFacingBet","postflopBetSize"].forEach((id) => $(id).addEventListener("input", schedulePostflopAnalyze));
    ["postflopProfile","postflopPosition","postflopInitiative","postflopIterations"].forEach((id) => $(id).addEventListener("change", analyzePostflop));
    $("postflopUseCoachHandBtn").addEventListener("click", useCoachHandForPostflop);
    $("newDrillBtn").addEventListener("click", () => newDrillHand());
    $("loadDrillBtn").addEventListener("click", () => { if (!state.drill.current) newDrillHand(); else { setCoachSpot(state.drill.current); switchView("coach"); renderAllCore(); } });
    document.querySelectorAll("#drillActions .answer-btn").forEach((button) => button.addEventListener("click", () => answerDrill(button.dataset.answer)));
    ["taxPlayers","taxHands","taxSB","taxBB","taxAnte","taxCurrency"].forEach((id) => $(id).addEventListener("input", renderTax));
    ["sessionBankroll","sessionBuyIn","sessionStopLoss"].forEach((id) => $(id).addEventListener("input", renderSessionAdvisor));
    $("sessionTableQuality").addEventListener("change", renderSessionAdvisor);
    $("reviewAnalyzeBtn").addEventListener("click", analyzeReviewHands);
    $("clearHistoryBtn").addEventListener("click", () => { storageRemove("preflopStudioHistory"); renderHistory(); showToast("Recent hands cleared."); });
  }

  loadPreferences();
  bindEvents();
  renderAllCore();
  renderDrillSpot();
  renderTax();
  renderSessionAdvisor();
  analyzePostflop();
  renderHistory();

  window.PreflopStudio = { state, model, holdem, reviewTools, OPEN, FRINGE, HU_OPEN, openingSet, buildRecommendation, autoAnalyze, advisorNotes, parseHandEntry, parseReviewLine, analyzePostflop, newDrillHand, answerDrill, analyzeReviewHands, renderRangeLab, renderSessionAdvisor };
})();
