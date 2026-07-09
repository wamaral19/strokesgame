import { CATEGORY_ORDER } from "./categories";
import {
  CATEGORY_PHRASE,
  PO_ADVANCED_BMW,
  PO_ADVANCED_TC,
  PO_ELIM_BEFORE_TC,
  PO_ELIM_FIRST,
  PO_LOST_AS_FAVORITE,
  PO_WON_BMW,
  PO_WON_FIRST,
  PO_WON_TC,
  REG_BAD_STATS_GOOD,
  REG_BUBBLE,
  REG_CONSISTENT_TOP10,
  REG_FEAST_FAMINE,
  REG_HALL_OF_FAME,
  REG_HISTORIC,
  REG_HISTORIC_MARQUEE,
  REG_MID,
  REG_MISSED,
  REG_MULTI_WIN,
  REG_MULTI_WIN_MARQUEE,
  REG_NO_WIN_RUNNER_UP,
  REG_NO_WIN_TOP3_OUTSIDE,
  REG_SINGLE_WIN,
  REG_STAT_MONSTER,
  REG_TOP5,
  REG_TOP10,
  REG_TOP30,
  REG_WIN_OUTSIDE,
  SG_BALANCED,
  SG_BETTER,
  SG_ONE_CARRIES,
  SG_ONE_SINKS,
  SG_WORSE,
  fill,
  formatList,
  pick,
  tournamentPhrase,
} from "./copy";
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
    [11, 70],
    [12, 65],
    [13, 60],
    [14, 57],
    [15, 55],
    [16, 53],
    [17, 51],
    [18, 49],
    [19, 47],
    [20, 45],
    [21, 43],
    [22, 41],
    [23, 39],
    [24, 37],
    [25, 35.5],
    [26, 34],
    [27, 32.5],
    [28, 31],
    [29, 29.5],
    [30, 28],
    [31, 26.5],
    [32, 25],
    [33, 23.5],
    [34, 22],
    [35, 21],
    [36, 20],
    [37, 19],
    [38, 18],
    [39, 17],
    [40, 16],
    [41, 15],
    [42, 14],
    [43, 13],
    [44, 12],
    [45, 11],
    [46, 10.5],
    [47, 10],
    [48, 9.5],
    [49, 9],
    [50, 8.5],
    [51, 8],
    [52, 7.5],
    [53, 7],
    [54, 6.5],
    [55, 6],
    [56, 5.8],
    [57, 5.6],
    [58, 5.4],
    [59, 5.2],
    [60, 5],
    [61, 4.8],
    [62, 4.6],
    [63, 4.4],
    [64, 4.2],
    [65, 4],
    [66, 3.8],
    [67, 3.6],
    [68, 3.4],
    [69, 3.2],
    [70, 3],
    [71, 2.9],
    [72, 2.8],
    [73, 2.7],
    [74, 2.6],
    [75, 2.5],
    [76, 2.4],
    [77, 2.3],
    [78, 2.2],
    [79, 2.1],
    [80, 2],
    [81, 1.9],
    [82, 1.8],
    [83, 1.7],
    [84, 1.6],
    [85, 1.5],
  ],
  // Official 700-point Signature Event curve.
  signature: [
    [1, 700],
    [2, 400],
    [3, 350],
    [4, 325],
    [5, 300],
    [6, 275],
    [7, 225],
    [8, 200],
    [9, 175],
    [10, 150],
    [11, 130],
    [12, 120],
    [13, 110],
    [14, 100],
    [15, 90],
    [16, 80],
    [17, 70],
    [18, 65],
    [19, 60],
    [20, 55],
    [21, 50],
    [22, 48],
    [23, 46],
    [24, 44],
    [25, 42],
    [26, 40],
    [27, 38],
    [28, 36],
    [29, 34],
    [30, 32.5],
    [31, 31],
    [32, 29.5],
    [33, 28],
    [34, 26.5],
    [35, 25],
    [36, 24],
    [37, 23],
    [38, 22],
    [39, 21],
    [40, 20.25],
    [41, 19.5],
    [42, 18.75],
    [43, 18],
    [44, 17.25],
    [45, 16.5],
    [46, 15.75],
    [47, 15],
    [48, 14.25],
    [49, 13.5],
    [50, 13],
    [51, 12.5],
    [52, 12],
    [53, 11.5],
    [54, 11],
    [55, 10.5],
    [56, 10],
    [57, 9.5],
    [58, 9],
    [59, 8.5],
    [60, 8.25],
    [61, 8],
    [62, 7.75],
    [63, 7.5],
    [64, 7.25],
    [65, 7],
    [66, 6.75],
    [67, 6.5],
    [68, 6.25],
    [69, 6],
    [70, 5.75],
    [71, 5.5],
    [72, 5.25],
    [73, 5],
    [74, 4.75],
    [75, 4.5],
    [76, 4.25],
    [77, 4],
    [78, 3.75],
    [79, 3.5],
    [80, 3.25],
    [81, 3],
    [82, 2.75],
    [83, 2.5],
    [84, 2.25],
    [85, 2],
  ],
  major: [
    [1, 750],
    [2, 500],
    [3, 350],
    [4, 325],
    [5, 300],
    [6, 270],
    [7, 250],
    [8, 225],
    [9, 200],
    [10, 175],
    [11, 155],
    [12, 135],
    [13, 115],
    [14, 105],
    [15, 95],
    [16, 85],
    [17, 75],
    [18, 70],
    [19, 65],
    [20, 60],
    [21, 55],
    [22, 53],
    [23, 51],
    [24, 49],
    [25, 47],
    [26, 45],
    [27, 43],
    [28, 41],
    [29, 39],
    [30, 37],
    [31, 35],
    [32, 33],
    [33, 31],
    [34, 29],
    [35, 27],
    [36, 26],
    [37, 25],
    [38, 24],
    [39, 23],
    [40, 22],
    [41, 21],
    [42, 20.25],
    [43, 19.5],
    [44, 18.75],
    [45, 18],
    [46, 17.25],
    [47, 16.5],
    [48, 15.75],
    [49, 15],
    [50, 14.25],
    [51, 13.5],
    [52, 13],
    [53, 12.5],
    [54, 12],
    [55, 11.5],
    [56, 11],
    [57, 10.5],
    [58, 10],
    [59, 9.5],
    [60, 9],
    [61, 8.5],
    [62, 8.25],
    [63, 8],
    [64, 7.75],
    [65, 7.5],
    [66, 7.25],
    [67, 7],
    [68, 6.75],
    [69, 6.5],
    [70, 6.25],
    [71, 6],
    [72, 5.75],
    [73, 5.5],
    [74, 5.25],
    [75, 5],
    [76, 4.75],
    [77, 4.5],
    [78, 4.25],
    [79, 4],
    [80, 3.75],
    [81, 3.5],
    [82, 3.25],
    [83, 3],
    [84, 2.75],
    [85, 2.5],
  ],
  players: [
    [1, 750],
    [2, 500],
    [3, 350],
    [4, 325],
    [5, 300],
    [6, 270],
    [7, 250],
    [8, 225],
    [9, 200],
    [10, 175],
    [11, 155],
    [12, 135],
    [13, 115],
    [14, 105],
    [15, 95],
    [16, 85],
    [17, 75],
    [18, 70],
    [19, 65],
    [20, 60],
    [21, 55],
    [22, 53],
    [23, 51],
    [24, 49],
    [25, 47],
    [26, 45],
    [27, 43],
    [28, 41],
    [29, 39],
    [30, 37],
    [31, 35],
    [32, 33],
    [33, 31],
    [34, 29],
    [35, 27],
    [36, 26],
    [37, 25],
    [38, 24],
    [39, 23],
    [40, 22],
    [41, 21],
    [42, 20.25],
    [43, 19.5],
    [44, 18.75],
    [45, 18],
    [46, 17.25],
    [47, 16.5],
    [48, 15.75],
    [49, 15],
    [50, 14.25],
    [51, 13.5],
    [52, 13],
    [53, 12.5],
    [54, 12],
    [55, 11.5],
    [56, 11],
    [57, 10.5],
    [58, 10],
    [59, 9.5],
    [60, 9],
    [61, 8.5],
    [62, 8.25],
    [63, 8],
    [64, 7.75],
    [65, 7.5],
    [66, 7.25],
    [67, 7],
    [68, 6.75],
    [69, 6.5],
    [70, 6.25],
    [71, 6],
    [72, 5.75],
    [73, 5.5],
    [74, 5.25],
    [75, 5],
    [76, 4.75],
    [77, 4.5],
    [78, 4.25],
    [79, 4],
    [80, 3.75],
    [81, 3.5],
    [82, 3.25],
    [83, 3],
    [84, 2.75],
    [85, 2.5],
  ],
  // Scaled from the official 2,000-point playoff curve to the game's
  // 750-point playoff cap. The Tour Championship finale awards no points.
  playoff: [
    [1, 750],
    [2, 450],
    [3, 285],
    [4, 202.5],
    [5, 165],
    [6, 150],
    [7, 135],
    [8, 127.5],
    [9, 120],
    [10, 112.5],
    [11, 105],
    [12, 97.5],
    [13, 90],
    [14, 85.5],
    [15, 82.5],
    [16, 79.5],
    [17, 76.5],
    [18, 73.5],
    [19, 70.5],
    [20, 67.5],
    [21, 64.5],
    [22, 61.5],
    [23, 58.5],
    [24, 55.5],
    [25, 53.25],
    [26, 51],
    [27, 48.75],
    [28, 46.5],
    [29, 44.25],
    [30, 42],
    [31, 39.75],
    [32, 37.5],
    [33, 35.25],
    [34, 33],
    [35, 31.5],
    [36, 30],
    [37, 28.5],
    [38, 27],
    [39, 25.5],
    [40, 24],
    [41, 22.5],
    [42, 21],
    [43, 19.5],
    [44, 18],
    [45, 16.5],
    [46, 15.75],
    [47, 15],
    [48, 14.25],
    [49, 13.5],
    [50, 12.75],
    [51, 12],
    [52, 11.25],
    [53, 10.5],
    [54, 9.75],
    [55, 9],
    [56, 8.7],
    [57, 8.4],
    [58, 8.1],
    [59, 7.8],
    [60, 7.5],
    [61, 7.2],
    [62, 6.9],
    [63, 6.6],
    [64, 6.3],
    [65, 6],
    [66, 5.7],
    [67, 5.4],
    [68, 5.1],
    [69, 4.8],
    [70, 4.5],
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
// The field's mean SG scales with field strength. SG here is "true" strokes
// gained — measured against the average PGA Tour field (the tour baseline), the
// same scale as a player's season-long stats. A weak full-field event centres
// just above 0, while signature events, majors, and the playoffs are stacked
// with elite players and sit higher. The slope was halved (2.27 -> 1.135) so
// those elite fields sit closer to the tour baseline: a genuinely strong true-SG
// week now climbs the leaderboard instead of drowning in a field whose median
// player is already +1.3, while winning still takes a real spike week.
const FIELD_MEAN_SLOPE = 1.135;
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
  return { position, madeCut, tied: isTiedFinish(playerSg, size, event, random) };
}

