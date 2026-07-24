((global) => {
  "use strict";

  const model = global.PreflopModel;
  if (!model) throw new Error("PreflopModel must load before HoldemEngine.");

  const ranksAsc = model.ranksAsc;
  const suits = model.suits;
  const HAND_NAMES = [
    "High card",
    "Pair",
    "Two pair",
    "Three of a kind",
    "Straight",
    "Flush",
    "Full house",
    "Four of a kind",
    "Straight flush"
  ];

  function deck() {
    const cards = [];
    suits.forEach((suit) => ranksAsc.split("").forEach((rank) => cards.push({ rank, suit: suit.code })));
    return cards;
  }

  function normalizeCardsText(value) {
    return String(value || "")
      .replace(/10/gi, "T")
      .replace(/[♠♤]/g, "S")
      .replace(/[♥♡]/g, "H")
      .replace(/[♦♢]/g, "D")
      .replace(/[♣♧]/g, "C")
      .toUpperCase();
  }

  function parseExactCards(value, options = {}) {
    const min = options.min ?? 0;
    const max = options.max ?? 7;
    const text = normalizeCardsText(value);
    const matches = [...text.matchAll(/([2-9TJQKA])\s*([SHDC])/g)];
    const cards = matches.map((match) => ({ rank: match[1], suit: match[2] }));
    const compact = text.replace(/[^2-9TJQKASHDC]/g, "");
    if (cards.length * 2 !== compact.length) return { error: "Use exact cards like As Kd 7h." };
    if (cards.length < min || cards.length > max) return { error: `Enter ${min === max ? min : `${min}-${max}`} exact card${max === 1 ? "" : "s"}.` };
    const seen = new Set();
    for (const card of cards) {
      const code = model.cardCode(card);
      if (seen.has(code)) return { error: `${code} appears more than once.` };
      seen.add(code);
    }
    return { cards };
  }

  function removeKnown(cards, knownCards) {
    const dead = new Set(knownCards.map(model.cardCode));
    return cards.filter((card) => !dead.has(model.cardCode(card)));
  }

  function encode(category, values) {
    const padded = [...values];
    while (padded.length < 5) padded.push(0);
    return padded.slice(0, 5).reduce((score, value) => score * 15 + value + 2, category);
  }

  function straightHigh(uniqueRanks) {
    const ranks = new Set(uniqueRanks);
    for (let high = 12; high >= 4; high -= 1) {
      if ([0, 1, 2, 3, 4].every((offset) => ranks.has(high - offset))) return high;
    }
    if ([12, 3, 2, 1, 0].every((rank) => ranks.has(rank))) return 3;
    return -1;
  }

  function evaluateFive(cards) {
    const ranks = cards.map((card) => model.rankValue(card.rank));
    const flush = cards.every((card) => card.suit === cards[0].suit);
    const uniqueRanks = [...new Set(ranks)].sort((a, b) => b - a);
    const straight = straightHigh(uniqueRanks);
    const counts = ranks.reduce((acc, rank) => {
      acc[rank] = (acc[rank] || 0) + 1;
      return acc;
    }, {});
    const groups = Object.entries(counts)
      .map(([rank, count]) => ({ rank: Number(rank), count }))
      .sort((a, b) => b.count - a.count || b.rank - a.rank);

    if (flush && straight >= 0) return { score: encode(8, [straight]), category: 8 };
    if (groups[0].count === 4) return { score: encode(7, [groups[0].rank, groups.find((g) => g.count === 1).rank]), category: 7 };
    if (groups[0].count === 3 && groups[1]?.count >= 2) return { score: encode(6, [groups[0].rank, groups[1].rank]), category: 6 };
    if (flush) return { score: encode(5, uniqueRanks), category: 5 };
    if (straight >= 0) return { score: encode(4, [straight]), category: 4 };
    if (groups[0].count === 3) return { score: encode(3, [groups[0].rank, ...groups.filter((g) => g.count === 1).map((g) => g.rank)]), category: 3 };
    if (groups[0].count === 2 && groups[1]?.count === 2) {
      const pairs = groups.filter((g) => g.count === 2).map((g) => g.rank).sort((a, b) => b - a);
      const kicker = groups.find((g) => g.count === 1).rank;
      return { score: encode(2, [...pairs.slice(0, 2), kicker]), category: 2 };
    }
    if (groups[0].count === 2) return { score: encode(1, [groups[0].rank, ...groups.filter((g) => g.count === 1).map((g) => g.rank)]), category: 1 };
    return { score: encode(0, uniqueRanks), category: 0 };
  }

  function fiveCardCombos(cards) {
    const combos = [];
    for (let a = 0; a < cards.length - 4; a += 1) {
      for (let b = a + 1; b < cards.length - 3; b += 1) {
        for (let c = b + 1; c < cards.length - 2; c += 1) {
          for (let d = c + 1; d < cards.length - 1; d += 1) {
            for (let e = d + 1; e < cards.length; e += 1) combos.push([cards[a], cards[b], cards[c], cards[d], cards[e]]);
          }
        }
      }
    }
    return combos;
  }

  function evaluate(cards) {
    if (cards.length < 5 || cards.length > 7) throw new Error("Evaluate 5, 6, or 7 cards.");
    let best = null;
    fiveCardCombos(cards).forEach((combo) => {
      const evaluated = evaluateFive(combo);
      if (!best || evaluated.score > best.score) best = evaluated;
    });
    return { ...best, name: HAND_NAMES[best.category] };
  }

  function handLabelFromCards(cards) {
    return model.handLabel(model.classifyCards(cards[0], cards[1]));
  }

  function labelInProfile(label, profile) {
    const pair = label.length === 2;
    const suited = label.endsWith("s");
    const ranks = label.replace(/[so]/, "");
    const high = model.rankValue(ranks[0]);
    const low = model.rankValue(ranks[1]);
    const gap = high - low;
    const broadway = low >= model.rankValue("T");
    const ace = ranks[0] === "A";
    if (profile === "any") return true;
    if (profile === "tight") return (pair && high >= model.rankValue("8")) || ["AKs","AQs","AJs","KQs","AKo","AQo"].includes(label);
    if (profile === "wide") return pair || ace || broadway || suited && (high >= model.rankValue("8") || gap <= 3) || ["K9o","Q9o","J9o","T9o","98o","87o"].includes(label);
    if (profile === "drawHeavy") return pair || suited || broadway || gap <= 2 || ace;
    return pair || ace && (suited || low >= model.rankValue("T")) || broadway || suited && gap <= 3 || ["KQo","KJo","QJo","JTo","T9o"].includes(label);
  }

  function rangeCombos(profile, knownCards) {
    const available = removeKnown(deck(), knownCards);
    const combos = [];
    for (let i = 0; i < available.length - 1; i += 1) {
      for (let j = i + 1; j < available.length; j += 1) {
        const cards = [available[i], available[j]];
        const label = handLabelFromCards(cards);
        if (labelInProfile(label, profile)) combos.push(cards);
      }
    }
    return combos.length ? combos : rangeCombos("any", knownCards);
  }

  function seededRandom(seed = 9973) {
    let value = seed >>> 0;
    return () => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }

  function sampleCards(cards, count, random) {
    const pool = [...cards];
    const out = [];
    for (let i = 0; i < count; i += 1) {
      const index = Math.floor(random() * pool.length);
      out.push(pool.splice(index, 1)[0]);
    }
    return out;
  }

  function runoutCombos(cards, count) {
    if (count === 0) return [[]];
    if (count === 1) return cards.map((card) => [card]);
    const combos = [];
    for (let i = 0; i < cards.length - 1; i += 1) {
      for (let j = i + 1; j < cards.length; j += 1) combos.push([cards[i], cards[j]]);
    }
    return combos;
  }

  function equityVsRange({ heroCards, boardCards, profile = "standard", iterations = 15000, seed = 1847 }) {
    const known = [...heroCards, ...boardCards];
    const villainRange = rangeCombos(profile, known);
    const missingBoard = 5 - boardCards.length;
    let wins = 0, ties = 0, losses = 0, trials = 0;

    const exact = missingBoard <= 1 || villainRange.length * 990 <= iterations;
    const compare = (villainCards, runout) => {
      const fullBoard = [...boardCards, ...runout];
      const hero = evaluate([...heroCards, ...fullBoard]);
      const villain = evaluate([...villainCards, ...fullBoard]);
      if (hero.score > villain.score) wins += 1;
      else if (hero.score === villain.score) ties += 1;
      else losses += 1;
      trials += 1;
    };

    if (exact) {
      villainRange.forEach((villainCards) => {
        const available = removeKnown(deck(), [...known, ...villainCards]);
        runoutCombos(available, missingBoard).forEach((runout) => compare(villainCards, runout));
      });
    } else {
      const random = seededRandom(seed);
      for (let i = 0; i < iterations; i += 1) {
        const villainCards = villainRange[Math.floor(random() * villainRange.length)];
        const available = removeKnown(deck(), [...known, ...villainCards]);
        compare(villainCards, sampleCards(available, missingBoard, random));
      }
    }

    return {
      equity: trials ? (wins + ties / 2) / trials * 100 : 0,
      wins,
      ties,
      losses,
      trials,
      exact,
      rangeCombos: villainRange.length
    };
  }

  function boardTexture(boardCards) {
    const ranks = [...new Set(boardCards.map((card) => model.rankValue(card.rank)))].sort((a, b) => b - a);
    const suitCounts = boardCards.reduce((acc, card) => {
      acc[card.suit] = (acc[card.suit] || 0) + 1;
      return acc;
    }, {});
    const paired = ranks.length < boardCards.length;
    const maxSuit = Math.max(...Object.values(suitCounts));
    const monotone = boardCards.length >= 3 && maxSuit >= 3;
    const twoTone = maxSuit === 2;
    const span = ranks.length > 1 ? Math.max(...ranks) - Math.min(...ranks) : 0;
    const connected = ranks.length >= 3 && span <= 4;
    const highCard = ranks[0] >= model.rankValue("Q");
    return {
      paired,
      monotone,
      twoTone,
      connected,
      highCard,
      label: [
        paired ? "paired" : "",
        monotone ? "monotone" : twoTone ? "two-tone" : "rainbow",
        connected ? "connected" : "spread"
      ].filter(Boolean).join(" ")
    };
  }

  function straightOutRanks(cards) {
    const used = new Set(cards.map((card) => model.rankValue(card.rank)));
    const outs = [];
    for (let rank = 0; rank < ranksAsc.length; rank += 1) {
      if (used.has(rank)) continue;
      if (straightHigh([...used, rank]) >= 0) outs.push(rank);
    }
    return outs;
  }

  function drawProfile(heroCards, boardCards) {
    const cards = [...heroCards, ...boardCards];
    const suitCounts = cards.reduce((acc, card) => {
      acc[card.suit] = (acc[card.suit] || 0) + 1;
      return acc;
    }, {});
    const maxSuit = Math.max(...Object.values(suitCounts));
    const straightOuts = boardCards.length < 5 ? straightOutRanks(cards).length : 0;
    const boardHigh = Math.max(...boardCards.map((card) => model.rankValue(card.rank)));
    const overcards = heroCards.filter((card) => model.rankValue(card.rank) > boardHigh).length;
    return {
      flushDraw: boardCards.length < 5 && maxSuit === 4,
      backdoorFlush: boardCards.length === 3 && maxSuit === 3,
      straightDraw: straightOuts >= 2,
      gutshot: straightOuts === 1,
      overcards
    };
  }

  function analyzePostflop(input) {
    const { heroCards, boardCards, profile, potBB, facingBetBB, position, initiative, betSizeBB, iterations } = input;
    if (!heroCards?.every(Boolean) || heroCards.length !== 2) return { error: "Enter your exact two-card hand." };
    if (!boardCards || boardCards.length < 3 || boardCards.length > 5) return { error: "Enter a flop, turn, or river board." };
    const seen = new Set();
    for (const card of [...heroCards, ...boardCards]) {
      const code = model.cardCode(card);
      if (seen.has(code)) return { error: `${code} appears more than once.` };
      seen.add(code);
    }

    const equity = equityVsRange({ heroCards, boardCards, profile, iterations });
    const hand = evaluate([...heroCards, ...boardCards]);
    const texture = boardTexture(boardCards);
    const draws = drawProfile(heroCards, boardCards);
    const street = boardCards.length === 3 ? "Flop" : boardCards.length === 4 ? "Turn" : "River";
    const bet = Number(facingBetBB || 0);
    const pot = Math.max(0.1, Number(potBB || 1));
    const plannedBet = Math.max(0.1, Number(betSizeBB || Math.round(pot * 0.66 * 10) / 10));
    const potOdds = bet > 0 ? bet / (pot + bet) * 100 : 0;
    const mdf = bet > 0 ? pot / (pot + bet) * 100 : 0;
    const riskReward = plannedBet / (pot + plannedBet) * 100;
    const strongMade = hand.category >= 4 || hand.category === 3 || hand.category === 2;
    const mediumMade = hand.category === 1;
    const strongDraw = draws.flushDraw || draws.straightDraw;
    const hasEquityBackup = strongDraw || draws.overcards >= 2 || draws.gutshot;
    const oop = position === "oop";

    let action = "Check";
    let tone = "call";
    let headline = "Keep the pot controlled";
    let summary = "Your hand is not far enough ahead to build a large pot by default.";
    const reasons = [];
    const cautions = [];

    if (bet > 0) {
      const edge = equity.equity - potOdds;
      if (edge < -7 && !strongDraw && !strongMade) {
        action = "Fold";
        tone = "fold";
        headline = "Fold unless you have a very strong read";
        summary = "Your equity is below the price, and there is not enough draw value to make up the gap.";
      } else if (edge > 20 && (strongMade || equity.equity >= 68)) {
        action = "Raise";
        tone = "raise";
        headline = "Raise for value and protection";
        summary = "You are well ahead of the price and can deny equity to weaker hands and draws.";
      } else {
        action = "Call";
        tone = "call";
        headline = edge >= 0 ? "Call at this price" : "Close call with backup equity";
        summary = edge >= 0 ? "Your equity meets the immediate price." : "The direct price is thin, but draw value keeps the call reasonable.";
      }
      reasons.push(`Equity is ${equity.equity.toFixed(1)}%; the call needs about ${potOdds.toFixed(1)}%.`);
      reasons.push(`Minimum defense guide for this bet is ${mdf.toFixed(1)}%, so avoid folding too much of your continuing range.`);
    } else {
      if (equity.equity >= 62 || strongMade) {
        action = "Bet";
        tone = "raise";
        headline = "Bet for value";
        summary = "You have enough equity to charge worse hands and draws.";
      } else if ((initiative === "yes" || position === "ip") && hasEquityBackup && profile !== "wide") {
        action = "Bet";
        tone = "mix";
        headline = "Semi-bluff selectively";
        summary = "Your draw equity gives the bet a backup plan when called.";
      } else {
        action = "Check";
        tone = "call";
        headline = oop ? "Check and realize equity" : "Check back often";
        summary = "Your hand prefers seeing another card or showdown without inflating the pot.";
      }
      reasons.push(`Equity versus the selected range is ${equity.equity.toFixed(1)}%.`);
      reasons.push(`A ${plannedBet.toFixed(1)} BB bet risks ${riskReward.toFixed(1)}% of the final pot, so it needs fold equity or value.`);
    }

    reasons.push(`${street} texture is ${texture.label}; ${texture.connected || texture.monotone ? "ranges can connect hard here." : "one-pair hands are easier to read here."}`);
    if (strongDraw) reasons.push("You have a real draw, so betting or calling can win now and still improve later.");
    if (hand.category >= 2) reasons.push(`Current made hand: ${hand.name}.`);

    cautions.push(mediumMade && texture.connected ? "Do not stack off with one pair just because it is currently ahead." : "Do not treat equity as permission to ignore future betting.");
    cautions.push(profile === "tight" ? "Against a tight range, bluffs and thin value need extra discipline." : "Against a wide range, value bet more and bluff less.");
    if (oop) cautions.push("Out of position, choose simpler lines because you act first later.");

    return {
      action,
      tone,
      headline,
      summary,
      street,
      handName: hand.name,
      handScore: hand.score,
      texture,
      draws,
      equity,
      potOdds,
      mdf,
      riskReward,
      plannedBet,
      reasons,
      cautions
    };
  }

  global.HoldemEngine = {
    parseExactCards,
    deck,
    evaluate,
    equityVsRange,
    boardTexture,
    drawProfile,
    analyzePostflop
  };
})(window);
