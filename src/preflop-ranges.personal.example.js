// Copy this file to a private local override file and load it after
// src/preflop-ranges.js but before src/app.js if you want to replace any
// bundled baseline with ranges you personally export or maintain.
//
// Arrays replace the matching bundled range. Omit keys you do not want to change.
window.PreflopRangeOverrides = {
  version: "personal-local",
  sources: [
    {
      name: "Your range source",
      url: "https://example.com/",
      usage: "Personal/local override. Confirm your source permissions before publishing."
    }
  ],
  ranges: {
    opening: {
      // Example only:
      // BTN: ["22","33","44","A2s","KQo"]
    },
    threeBet: {
      // Example only:
      // light: ["A5s","A4s"]
    },
    isolateVsLimp: {
      // Example only:
      // one: { late: ["77","ATs","AJo","KQs"] }
    },
    overlimp: {
      // Example only:
      // multiple: { late: ["22","33","A5s","76s","65s"] }
    },
    threeBetVsOpen: {
      // Example only:
      // vsBTN: { blinds: { value: ["99","TT","JJ","QQ","KK","AA","AKs"], bluff: ["A5s","A4s"] } }
    },
    callVsOpen: {
      positionAware: {
        // Example only:
        // btnVsCO: ["55","66","AJs","KQs","QJs"]
      }
    }
  }
};
