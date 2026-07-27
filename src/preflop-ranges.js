((global) => {
  "use strict";

  const ranksAsc = "23456789TJQKA";
  const rankValue = (rank) => ranksAsc.indexOf(rank);
  const pairsFrom = (minimum) => {
    const start = rankValue(minimum);
    return Array.from({ length: ranksAsc.length - start }, (_, index) => {
      const rank = ranksAsc[start + index];
      return rank + rank;
    });
  };
  const combosFrom = (high, minimumLow, suffix) => {
    const out = [], hi = rankValue(high), lo = rankValue(minimumLow);
    for (let index = lo; index < hi; index += 1) out.push(high + ranksAsc[index] + suffix);
    return out;
  };
  const setOf = (...items) => new Set(items.flat(Infinity));
  const labels = (...items) => [...setOf(...items)];

  const opening = {
    "UTG": labels(pairsFrom("5"), ["A2s","A3s","A4s","A5s"], combosFrom("A","9","s"), combosFrom("K","T","s"), combosFrom("Q","T","s"), ["JTs","T9s"], combosFrom("A","J","o"), ["KQo"]),
    "UTG+1": labels(pairsFrom("4"), ["A2s","A3s","A4s","A5s"], combosFrom("A","8","s"), combosFrom("K","T","s"), combosFrom("Q","T","s"), ["JTs","T9s"], combosFrom("A","J","o"), ["KQo"]),
    "UTG+2": labels(pairsFrom("4"), ["A2s","A3s","A4s","A5s"], combosFrom("A","8","s"), combosFrom("K","T","s"), combosFrom("Q","T","s"), ["JTs","T9s","98s"], combosFrom("A","J","o"), ["KQo"]),
    "MP": labels(pairsFrom("4"), ["A2s","A3s","A4s","A5s"], combosFrom("A","8","s"), combosFrom("K","9","s"), combosFrom("Q","T","s"), ["JTs","T9s","98s"], combosFrom("A","T","o"), combosFrom("K","J","o"), ["QJo"]),
    "LJ": labels(pairsFrom("3"), ["A2s","A3s","A4s","A5s"], combosFrom("A","7","s"), combosFrom("K","9","s"), combosFrom("Q","9","s"), combosFrom("J","9","s"), ["T9s","98s","87s","76s"], combosFrom("A","9","o"), combosFrom("K","T","o"), ["QJo","JTo"]),
    "HJ": labels(pairsFrom("2"), combosFrom("A","2","s"), combosFrom("K","8","s"), combosFrom("Q","9","s"), combosFrom("J","9","s"), combosFrom("T","8","s"), combosFrom("9","7","s"), combosFrom("8","6","s"), combosFrom("7","5","s"), ["65s","54s"], combosFrom("A","8","o"), combosFrom("K","T","o"), combosFrom("Q","T","o"), ["JTo"]),
    "CO": labels(pairsFrom("2"), combosFrom("A","2","s"), combosFrom("K","5","s"), combosFrom("Q","7","s"), combosFrom("J","7","s"), combosFrom("T","7","s"), combosFrom("9","6","s"), combosFrom("8","5","s"), combosFrom("7","4","s"), ["64s","65s","54s"], combosFrom("A","5","o"), combosFrom("K","9","o"), combosFrom("Q","9","o"), combosFrom("J","9","o"), ["T9o"]),
    "BTN": labels(pairsFrom("2"), combosFrom("A","2","s"), combosFrom("K","2","s"), combosFrom("Q","2","s"), combosFrom("J","4","s"), combosFrom("T","5","s"), combosFrom("9","5","s"), combosFrom("8","5","s"), combosFrom("7","4","s"), ["64s","65s","53s","54s","43s"], combosFrom("A","2","o"), combosFrom("K","7","o"), combosFrom("Q","8","o"), combosFrom("J","8","o"), combosFrom("T","8","o"), ["98o"]),
    "SB": labels(pairsFrom("2"), combosFrom("A","2","s"), combosFrom("K","4","s"), combosFrom("Q","6","s"), combosFrom("J","7","s"), combosFrom("T","7","s"), combosFrom("9","6","s"), combosFrom("8","5","s"), combosFrom("7","4","s"), ["64s","65s","54s"], combosFrom("A","5","o"), combosFrom("K","9","o"), combosFrom("Q","9","o"), combosFrom("J","9","o"), ["T9o"]),
    "BB": []
  };

  const fringe = {
    "UTG": labels(["44","A8s","K9s","Q9s","J9s","98s","ATo","KJo","QJo"]),
    "UTG+1": labels(["33","A7s","K9s","Q9s","J9s","98s","ATo","KJo","QJo"]),
    "UTG+2": labels(["33","A7s","K9s","Q9s","J9s","87s","ATo","KJo","QJo","JTo"]),
    "MP": labels(["33","A7s","K8s","Q9s","J9s","87s","A9o","KTo","QTo","JTo"]),
    "LJ": labels(["22","A6s","K8s","Q8s","J8s","T8s","65s","A8o","K9o","QTo"]),
    "HJ": labels(["K7s","Q8s","J8s","T7s","96s","85s","74s","A7o","K9o","Q9o","J9o"]),
    "CO": labels(["K4s","Q6s","J6s","T6s","95s","84s","73s","A4o","K8o","Q8o","J8o","T8o","98o"]),
    "BTN": labels(["J2s","J3s","T2s","T3s","T4s","94s","84s","73s","63s","52s","K6o","Q7o","J7o","T7o","97o","87o"]),
    "SB": labels(["K2s","K3s","Q4s","Q5s","J5s","J6s","T6s","95s","84s","73s","A4o","K8o","Q8o","J8o","T8o","98o"]),
    "BB": []
  };

  const headsUpOpen = labels(
    pairsFrom("2"), combosFrom("A","2","s"), combosFrom("A","2","o"),
    combosFrom("K","2","s"), combosFrom("K","4","o"), combosFrom("Q","2","s"), combosFrom("Q","6","o"),
    combosFrom("J","2","s"), combosFrom("J","7","o"), combosFrom("T","2","s"), combosFrom("T","7","o"),
    combosFrom("9","2","s"), combosFrom("9","6","o"), combosFrom("8","3","s"), combosFrom("8","6","o"),
    combosFrom("7","3","s"), combosFrom("6","3","s"), ["54s","53s","43s"]
  );
  const headsUpFringe = labels(["K3o","Q5o","J6o","T6o","95o","85o","75o","64o","74o","63o","52s","42s","32s"]);
  const callNormal = labels(["JJ","TT","99","88","77","AQs","AJs","ATs","KQs","KJs","QJs","JTs","T9s","AQo"]);
  const callVsThreeBetNormal = labels(["QQ","JJ","TT","99","AKs","AKo","AQs","AJs","KQs","AQo"]);
  const lightThreeBet = labels(["A2s","A3s","A4s","A5s","KTs","KJs","QTs","QJs","JTs"]);

  // Limped pots reward domination and multiway playability, not the weakest
  // hands from a late-position unopened range.
  const isolateVsLimp = {
    one: {
      early: labels(pairsFrom("8"), combosFrom("A","T","s"), ["KQs"], combosFrom("A","J","o"), ["KQo"]),
      middle: labels(pairsFrom("7"), combosFrom("A","8","s"), combosFrom("K","T","s"), combosFrom("Q","T","s"), ["JTs","T9s"], combosFrom("A","J","o"), ["KQo"]),
      late: labels(pairsFrom("6"), combosFrom("A","5","s"), combosFrom("K","9","s"), combosFrom("Q","T","s"), ["JTs","T9s","98s"], combosFrom("A","T","o"), combosFrom("K","J","o"), ["QJo"]),
      smallBlind: labels(pairsFrom("7"), combosFrom("A","7","s"), combosFrom("K","T","s"), combosFrom("Q","T","s"), ["JTs"], combosFrom("A","T","o"), ["KQo"]),
      bigBlind: labels(pairsFrom("8"), combosFrom("A","8","s"), combosFrom("K","T","s"), ["QJs","JTs"], combosFrom("A","J","o"), ["KQo"])
    },
    multiple: {
      early: labels(pairsFrom("T"), combosFrom("A","J","s"), ["KQs"], combosFrom("A","Q","o")),
      middle: labels(pairsFrom("8"), combosFrom("A","T","s"), combosFrom("K","J","s"), ["QJs"], combosFrom("A","J","o"), ["KQo"]),
      late: labels(pairsFrom("7"), combosFrom("A","9","s"), combosFrom("K","T","s"), combosFrom("Q","T","s"), ["JTs"], combosFrom("A","J","o"), ["KQo"]),
      smallBlind: labels(pairsFrom("8"), combosFrom("A","T","s"), combosFrom("K","J","s"), ["QJs"], combosFrom("A","Q","o"), ["KQo"]),
      bigBlind: labels(pairsFrom("9"), combosFrom("A","T","s"), ["KQs","QJs"], combosFrom("A","Q","o"), ["KQo"])
    }
  };

  const overlimp = {
    one: {
      early: labels(["22","33","44","55","66"], ["A2s","A3s","A4s","A5s"], ["KTs","QTs","JTs","T9s","98s","87s"]),
      middle: labels(["22","33","44","55","66","77"], combosFrom("A","2","s"), ["K9s","KTs","KJs","Q9s","QTs","J9s","JTs","T9s","98s","87s","76s","65s"]),
      late: labels(["22","33","44","55","66","77","88"], combosFrom("A","2","s"), combosFrom("K","9","s"), combosFrom("Q","9","s"), combosFrom("J","9","s"), ["T9s","98s","87s","76s","65s","54s","T8s","97s","86s","75s","64s"]),
      smallBlind: labels(["22","33","44","55","66","77"], combosFrom("A","2","s"), ["KTs","KJs","QTs","QJs","JTs","T9s","98s","87s","76s","65s","54s"])
    },
    multiple: {
      early: labels(["22","33","44","55","66","77"], ["A2s","A3s","A4s","A5s","KTs","QTs","JTs","T9s","98s","87s","76s"]),
      middle: labels(["22","33","44","55","66","77","88"], combosFrom("A","2","s"), combosFrom("K","9","s"), combosFrom("Q","9","s"), ["J9s","JTs","T9s","98s","87s","76s","65s","54s","T8s","97s","86s"]),
      late: labels(["22","33","44","55","66","77","88"], combosFrom("A","2","s"), combosFrom("K","9","s"), combosFrom("Q","9","s"), combosFrom("J","9","s"), ["T9s","98s","87s","76s","65s","54s","T8s","97s","86s","75s","64s","53s"]),
      smallBlind: labels(["22","33","44","55","66","77","88"], combosFrom("A","2","s"), ["K9s","KTs","KJs","Q9s","QTs","QJs","J9s","JTs","T9s","98s","87s","76s","65s","54s"])
    }
  };

  // Each opener tier contains separate in-position and blind branches so a
  // late-position steal is not treated like an early-position raise.
  const threeBetVsOpen = {
    vsEarly: {
      inPosition: { value: labels(pairsFrom("Q"), ["AKs","AKo"]), bluff: labels(["A5s","A4s"]) },
      blinds: { value: labels(pairsFrom("Q"), ["AKs","AKo"]), bluff: labels(["A5s"]) }
    },
    vsMiddle: {
      inPosition: { value: labels(pairsFrom("J"), ["AQs","AKs","AKo"]), bluff: labels(["A5s","A4s","KTs"]) },
      blinds: { value: labels(pairsFrom("T"), ["AQs","AKs","AQo","AKo","KQs"]), bluff: labels(["A5s","A4s","KTs","QTs"]) }
    },
    vsCO: {
      inPosition: { value: labels(pairsFrom("T"), ["AJs","AQs","AKs","AQo","AKo","KQs"]), bluff: labels(["A2s","A3s","A4s","A5s","KTs","QTs"]) },
      blinds: { value: labels(pairsFrom("9"), ["ATs","AJs","AQs","AKs","AJo","AQo","AKo","KQs","KQo"]), bluff: labels(["A2s","A3s","A4s","A5s","KTs","QTs","JTs"]) }
    },
    vsBTN: {
      blinds: { value: labels(pairsFrom("8"), ["A9s","ATs","AJs","AQs","AKs","AJo","AQo","AKo","KQs","KQo"]), bluff: labels(["A2s","A3s","A4s","A5s","K9s","Q9s","JTs","T9s"]) }
    },
    vsSB: {
      bigBlind: { value: labels(pairsFrom("7"), combosFrom("A","8","s"), combosFrom("K","T","s"), ["QJs"], combosFrom("A","T","o"), ["KQo"]), bluff: labels(["A2s","A3s","A4s","A5s","K9s","Q9s","J9s","T9s","98s"]) }
    }
  };

  const positionAwareCalls = {
    btnVsCO: labels(["22","33","44","55","66","77","88","99","A8s","A9s","ATs","AJs","AQs","K9s","KTs","KJs","KQs","Q9s","QTs","QJs","J9s","JTs","T9s","98s","87s","AJo","AQo","KQo"]),
    coVsHJ: labels(["44","55","66","77","88","99","TT","A9s","ATs","AJs","AQs","KTs","KJs","KQs","QTs","QJs","JTs","T9s","98s","AQo"]),
    hjVsLJ: labels(["66","77","88","99","TT","JJ","ATs","AJs","AQs","KJs","KQs","QJs","JTs","AQo"]),
    sbVsCO: labels(["55","66","77","88","99","TT","A9s","ATs","AJs","AQs","KTs","KJs","KQs","QTs","QJs","JTs"]),
    sbVsBTN: labels(["44","55","66","77","88","99","TT","A8s","A9s","ATs","AJs","AQs","K9s","KTs","KJs","KQs","Q9s","QTs","QJs","J9s","JTs","T9s","98s","87s"]),
    multiwayExtra: labels(["22","33","44","55","66","77","A2s","A3s","A4s","A5s","KTs","QTs","JTs","T9s","98s","87s","76s","65s"])
  };

  global.PreflopRanges = {
    version: "2026-07-27",
    format: "preflop-studio/reference-v1",
    notation: "Two-card hand labels use standard condensed poker range notation: pairs like QQ, suited like A5s, offsuit like KQo.",
    sources: [
      {
        name: "Upswing Poker Preflop Charts",
        url: "https://upswingpoker.com/charts/",
        usage: "Public RFI sizing and frequency benchmarks for live and online cash-game charts; this file does not copy gated hand grids."
      },
      {
        name: "GTO Wizard Ranges Tab documentation",
        url: "https://help.gtowizard.com/ranges-tab/",
        usage: "Documents PioSOLVER / GTO+ range-text interoperability as a common export format."
      },
      {
        name: "GTO Wizard NL50 preflop ranges announcement",
        url: "https://blog.gtowizard.com/another-update-many-improvements/",
        usage: "Reference for free browsable presolved NL50 preflop ranges; this local baseline remains a simplified heuristic."
      }
    ],
    ranges: {
      opening,
      fringe,
      isolateVsLimp,
      overlimp,
      headsUp: {
        open: headsUpOpen,
        fringe: headsUpFringe,
        openExtra: labels(headsUpFringe, ["K2o","Q4o","J5o","T5o","94o","84o","73o","62s","92s","82s","72s"])
      },
      threeBet: {
        tight: labels(pairsFrom("Q"), ["AKs","AKo"]),
        normal: labels(pairsFrom("J"), ["AQs","AKs","AKo"]),
        wide: labels(pairsFrom("T"), ["AJs","AQs","AKs","AQo","AKo","KQs"]),
        veryWide: labels(pairsFrom("9"), ["ATs","AJs","AQs","AKs","AJo","AQo","AKo","KQs","KQo"]),
        light: lightThreeBet,
        smallBlindSteal: labels(lightThreeBet, ["AJo","KQo","K9s","Q9s","T9s"])
      },
      threeBetVsOpen,
      callVsOpen: {
        tight: labels(["JJ","TT","99","AQs","AJs","KQs"]),
        normal: callNormal,
        wide: labels(callNormal, ["66","55","A9s","KTs","QTs","98s","87s","AJo","KQo"]),
        ipVsSteal: labels(["44","33","22","A8s","A7s","A6s","K9s","Q9s","J9s","T8s","76s","65s"]),
        sbVsSteal: labels(["44","33","22","A8s","A7s","A6s","K9s","Q9s","J9s","T8s","98s","87s","76s","65s"]),
        bbVsEarly: labels(["66","55","44","33","22","A5s","A4s","A3s","A2s","KTs","QTs","98s","87s"]),
        bbVsMiddle: labels(["66","55","44","33","22","A9s","A5s","A4s","A3s","A2s","KTs","QTs","98s","87s","76s","65s","AJo","KQo","KTo","QTo","JTo"]),
        bbVsCO: labels(["44","33","22","A8s","A7s","A6s","A5s","A4s","A3s","A2s","K9s","K8s","K7s","Q9s","Q8s","J9s","J8s","T8s","97s","86s","76s","65s","54s","A9o","A8o","KTo","K9o","QTo","Q9o","JTo","J9o","T9o"]),
        bbVsBTN: labels(["44","33","22","A8s","A7s","A6s","A5s","A4s","A3s","A2s","K9s","K8s","K7s","K6s","K5s","K4s","K3s","K2s","Q9s","Q8s","Q7s","Q6s","Q5s","Q4s","J9s","J8s","J7s","J6s","T8s","T7s","T6s","98s","97s","96s","87s","86s","85s","76s","75s","65s","64s","54s","53s","43s","A9o","A8o","A7o","A6o","A5o","A4o","A3o","A2o","KTo","K9o","K8o","QTo","Q9o","JTo","J9o","T9o","98o"]),
        bbVsSB: [],
        positionAware: positionAwareCalls
      },
      callVsThreeBet: {
        tight: labels(["QQ","JJ","AKs","AKo","AQs"]),
        normal: callVsThreeBetNormal,
        wide: labels(callVsThreeBetNormal, ["88","77","A5s","A4s","A3s","A2s","ATs","KJs","KTs","QJs","QTs","JTs","T9s","98s","AJo","KQo"]),
        ipExtra: labels(["66","55","44","33","22","A9s","A8s","A7s","A6s","K9s","K8s","Q9s","Q8s","J9s","J8s","T8s","T7s","98s","87s","76s","65s","54s","KJo","QJo","JTo"]),
        positionAware: {
          inPosition: labels(["77","88","99","TT","JJ","QQ","A9s","ATs","AJs","AQs","AKs","KTs","KJs","KQs","QJs","JTs","T9s","98s","AQo","AKo","KQo"]),
          outOfPosition: labels(["99","TT","JJ","QQ","AJs","AQs","AKs","KQs","AQo","AKo"]),
          ipVsBlindResteal: labels(["22","33","44","55","66","77","88","99","TT","JJ","QQ","A8s","A9s","ATs","AJs","AQs","AKs","KTs","KJs","KQs","QTs","QJs","JTs","T9s","98s","87s","AJo","AQo","AKo","KQo"])
        }
      },
      goodPriceDefend: {
        bb: labels(["Q3s","Q2s","J5s","J4s","T5s","T4s","95s","86s","75s","64s","42s","32s","K7o","Q8o","J8o","T8o","97o","87o","76o"])
      },
      fourBet: {
        light: labels(["A5s","A4s","A3s","A2s"])
      }
    },
    drills: {
      premiumHands: ["AA","KK","QQ","JJ","TT","AKs","AKo","AQs","AQo","KQs"],
      blindDefenseHands: ["A9o","A8s","A5s","KTo","K9s","QTo","Q9s","JTo","J9s","T8s","98s","87s","76s","65s","44","33","22"],
      dominatedHands: ["AJo","ATo","A9o","KQo","KJo","KTo","QJo","QTo","JTo"]
    }
  };

  global.PreflopRanges.ranges.callVsOpen.bbVsSB = labels(global.PreflopRanges.ranges.callVsOpen.bbVsBTN, ["Q8o","J8o","T8o","97o","87o","76o","K7o"]);
})(window);
