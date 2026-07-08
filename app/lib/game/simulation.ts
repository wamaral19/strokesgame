import { CATEGORY_ORDER } from "./categories";
import { FEDEX_PLAYOFF_SCHEDULE, PREMIUM_2026_SCHEDULE } from "./schedule";
import { createRandom, randomBetween, randomNormal } from "./random";
import type {
  CategoryBreakdown,
  CategoryKey,
  EventResult,
  PlayoffStageResult,
  RegularSeasonSummary,
  ScheduleEvent,
  SeasonSimulation,
  StageWriteup,
} from "./types";

const PAYOUT_CURVE = [
  0.18, 0.109, 0.069, 0.049, 0.041, 0.036, 0.0335, 0.031, 0.029, 0.027,
  0.025, 0.023, 0.021, 0.019, 0.0175, 0.016, 0.015, 0.014, 0.013, 0.012,
  0.011, 0.0105, 0.01, 0.0095, 0.009,
];

const POINT_TABLES: Record<ScheduleEvent["kind"], Array<[number, number]>> = {
  regular: [
    [1, 500],
    [2, 300],
    [3, 190],
    [4, 135],
    [5, 110],
    [6, 100],
    [7, 90],
    [8, 85],
    [9, 80],
    [10, 75],
    [15, 55],
    [20, 45],
    [25, 35.5],
    [30, 28],
    [40, 16],
    [50, 8.5],
    [60, 5],
  ],
  signature: [
    [1, 700],
    [2, 400],
    [3, 350],
    [4, 325],
    [5, 300],
    [6, 275],
    [7, 250],
    [8, 225],
    [9, 175],
    [10, 150],
    [15, 90],
    [20, 55],
    [25, 42],
    [30, 32.5],
    [40, 20.25],
    [50, 13],
    [60, 8.25],
  ],
  major: [
    [1, 750],
    [2, 500],
    [3, 350],
    [4, 325],
    [5, 300],
    [6, 275],
    [7, 250],
    [8, 225],
    [9, 200],
    [10, 175],
    [15, 95],
    [20, 60],
    [25, 47],
    [30, 37],
    [40, 22],
    [50, 14.25],
    [60, 9],
  ],
  players: [
    [1, 750],
    [2, 500],
    [3, 350],
    [4, 325],
    [5, 300],
    [6, 275],
    [7, 250],
    [8, 225],
    [9, 200],
    [10, 175],
    [15, 95],
    [20, 60],
    [25, 47],
    [30, 37],
    [40, 22],
    [50, 14.25],
    [60, 9],
  ],
  // The first two Playoffs events (St. Jude, BMW) award 750 to the winner,
  // matching THE PLAYERS and the majors. The Tour Championship finale awards no
  // points at all (even-par start, best 72-hole score wins the Cup) — the runner
  // zeroes the finale's contribution, so this table only ever applies to the
  // first two stages.
  playoff: [
    [1, 750],
    [2, 500],
    [3, 350],
    [4, 325],
    [5, 300],
    [6, 275],
    [7, 250],
    [8, 225],
    [9, 200],
    [10, 175],
    [15, 95],
    [20, 60],
    [25, 47],
    [30, 37],
    [40, 22],
    [50, 14.25],
    [60, 9],
  ],
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundCurrency(value: number) {
  return Math.round(value / 1000) * 1000;
}

function positionToPayout(position: number, purse: number) {
  if (position <= PAYOUT_CURVE.length) {
    return roundCurrency(purse * PAYOUT_CURVE[position - 1]);
  }

  // Players who make a premium-event cut but finish outside the top 25 still
  // earn useful money; no-cut Signature Events keep a small tail as well.
  const tail = clamp(0.0085 - (position - 26) * 0.00008, 0.0012, 0.0085);
  return roundCurrency(purse * tail);
}

function positionToPoints(position: number, event: ScheduleEvent) {
  const table = POINT_TABLES[event.kind];
  if (position > table[table.length - 1][0]) return 0;

  if (position <= table[0][0]) return table[0][1];

  for (let index = 0; index < table.length - 1; index += 1) {
    const [startPosition, startPoints] = table[index];
    const [endPosition, endPoints] = table[index + 1];
    if (position >= startPosition && position <= endPosition) {
      const pct = (position - startPosition) / (endPosition - startPosition);
      return Math.round(startPoints + pct * (endPoints - startPoints));
    }
  }

  return 0;
}

// Signature Events (limited fields) and the FedEx playoffs (70/50/30 fields)
// play without a cut; regular events, majors, and The Players cut after 36 holes.
function eventHasCut(kind: ScheduleEvent["kind"]) {
  return kind !== "signature" && kind !== "playoff";
}

// ---------------------------------------------------------------------------
// Field model (per-round Strokes Gained units, matching real broadcast SG).
//
// Everything below is calibrated to real DataGolf-style leaderboards: in a
// strong field the winner gains ~+2.8 to +3.2 SG/round, ~T5 ≈ +2.5, ~T10 ≈
// +2.0, ~T30 ≈ +0.5, the median finisher ≈ 0, and last place ≈ -5. A player's
// finishing position is modelled as how many of the field beat them that week,
// treating field outcomes as normal around a strength-scaled mean. Winning
// therefore requires a genuinely elite week (the tail) — hard, but reachable on
// a spike, so lower-SG builds still steal the occasional title.
// ---------------------------------------------------------------------------

// SD of one player's week-to-week SG around their season mean (per round). The
// per-season volatilityFactor scales this, so streaky builds swing far more.
const WEEK_SG_SD = 0.9;
const COURSE_FIT_SD = 0.25;
// Per-category week-to-week SD, used when a playoff event is broken out
// category-by-category. The flatstick, irons, and driver swing hard week to
// week; the short game (around the green) is the steadiest part of a bag. In
// quadrature these sum to ~0.9, matching the aggregate WEEK_SG_SD above so the
// broken-out playoff variance feels the same as the regular season.
const CATEGORY_WEEK_SD: Record<CategoryKey, number> = {
  offTee: 0.5,
  approach: 0.55,
  aroundGreen: 0.2,
  putting: 0.62,
};
// SD of the field's weekly SG outcomes; sets how spread out a leaderboard is
// and how random the top of it plays.
const FIELD_SPREAD = 1.75;
// The field's mean SG scales with field strength. SG is measured against the
// tour baseline, so a weak full-field event centres just above 0, while
// signature events and majors are stacked with elite players and sit ~+1.1 to
// +1.5 — which is why even a +2.7 season only finishes ~T13 on average there,
// and winning one takes a genuinely huge (~+5 SG) week.
const FIELD_MEAN_SLOPE = 2.27;
const FIELD_MEAN_ANCHOR = 0.316;

function fieldSize(event: ScheduleEvent) {
  if (event.fieldSize) return event.fieldSize;
  if (event.kind === "signature") return 72;
  return 78;
}

function fieldMean(event: ScheduleEvent) {
  return (event.fieldStrength - FIELD_MEAN_ANCHOR) * FIELD_MEAN_SLOPE;
}

// Zelen & Severo approximation of the standard normal CDF.
function normCdf(z: number) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2);
  const p =
    1 -
    d *
      t *
      (0.319381530 +
        t *
          (-0.356563782 +
            t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? p : 1 - p;
}

// Probability that a single field member outscores the player this week.
function fieldBeatProbability(playerSg: number, event: ScheduleEvent) {
  return 1 - normCdf((playerSg - fieldMean(event)) / FIELD_SPREAD);
}

function round2(value: number) {
  return Number(value.toFixed(2));
}

// Given the player's total SG for the week, resolve where they finished. Finish
// = 1 + how many of the field actually beat the player this week. Each opponent
// is an independent draw, so even an excellent week can run into a field
// member's spike. Winning means outrunning ALL of them, which is hard and
// genuinely random rather than clearing a fixed SG threshold.
function resolveFinish(
  playerSg: number,
  event: ScheduleEvent,
  random: () => number,
) {
  const size = fieldSize(event);
  const beatProb = fieldBeatProbability(playerSg, event);
  let ahead = 0;
  for (let i = 0; i < size - 1; i += 1) {
    if (random() < beatProb) ahead += 1;
  }
  const position = ahead + 1;
  // The 36-hole cut takes roughly the top ~62% of a full field; missing it
  // requires a genuinely poor week, so elite builds almost never miss.
  const madeCut =
    !eventHasCut(event.kind) || position <= Math.round(size * 0.62);
  return { position, madeCut };
}

function simulateEvent(
  totalSg: number,
  event: ScheduleEvent,
  index: number,
  seed: number,
  volatilityFactor: number,
): EventResult {
  const random = createRandom(seed + index * 9973);

  // SG figures are season-long means, but any given week is a sample around
  // that mean. Most weeks cluster near the mean, but ~14% are "spike weeks"
  // where a player runs way hot or ice cold (gain 5 one week, lose 1 the next).
  // The per-season volatilityFactor decides if this build is streaky or steady.
  const baseNoise = randomNormal(random);
  const spike = random() < 0.14 ? randomNormal(random) * 1.7 : 0;
  const weekSg = (baseNoise + spike) * WEEK_SG_SD * volatilityFactor;
  const courseFit = randomNormal(random) * COURSE_FIT_SD;
  const playerSg = totalSg + weekSg + courseFit;

  const { position, madeCut } = resolveFinish(playerSg, event, random);

  return {
    event,
    strokes: Number(playerSg.toFixed(2)),
    position: madeCut ? position : 0,
    madeCut,
    fedExPoints: madeCut ? positionToPoints(position, event) : 0,
    earnings: madeCut ? positionToPayout(position, event.purse) : 0,
  };
}

// Playoff events are revealed category-by-category, so instead of one aggregate
// week draw we sample each of the four SG categories around its own season mean
// with its own variance (CATEGORY_WEEK_SD). A shared "spike" term ties the four
// together — a genuinely hot week tends to light up every part of the bag — on
// top of each category's independent noise. The four week values sum to the
// total SG that then sets the finish through the same field model.
function simulatePlayoffEvent(
  categorySg: Record<CategoryKey, number>,
  event: ScheduleEvent,
  index: number,
  seed: number,
  volatilityFactor: number,
) {
  const random = createRandom(seed + index * 9973);
  const spikeActive = random() < 0.14;
  const spikeMagnitude = spikeActive ? randomNormal(random) * 1.2 : 0;

  const categories: CategoryBreakdown[] = CATEGORY_ORDER.map((category) => {
    const mean = categorySg[category];
    const base = randomNormal(random);
    const weekValue =
      mean + (base + spikeMagnitude) * CATEGORY_WEEK_SD[category] * volatilityFactor;
    return {
      category,
      mean: round2(mean),
      weekValue: round2(weekValue),
      delta: round2(weekValue - mean),
      above: weekValue >= mean,
    };
  });

  const weekSg = categories.reduce((sum, item) => sum + item.weekValue, 0);
  const { position } = resolveFinish(weekSg, event, random);

  return {
    event,
    categories,
    weekSg: round2(weekSg),
    position,
    fedExPoints: positionToPoints(position, event),
    earnings: positionToPayout(position, event.purse),
  };
}

// Regular-season FedEx points -> standings position. This is what makes the
// season results-driven rather than SG-driven: rank comes from the points a
// player actually banked, so a hot run (or a single stolen win) climbs the
// board and a flat year slides down, even at the same Strokes Gained. Anchors
// are the median points each SG tier posts, so a typical season still lands at
// its expected rank while the spread around it is earned on the course.
function pointsToRank(points: number) {
  const anchors = [
    { points: 3493, rank: 1 },
    { points: 2412, rank: 3 },
    { points: 1759, rank: 7 },
    { points: 1271, rank: 12 },
    { points: 907, rank: 22 },
    { points: 662, rank: 37 },
    { points: 479, rank: 58 },
    { points: 362, rank: 86 },
    { points: 282, rank: 108 },
    { points: 165, rank: 147 },
    { points: 80, rank: 175 },
    { points: 0, rank: 190 },
  ];

  if (points >= anchors[0].points) return anchors[0].rank;
  for (let index = 0; index < anchors.length - 1; index += 1) {
    const high = anchors[index];
    const low = anchors[index + 1];
    if (points <= high.points && points >= low.points) {
      const pct = (high.points - points) / (high.points - low.points);
      return high.rank + pct * (low.rank - high.rank);
    }
  }

  return anchors[anchors.length - 1].rank;
}

function regularSeasonRankFromPoints(points: number, seed: number) {
  // A little field noise: two players on the same points aren't truly tied, so
  // the exact standings position wobbles a few spots year to year. The band is
  // tapered toward the top of the board: rank-space is heavily compressed there
  // (the anchor curve spans ~1,000 points between ranks 1 and 3), so a flat ±3
  // would let a ~2,750-point season steal the No. 1 seed a third of the time.
  // The magnitude grows from 0 at the points leader up to the full ±3 by ~rank
  // 7, keeping mid-field wobble while making the regular-season title genuinely
  // require leader-level points.
  const random = createRandom(seed ^ 0x9e3779b9);
  const baseRank = pointsToRank(points);
  const noiseMagnitude = clamp((baseRank - 1) * 0.5, 0, 3);
  const noise = randomBetween(random, -noiseMagnitude, noiseMagnitude);
  return Math.round(clamp(baseRank + noise, 1, 190));
}

// Rank move for the two seeding playoff events (St. Jude, BMW). Positive = spots
// gained. These weeks only reshuffle the seeding into the finale; the Tour
// Championship itself is handled separately, where the East Lake finish sets the
// final Cup position outright.
function playoffRankMove(position: number, startingRank: number) {
  let base: number;
  if (position === 1) base = 6;
  else if (position <= 3) base = 3;
  else if (position <= 6) base = 1;
  else if (position <= 12) base = 0;
  else if (position <= 20) base = -2;
  else if (position <= 30) base = -4;
  else base = -8;

  // Gains are damped when you are already near No. 1 (hard to pass elite seeds)
  // and can't rocket from the back of the field on one week. Losses are not
  // damped.
  if (base <= 0) return base;
  const climbScale = clamp(startingRank / 22, 0.2, 1);
  return base * climbScale;
}

function getSeasonStatus(finalRank: number, regularSeasonRank: number) {
  const tier =
    finalRank === 1
      ? "1st"
      : finalRank === 2
        ? "2nd"
        : finalRank <= 5
          ? "3rd-5th"
          : finalRank <= 10
            ? "6th-10th"
            : finalRank <= 20
              ? "Top 20"
              : finalRank <= 30
                ? "Tour Championship"
                : finalRank <= 50
                  ? "BMW"
                  : finalRank <= 70
                    ? "Playoffs"
                    : finalRank <= 100
                      ? "Full Card"
                      : finalRank <= 125
                        ? "Conditional"
                        : "Outside Status";

  if (finalRank === 1) {
    return {
      label: "FedEx Cup Champion",
      headline: "You won the whole thing.",
      detail:
        "Finished No. 1 in the FedEx Cup. Grab the crystal, clear the mantle, and enjoy an offseason where nobody says a word about your putting.",
      tier,
    };
  }
  if (finalRank === 2) {
    return {
      label: "So Close",
      headline: "Second in the FedEx Cup.",
      detail:
        "A season-long title chase that ended one spot short. You'll be replaying that back nine all winter.",
      tier,
    };
  }
  if (finalRank <= 5) {
    return {
      label: "Elite Contender",
      headline: "Top five in the FedEx Cup.",
      detail:
        "A genuine title run that came up just shy of the trophy. Nobody is feeling sorry for you, and they shouldn't.",
      tier,
    };
  }
  if (finalRank <= 10) {
    return {
      label: "Top 10 Season",
      headline: "Top ten in the FedEx Cup.",
      detail:
        "A high-end year with deep playoff equity. You were in every conversation that mattered right down to the wire.",
      tier,
    };
  }
  if (finalRank <= 20) {
    return {
      label: "Top 20 Season",
      headline: "Inside the FedEx Cup top 20.",
      detail:
        "Safely among the year's best players with next season's Signature schedule locked up. A very good year at the office.",
      tier,
    };
  }
  if (finalRank <= 30) {
    return {
      label: "Tour Championship",
      headline: "You made it to East Lake.",
      detail:
        "Squeaked inside the top 30 and teed it up at the Tour Championship with a live shot at the Cup. Not bad for a season built on a spin wheel.",
      tier,
    };
  }
  if (finalRank <= 50) {
    return {
      label: "BMW + Signature Status",
      headline: "You reached the BMW Championship.",
      detail:
        "Locked up next year's Signature Events and The Players by finishing inside the top 50. The good tee times are yours.",
      tier,
    };
  }
  if (finalRank <= 70 || regularSeasonRank <= 70) {
    return {
      label: "Playoff Qualifier",
      headline: "You snuck into the playoffs.",
      detail:
        "Made the top 70 for the FedEx St. Jude but ran out of gas before the BMW cutoff. A postseason cameo still beats an early flight home.",
      tier,
    };
  }
  if (finalRank <= 100) {
    return {
      label: "Full PGA Tour Card",
      headline: "You kept your card.",
      detail:
        "Finished inside the top 100 and locked up full exempt status for next season. No Q-School, no sweats, see you in January.",
      tier,
    };
  }
  if (finalRank <= 125) {
    return {
      label: "Conditional Status",
      headline: "You're on the bubble.",
      detail:
        "Finished 101st to 125th, so it's conditional status and a lot of Monday mornings wondering if you're in the field. Q-School or Korn Ferry starts could still firm things up.",
      tier,
    };
  }
  return {
    label: "Lost Your Card",
    headline: "You lost your card.",
    detail:
      "Finished outside the top 125, so your PGA Tour status is gone. Best of luck in the KFT Finals. Get ready for some real sweats trying to win it back.",
    tier,
  };
}

function regularSeasonWriteup(rank: number, madePlayoffs: boolean): StageWriteup {
  if (!madePlayoffs) {
    return {
      label: "Regular Season",
      headline: "The season ends here.",
      detail:
        "You finished outside the top 70, so there's no FedEx Cup Playoffs run this year. The regular season was the whole story.",
    };
  }

  if (rank <= 5) {
    return {
      label: "Regular Season",
      headline: "You're a top seed.",
      detail:
        "A monster regular season lands you among the very top seeds heading into the FedEx Cup Playoffs. Take care of business over three weeks and the Cup is yours to lose.",
    };
  }

  if (rank <= 30) {
    return {
      label: "Regular Season",
      headline: "You're in the playoffs.",
      detail:
        "You got the job done over the regular season and locked up a strong seed into the FedEx Cup Playoffs. Let's see if you can get hot and finish things off.",
    };
  }

  return {
    label: "Regular Season",
    headline: "You snuck into the playoffs.",
    detail:
      "You did just enough over the regular season to make it through to the FedEx Cup Playoffs. It'll take a hot streak from here, but you're dancing. Let's see if you can finish things off.",
  };
}

function playoffStageWriteup(
  playoffIndex: number,
  isFinale: boolean,
  advanced: boolean,
  rankAfter: number,
): StageWriteup {
  if (isFinale) {
    if (rankAfter === 1) {
      return {
        label: "Tour Championship",
        headline: "FedEx Cup Champion.",
        detail:
          "You closed it out at East Lake and took the whole thing. Grab the crystal, clear the mantle, and enjoy the offseason as the best player on the planet.",
      };
    }
    if (rankAfter <= 5) {
      return {
        label: "Tour Championship",
        headline: `You finished No. ${rankAfter} in the FedEx Cup.`,
        detail:
          "A genuine run at the Cup that came up just short at East Lake. Nobody's feeling sorry for you, and they shouldn't.",
      };
    }
    return {
      label: "Tour Championship",
      headline: `You finished No. ${rankAfter} in the FedEx Cup.`,
      detail:
        "You teed it up at East Lake with the Cup on the line. It didn't fall your way, but a Tour Championship appearance is a season most players would sign for.",
    };
  }

  if (playoffIndex === 0) {
    if (advanced) {
      return {
        label: "FedEx St. Jude Championship",
        headline: "On to the BMW.",
        detail:
          "Top 50 after the St. Jude — you're moving on to the BMW Championship with East Lake squarely in sight.",
      };
    }
    return {
      label: "FedEx St. Jude Championship",
      headline: "The run ends at the St. Jude.",
      detail:
        "You came up short of the top 50, so the playoff run stops in week one. A postseason cameo still beats an early flight home.",
    };
  }

  // BMW Championship
  if (advanced) {
    return {
      label: "BMW Championship",
      headline: "You're going to East Lake.",
      detail:
        "Inside the top 30 when it counted — you punched your ticket to the Tour Championship with a live shot at the Cup.",
    };
  }
  return {
    label: "BMW Championship",
    headline: "One stop short of East Lake.",
    detail:
      "You landed just outside the top 30, so the Tour Championship goes on without you. Reaching the BMW is still a genuinely strong year.",
  };
}

export function simulateSeason(
  categorySg: Record<CategoryKey, number>,
  seed: number,
): SeasonSimulation {
  const totalSg = CATEGORY_ORDER.reduce(
    (sum, category) => sum + categorySg[category],
    0,
  );

  // A season-long "consistency" trait: some builds are streaky and post big
  // spike weeks (high finishes and blow-ups), others grind out metronomic
  // middle-of-the-pack results. This is drawn once per simulation so the same
  // SG can play out very differently from one season to the next.
  const seasonRandom = createRandom(seed ^ 0x51ed270b);
  const volatilityFactor = clamp(
    0.6 + Math.abs(randomNormal(seasonRandom)) * 0.7,
    0.6,
    2.4,
  );

  const results = PREMIUM_2026_SCHEDULE.map((event, index) =>
    simulateEvent(totalSg, event, index, seed, volatilityFactor),
  );

  // Results drive everything: the FedEx points banked across the regular season
  // set the seeding into the playoffs. A player can post a mediocre SG year but
  // steal a win, bank a pile of points, and lock up their card and a playoff
  // spot on the strength of that one week.
  const regularSeasonPoints = results.reduce(
    (sum, result) => sum + result.fedExPoints,
    0,
  );
  const regularSeasonEarnings = results.reduce(
    (sum, result) => sum + result.earnings,
    0,
  );
  let fedExPoints = regularSeasonPoints;
  const regularSeasonRank = regularSeasonRankFromPoints(regularSeasonPoints, seed);
  const madePlayoffs = regularSeasonRank <= 70;
  let liveRank = regularSeasonRank;

  const regularSeason: RegularSeasonSummary = {
    points: Math.round(regularSeasonPoints),
    rank: regularSeasonRank,
    earnings: regularSeasonEarnings,
    madePlayoffs,
    writeup: regularSeasonWriteup(regularSeasonRank, madePlayoffs),
  };

  const playoffStages: PlayoffStageResult[] = [];
  const playoffCutoffs = [70, 50, 30];
  FEDEX_PLAYOFF_SCHEDULE.forEach((event, playoffIndex) => {
    if (liveRank > playoffCutoffs[playoffIndex]) return;

    const stage = simulatePlayoffEvent(
      categorySg,
      event,
      PREMIUM_2026_SCHEDULE.length + playoffIndex,
      seed,
      volatilityFactor,
    );

    // The Tour Championship finale awards no FedEx points — everyone starts at
    // even par and the best 72-hole score wins the Cup outright. Only the first
    // two Playoffs events bank points (750 to the winner).
    const isFinale = playoffIndex === FEDEX_PLAYOFF_SCHEDULE.length - 1;
    const stagePoints = isFinale ? 0 : stage.fedExPoints;

    results.push({
      event,
      strokes: stage.weekSg,
      position: stage.position,
      madeCut: true,
      fedExPoints: stagePoints,
      earnings: stage.earnings,
    });
    fedExPoints += stagePoints;

    const rankBefore = liveRank;
    if (isFinale) {
      // East Lake decides it outright: your Tour Championship finish IS your
      // final FedEx Cup position. Win it and you win the Cup from any seed;
      // finish T7 off the No. 1 seed and you finish 7th in the standings.
      liveRank = stage.position;
    } else {
      // Once you're in a Playoffs event you can only fall to the bottom of that
      // event's field — a 70th seed who finishes last at the St. Jude caps at
      // 70th, not lower. The field shrinks each stage (70 → 50 → 30), so the cap
      // is the current event's field size.
      const fieldCap = playoffCutoffs[playoffIndex];
      liveRank = Math.round(
        clamp(liveRank - playoffRankMove(stage.position, liveRank), 1, fieldCap),
      );
    }
    const advanced = isFinale
      ? liveRank === 1
      : liveRank <= playoffCutoffs[playoffIndex + 1];

    playoffStages.push({
      event,
      categories: stage.categories,
      weekSg: stage.weekSg,
      position: stage.position,
      fedExPoints: stagePoints,
      earnings: stage.earnings,
      rankBefore,
      rankAfter: liveRank,
      isFinale,
      advanced,
      writeup: playoffStageWriteup(playoffIndex, isFinale, advanced, liveRank),
    });
  });

  const earnings = results.reduce((sum, result) => sum + result.earnings, 0);
  const madeCuts = results.filter((result) => result.madeCut);
  const averageFinish =
    madeCuts.length > 0
      ? madeCuts.reduce((sum, result) => sum + result.position, 0) / madeCuts.length
      : 0;
  const status = getSeasonStatus(liveRank, regularSeasonRank);

  return {
    totalSg: Number(totalSg.toFixed(2)),
    averageFinish: Number(averageFinish.toFixed(1)),
    fedExPoints: Math.round(fedExPoints),
    fedExRank: liveRank,
    regularSeasonFedExRank: regularSeasonRank,
    status,
    earnings,
    results,
    regularSeason,
    playoffStages,
  };
}
