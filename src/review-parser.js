((global) => {
  "use strict";

  function parseReviewLine(line, options = {}) {
    const model = global.PreflopModel;
    if (!model) throw new Error("PreflopModel must load before PreflopReview.");

    const playerCount = Number(options.playerCount || 9);
    const layout = model.positionLayout(playerCount);
    const normalized = String(line || "").replace(/10/gi, "T").toUpperCase();
    const positionMatch = normalized.match(/\b(BTN\/SB|UTG\+2|UTG\+1|UTG|MP|LJ|HJ|CO|BTN|SB|BB)\b/);
    const requestedPosition = positionMatch?.[1] || options.defaultPosition || "BTN";
    const position = layout.includes(requestedPosition) ? requestedPosition : layout.includes("BTN") ? "BTN" : layout[0];
    const tokens = normalized.match(/[A-Z0-9♠♥♦♣♡♢♧]+/g) || [];

    let cards = null;
    let label = "";
    for (const token of tokens) {
      const parsed = model.parseHandEntry(token, { defaultOffsuit: true });
      if (parsed.cards?.every(Boolean)) {
        cards = parsed.cards;
        label = model.handLabel(model.classifyCards(cards[0], cards[1]));
        break;
      }
    }
    if (!cards) return { error: "No hand found", line };

    let scenario = "unopened";
    if (/\b(UNOPENED|RFI|FIRST\s*IN)\b/.test(normalized)) scenario = "unopened";
    else if (/\b(LIMP|LIMPERS|LIMPED)\b/.test(normalized)) scenario = "limpers";
    else if (/\b(4B|4-BET|4BET|FOUR\s*BET)\b/.test(normalized)) scenario = "fourBet";
    else if (/\b(3B|3-BET|3BET|THREE\s*BET|VS\s*3)\b/.test(normalized)) scenario = "threeBet";
    else if (/\b(CALLERS|COLD\s*CALL|OPEN\s*\+\s*CALL|MULTIWAY)\b/.test(normalized)) scenario = "openCallers";
    else if (/\b(OPEN|RAISE|RAISED|VS)\b/.test(normalized)) scenario = "open";

    let userBucket = "";
    if (/\b(FOLD|FOLDED|MUCK)\b/.test(normalized)) userBucket = "fold";
    else if (/\b(CALL|CALLED|CHECK|CHECKED)\b/.test(normalized)) userBucket = "call";
    else if (/\b(MIX|MIXED)\b/.test(normalized)) userBucket = "mix";
    else if (/\b(RAISE|RAISED|OPENED|3B|3-BET|3BET|4B|4-BET|4BET|JAM|ALL\s*IN|SHOVE)\b/.test(normalized) || scenario === "unopened" && /\bOPEN\b/.test(normalized)) userBucket = "raise";
    if (!userBucket) return { error: "No recorded action found", line };

    if (!model.scenarioAllowed({ playerCount, scenario, position })) {
      return { error: `${position} cannot take ${model.scenarioName(scenario).toLowerCase()} in this setup`, line };
    }

    return { line, label, position, scenario, userBucket };
  }

  global.PreflopReview = { parseReviewLine };
})(window);