// Real leaderboards are full of ties, but not evenly: solo finishes are common
// out on the low-scoring tail (near the lead, where finishers are sparse) and
// rare in the bunched middle of the pack. We model a finish as tied when at
// least one other player posts the same score. The field's weekly scores are
// ~Normal(fieldMean, FIELD_SPREAD), so the local density of finishers at the
// player's score is (size - 1) * pdf(playerSg). Counting the others that land
// within ~one stroke (≈0.28 SG/round counts as the "same" total score) gives
// the expected number of tie-mates; the finish is solo only if that Poisson
// count comes up zero.
const TIE_BIN_SG = 0.28;

function isTiedFinish(
  playerSg: number,
  size: number,
  event: ScheduleEvent,
  random: () => number,
) {
  const z = (playerSg - fieldMean(event)) / FIELD_SPREAD;
  const density = (0.3989422804014327 * Math.exp((-z * z) / 2)) / FIELD_SPREAD;
  const meanTieMates = (size - 1) * TIE_BIN_SG * density;
  // Poisson probability of at least one other player on the same score.
  const soloProb = Math.exp(-meanTieMates);
  return random() >= soloProb;
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

  const { position, madeCut, tied } = resolveFinish(playerSg, event, random);

  return {
    event,
    strokes: Number(playerSg.toFixed(2)),
    position: madeCut ? position : 0,
    tied: madeCut && tied,
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
  const { position, tied } = resolveFinish(weekSg, event, random);

  return {
    event,
    categories,
    weekSg: round2(weekSg),
    position,
    tied,
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
    { points: 5400, rank: 1 },
    { points: 3750, rank: 2 },
    { points: 2570, rank: 3 },
    { points: 2425, rank: 4 },
    { points: 2220, rank: 6 },
    { points: 2050, rank: 8 },
    { points: 1825, rank: 10 },
    { points: 1700, rank: 12 },
    { points: 1600, rank: 15 },
    { points: 1500, rank: 18 },
    { points: 1400, rank: 23 },
    { points: 1300, rank: 29 },
    { points: 1200, rank: 35 },
    { points: 1100, rank: 45 },
    { points: 1000, rank: 55 },
    { points: 850, rank: 70 },
    { points: 650, rank: 95 },
    { points: 450, rank: 125 },
    { points: 250, rank: 155 },
    { points: 80, rank: 180 },
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
  // the exact standings position wobbles slightly year to year. Keep the band
  // narrow, though: the points total should do most of the talking. Taper the
  // wobble at the playoff cutoff so top-70 eligibility is driven by points.
  const random = createRandom(seed ^ 0x9e3779b9);
  const baseRank = pointsToRank(points);
  const cutoffTaper = clamp(Math.abs(baseRank - 70) / 8, 0, 1);
  const noiseMagnitude = clamp((baseRank - 1) * 0.18, 0, 1.25) * cutoffTaper;
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

// Everything the regular-season recap needs to choose its copy, derived from the
// season's event results.
type RegularSeasonSignals = {
  rank: number;
  madePlayoffs: boolean;
  winNames: string[];
  // Names of the wins that were majors or the Players Championship, in full and
  // in schedule order. These are the only wins named in a multi-win recap.
  marqueeWins: string[];
  totalSg: number;
  top10Count: number;
  bestFinish: number;
  hasTop3: boolean;
  hasRunnerUp: boolean;
  missedCuts: number;
  topFinishEvent?: string;
};

// Spelled-out win totals for the "historically strong" (3–7 win) recap band.
const WIN_COUNT_WORDS: Record<number, string> = {
  3: "Three",
  4: "Four",
  5: "Five",
  6: "Six",
  7: "Seven",
};

// The recap reads as [optional win/no-win lead] + [rank-tier "rest"]. The lead
// characterises HOW the season went (a win, a near-miss, a stat-monster grind);
// the rest states WHERE it finished. Copy is picked deterministically from the
// season seed so a given run always narrates the same way.
function regularSeasonWriteup(
  signals: RegularSeasonSignals,
  seed: number,
): StageWriteup {
  const {
    rank,
    madePlayoffs,
    winNames,
    marqueeWins,
    totalSg,
    top10Count,
    bestFinish,
    hasTop3,
    hasRunnerUp,
    missedCuts,
    topFinishEvent,
  } = signals;
  const winCount = winNames.length;

  const rankPool = !madePlayoffs
    ? REG_MISSED
    : rank <= 5
      ? REG_TOP5
      : rank <= 10
        ? REG_TOP10
        : rank <= 30
          ? REG_TOP30
          : rank <= 60
            ? REG_MID
            : REG_BUBBLE;
  const rest = pick(rankPool, seed);

  const leadSeed = seed >> 2;
  // The specific tournament to name in the lead: the win for win-based leads,
  // otherwise the player's best finish for top-finish leads.
  const winEvent = winNames[0] ? tournamentPhrase(winNames[0]) : "";
  const bestEvent = topFinishEvent ? tournamentPhrase(topFinishEvent) : "";
  // Multi-win seasons name only the marquee wins (majors / the Players); every
  // other trophy is folded into a generic "multi-win season" description.
  const marqueeList = formatList(marqueeWins);
  const hasMarquee = marqueeWins.length > 0;
  let lead = "";
  if (winCount >= 8) {
    lead = pick(REG_HALL_OF_FAME, leadSeed);
  } else if (winCount >= 3) {
    lead = hasMarquee
      ? fill(pick(REG_HISTORIC_MARQUEE, leadSeed), {
          count: WIN_COUNT_WORDS[winCount] ?? String(winCount),
          events: marqueeList,
        })
      : fill(pick(REG_HISTORIC, leadSeed), {
          count: WIN_COUNT_WORDS[winCount] ?? String(winCount),
        });
  } else if (winCount >= 2) {
    lead = hasMarquee
      ? fill(pick(REG_MULTI_WIN_MARQUEE, leadSeed), { events: marqueeList })
      : pick(REG_MULTI_WIN, leadSeed);
  } else if (winCount === 1 && missedCuts >= 3 && hasTop3) {
    lead = fill(pick(REG_FEAST_FAMINE, leadSeed), { tournament: winEvent });
  } else if (winCount === 1) {
    lead = fill(
      rank > 30 || totalSg < 0.3
        ? pick(REG_WIN_OUTSIDE, leadSeed)
        : pick(REG_SINGLE_WIN, leadSeed),
      { tournament: winEvent },
    );
  } else if (!madePlayoffs && hasTop3 && topFinishEvent) {
    lead = fill(pick(REG_NO_WIN_TOP3_OUTSIDE, leadSeed), {
      tournament: bestEvent,
    });
  } else if (hasRunnerUp && topFinishEvent) {
    lead = fill(pick(REG_NO_WIN_RUNNER_UP, leadSeed), {
      tournament: bestEvent,
    });
  } else if (top10Count >= 3 && topFinishEvent) {
    lead = fill(pick(REG_CONSISTENT_TOP10, leadSeed), {
      tournament: bestEvent,
    });
  } else if (totalSg >= 2.0) {
    lead = pick(REG_STAT_MONSTER, leadSeed);
  } else if (rank <= 30 && totalSg < 0.5) {
    lead = pick(REG_BAD_STATS_GOOD, leadSeed);
  }

  const headline = !madePlayoffs
    ? "The season ends here."
    : rank <= 5
      ? "You're a top seed."
      : rank <= 10
        ? "A top-10 regular season."
        : rank <= 60
          ? "You're in the playoffs."
          : "You snuck into the playoffs.";

  return {
    label: "Regular Season",
    headline,
    detail: lead ? `${lead} ${rest}` : rest,
  };
}

function playoffStageWriteup(
  playoffIndex: number,
  eventName: string,
  isFinale: boolean,
  advanced: boolean,
  rankBefore: number,
  rankAfter: number,
  wonEvent: boolean,
  seed: number,
): StageWriteup {
  if (isFinale) {
    const label = "Tour Championship";
    if (rankAfter === 1) {
      return { label, headline: "FedEx Cup Champion.", detail: pick(PO_WON_TC, seed) };
    }
    // Entered East Lake as the No. 1 seed but someone else lifted the Cup.
    if (rankBefore === 1) {
      return {
        label,
        headline: `You finished No. ${rankAfter} in the FedEx Cup.`,
        detail: pick(PO_LOST_AS_FAVORITE, seed),
      };
    }
    if (rankAfter <= 5) {
      return {
        label,
        headline: `You finished No. ${rankAfter} in the FedEx Cup.`,
        detail:
          "A genuine run at the Cup that came up just short at East Lake. Nobody's feeling sorry for you, and they shouldn't.",
      };
    }
    return {
      label,
      headline: `You finished No. ${rankAfter} in the FedEx Cup.`,
      detail:
        "You teed it up at East Lake with the Cup on the line. It didn't fall your way, but a Tour Championship appearance is a season most players would sign for.",
    };
  }

  if (playoffIndex === 0) {
    if (wonEvent) {
      return { label: eventName, headline: "You won the St. Jude.", detail: pick(PO_WON_FIRST, seed) };
    }
    if (advanced) {
      return { label: eventName, headline: "On to the BMW.", detail: pick(PO_ADVANCED_BMW, seed) };
    }
    return {
      label: eventName,
      headline: "The run ends at the St. Jude.",
      detail: pick(PO_ELIM_FIRST, seed),
    };
  }

  // BMW Championship
  if (wonEvent) {
    return { label: eventName, headline: "You won the BMW.", detail: pick(PO_WON_BMW, seed) };
  }
  if (advanced) {
    return { label: eventName, headline: "You're going to East Lake.", detail: pick(PO_ADVANCED_TC, seed) };
  }
  return {
    label: eventName,
    headline: "One stop short of East Lake.",
    detail: pick(PO_ELIM_BEFORE_TC, seed),
  };
}

// A one-line note on which part of the bag drove the week, from the category
// deltas vs. the player's season means. Big single-category swings (>= 1.0
// stroke) name the club directly; otherwise the note describes the run as
// carried, sunk, or balanced by the widest gap.
function playoffSgNote(categories: CategoryBreakdown[], seed: number): string {
  const sorted = [...categories].sort((a, b) => b.delta - a.delta);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  if (best.delta >= 1.0 && best.delta >= -worst.delta) {
    return pick(SG_BETTER[best.category], seed);
  }
  if (worst.delta <= -1.0) {
    return pick(SG_WORSE[worst.category], seed);
  }

  const spread = best.delta - worst.delta;
  if (spread < 0.6) return pick(SG_BALANCED, seed);
  if (best.delta >= 0.6) {
    return fill(pick(SG_ONE_CARRIES, seed), { category: CATEGORY_PHRASE[best.category] });
  }
  if (worst.delta <= -0.6) {
    return fill(pick(SG_ONE_SINKS, seed), { category: CATEGORY_PHRASE[worst.category] });
  }
  return pick(SG_BALANCED, seed);
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
  // Wins banked during the regular season (before any playoff events are
  // appended to `results`). These drive the win-first recap.
  const regularSeasonWins = results
    .filter((result) => result.position === 1)
    .map((result) => result.event.name);
  // The subset of wins that carry marquee weight (majors and the Players
  // Championship). Only these are named in a multi-win recap.
  const marqueeWins = results
    .filter(
      (result) =>
        result.position === 1 &&
        (result.event.kind === "major" || result.event.kind === "players"),
    )
    .map((result) => result.event.name);
  let fedExPoints = regularSeasonPoints;
  const regularSeasonRank = regularSeasonRankFromPoints(regularSeasonPoints, seed);
  const madePlayoffs = regularSeasonRank <= 70;
  let liveRank = regularSeasonRank;

  // Secondary signals for the recap copy: how the finishes were shaped beyond
  // the raw standings rank (top-10 volume, near-misses, missed cuts, best week).
  const madeCutResults = results.filter((result) => result.madeCut);
  const bestResult = madeCutResults.reduce<EventResult | undefined>(
    (best, result) =>
      !best || result.position < best.position ? result : best,
    undefined,
  );
  const bestFinish = bestResult ? bestResult.position : Number.POSITIVE_INFINITY;

  const regularSeason: RegularSeasonSummary = {
    points: Math.round(regularSeasonPoints),
    rank: regularSeasonRank,
    earnings: regularSeasonEarnings,
    wins: regularSeasonWins.length,
    madePlayoffs,
    writeup: regularSeasonWriteup(
      {
        rank: regularSeasonRank,
        madePlayoffs,
        winNames: regularSeasonWins,
        marqueeWins,
        totalSg,
        top10Count: madeCutResults.filter((result) => result.position <= 10).length,
        bestFinish,
        hasTop3: bestFinish <= 3,
        hasRunnerUp: madeCutResults.some((result) => result.position === 2),
        missedCuts: results.filter((result) => !result.madeCut).length,
        topFinishEvent: bestResult?.event.name,
      },
      seed,
    ),
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

    // Playoff events live in `playoffStages`, not `results`. Each one is only
    // "played" once the playback reaches its stage, so the season-results table
    // appends them from there rather than carrying them in the regular-season
    // list from the start.
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

    const stageSeed = seed + playoffIndex * 7919;
    playoffStages.push({
      event,
      categories: stage.categories,
      weekSg: stage.weekSg,
      position: stage.position,
      tied: stage.tied,
      fedExPoints: stagePoints,
      earnings: stage.earnings,
      rankBefore,
      rankAfter: liveRank,
      isFinale,
      advanced,
      writeup: playoffStageWriteup(
        playoffIndex,
        event.name,
        isFinale,
        advanced,
        rankBefore,
        liveRank,
        stage.position === 1,
        stageSeed,
      ),
      sgNote: playoffSgNote(stage.categories, stageSeed),
    });
  });

  // Whole-season totals fold the playoff stages back in: `results` is now the
  // regular season alone, so earnings and average finish add the played
  // playoff events explicitly.
  const earnings =
    results.reduce((sum, result) => sum + result.earnings, 0) +
    playoffStages.reduce((sum, stage) => sum + stage.earnings, 0);
  const madeCutFinishes = results
    .filter((result) => result.madeCut)
    .map((result) => result.position);
  const finishes = [
    ...madeCutFinishes,
    ...playoffStages.map((stage) => stage.position),
  ];
  const averageFinish =
    finishes.length > 0
      ? finishes.reduce((sum, position) => sum + position, 0) / finishes.length
      : 0;
  const status = getSeasonStatus(liveRank, regularSeasonRank);

  return {
    seed,
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
