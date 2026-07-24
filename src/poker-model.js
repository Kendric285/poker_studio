((global) => {
  "use strict";

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

  const rankValue = (rank) => ranksAsc.indexOf(rank);
  const cardCode = (card) => card ? `${card.rank}${card.suit}` : "";
  const clamp = (number, min, max) => Math.min(max, Math.max(min, number));

  function normalizedPosition(position) {
    if (position === "UTG+2") return "MP";
    if (position === "BTN/SB") return "BTN";
    return position;
  }

  function classifyCards(c1, c2) {
    const a = rankValue(c1.rank), b = rankValue(c2.rank);
    const high = Math.max(a, b), low = Math.min(a, b);
    return {
      high,
      low,
      highRank: ranksAsc[high],
      lowRank: ranksAsc[low],
      pair: a === b,
      suited: c1.suit === c2.suit,
      gap: high - low
    };
  }

  function handLabel(hand) {
    return hand.pair ? hand.highRank + hand.highRank : hand.highRank + hand.lowRank + (hand.suited ? "s" : "o");
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

  function normalizeHandEntry(value) {
    return String(value || "")
      .trim()
      .replace(/10/gi, "T")
      .replace(/[♠♤]/g, "S")
      .replace(/[♥♡]/g, "H")
      .replace(/[♦♢]/g, "D")
      .replace(/[♣♧]/g, "C")
      .replace(/[\s,/.-]+/g, "")
      .toUpperCase();
  }

  function sortedRanks(first, second) {
    return rankValue(first) >= rankValue(second) ? [first, second] : [second, first];
  }

  function shouldDefaultOffsuit(value) {
    const text = normalizeHandEntry(value);
    return /^([2-9TJQKA])([2-9TJQKA])$/.test(text) && text[0] !== text[1];
  }

  function parseHandEntry(value, options = {}) {
    const defaultOffsuit = Boolean(options.defaultOffsuit);
    const text = normalizeHandEntry(value);
    if (!text) return { cards: [null, null] };
    if (text.length < 2) return { incomplete: true };

    const exact = text.match(/^([2-9TJQKA])([SHDC])([2-9TJQKA])([SHDC])$/);
    if (exact) {
      const cards = [{ rank: exact[1], suit: exact[2] }, { rank: exact[3], suit: exact[4] }];
      if (cardCode(cards[0]) === cardCode(cards[1])) return { error: "Enter two different physical cards." };
      return { cards };
    }

    const shorthand = text.match(/^([2-9TJQKA])([2-9TJQKA])([SO])?$/);
    if (!shorthand) return { error: "Use KJs for suited, KJo for offsuit, TT for pairs, or AsKh for exact cards." };

    const [, first, second, suffix] = shorthand;
    const [high, low] = sortedRanks(first, second);
    if (high === low) {
      if (suffix) return { error: "Pocket pairs only need two ranks, like TT." };
      return { cards: representativeCards(high + low) };
    }
    if (!suffix) {
      if (defaultOffsuit) return { cards: representativeCards(high + low + "o") };
      return { incomplete: true, error: "Add s for suited, or submit bare ranks as offsuit." };
    }

    return { cards: representativeCards(high + low + (suffix === "S" ? "s" : "o")) };
  }

  function positionLayout(playerCount) {
    return POSITION_LAYOUTS[playerCount] || POSITION_LAYOUTS[9];
  }

  function preflopIndex(playerCount, position) {
    return positionLayout(playerCount).indexOf(position);
  }

  function scenarioAllowed({ playerCount = 9, scenario, position }) {
    const index = preflopIndex(playerCount, position);
    const last = positionLayout(playerCount).length - 1;
    if (index < 0) return false;
    if (scenario === "unopened") return position !== "BB";
    if (["limpers", "open", "openCallers"].includes(scenario)) return index > 0;
    if (scenario === "threeBet") return position !== "BB" && index < last;
    if (scenario === "fourBet") return index > 0;
    return true;
  }

  function scenarioName(scenario) {
    return ({ unopened: "Unopened pot", limpers: "Limped pot", open: "Facing open", openCallers: "Open plus callers", threeBet: "Facing 3-bet", fourBet: "Facing 4-bet" })[scenario] || scenario;
  }

  function actionBucket(action) {
    if (action === "FOLD") return "fold";
    if (action === "CALL" || action === "CHECK") return "call";
    if (action === "MIX") return "mix";
    return "raise";
  }

  function bucketName(bucket) {
    return ({ fold: "Fold", call: "Call / Check", raise: "Raise / 3-bet", mix: "Mix" })[bucket] || bucket;
  }

  function blindContributionBB(position, playerCount = 9, smallBlindBB = 0.5) {
    const sb = Number(smallBlindBB);
    const normalizedSmallBlind = Number.isFinite(sb) && sb > 0 ? sb : 0.5;
    const layout = positionLayout(Number(playerCount) || 9);
    if (!layout.includes(position)) return 0;
    if (position === "SB" || position === "BTN/SB") return normalizedSmallBlind;
    if (position === "BB") return 1;
    return 0;
  }

  function initialPotBB({ playerCount = 9, smallBlindBB = 0.5, anteBB = 0 } = {}) {
    const count = Number(playerCount) || 9;
    const ante = Number(anteBB);
    const cleanAnte = Number.isFinite(ante) && ante > 0 ? ante : 0;
    return blindContributionBB("SB", count, smallBlindBB)
      + blindContributionBB("BTN/SB", count, smallBlindBB)
      + blindContributionBB("BB", count, smallBlindBB)
      + count * cleanAnte;
  }

  function addedContributionBB(position, totalBetBB, options = {}) {
    const total = Number(totalBetBB);
    if (!Number.isFinite(total) || total <= 0) return 0;
    const posted = blindContributionBB(position, options.playerCount, options.smallBlindBB);
    return Math.max(0, total - posted);
  }

  function potWithTotalBets({ playerCount = 9, smallBlindBB = 0.5, anteBB = 0, bets = [] } = {}) {
    return initialPotBB({ playerCount, smallBlindBB, anteBB })
      + bets.reduce((sum, bet) => sum + addedContributionBB(bet.position, bet.totalBetBB, { playerCount, smallBlindBB }), 0);
  }

  function callCostBB(heroPosition, facingTotalBB, currentHeroTotalBB, options = {}) {
    const facing = Number(facingTotalBB);
    if (!Number.isFinite(facing) || facing <= 0) return 0;
    const current = currentHeroTotalBB == null
      ? blindContributionBB(heroPosition, options.playerCount, options.smallBlindBB)
      : Number(currentHeroTotalBB);
    return Math.max(0, facing - (Number.isFinite(current) ? current : 0));
  }

  function validateSpot({ playerCount = 9, position, scenario, cards }) {
    const layout = positionLayout(playerCount);
    if (!layout.includes(position)) return { valid: false, error: `${position} is not available at a ${playerCount}-handed table.` };
    if (!scenarioAllowed({ playerCount, position, scenario })) return { valid: false, error: `${position} cannot take ${scenarioName(scenario).toLowerCase()} in this setup.` };
    if (!cards?.every(Boolean)) return { valid: false, error: "Choose two cards first." };
    if (cardCode(cards[0]) === cardCode(cards[1])) return { valid: false, error: "The same physical card cannot be selected twice." };
    return { valid: true };
  }

  global.PreflopModel = {
    ranksAsc,
    ranksDesc,
    suits,
    POSITION_LAYOUTS,
    rankValue,
    cardCode,
    clamp,
    normalizedPosition,
    classifyCards,
    handLabel,
    matrixLabel,
    representativeCards,
    normalizeHandEntry,
    shouldDefaultOffsuit,
    parseHandEntry,
    positionLayout,
    preflopIndex,
    scenarioAllowed,
    scenarioName,
    actionBucket,
    bucketName,
    blindContributionBB,
    initialPotBB,
    addedContributionBB,
    potWithTotalBets,
    callCostBB,
    validateSpot
  };
})(window);
