import {
  END_AVG_AVG,
  END_AVG_GREAT,
  END_BIG_MONEY,
  END_DOMINANT_STAT,
  END_GREAT_BAD,
  END_GREAT_GREAT,
  END_MISSED_BUT_WON,
  END_MISSED_NO_WIN,
  END_NARROW_MISS,
  END_NOWIN_DEEP,
  END_POOR_SURPRISE,
  MAJOR_RUNNER_UP,
  MAJOR_STRONG,
  MAJOR_TOP10,
  MAJOR_WON,
  fill,
  pick,
} from "./game/copy";
import type { SeasonSimulation } from "./game/types";

export function formatSg(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

// Ordinal suffix for a solo finish: 2 -> "2nd", 3 -> "3rd", 4 -> "4th", 11 ->
// "11th", 21 -> "21st".
function ordinal(position: number) {
  const mod100 = position % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${position}th`;
  switch (position % 10) {
    case 1:
      return `${position}st`;
    case 2:
      return `${position}nd`;
    case 3:
      return `${position}rd`;
    default:
      return `${position}th`;
  }
}

// A finish label. First is always a "Win". Everything else is "T5" when the
// finish was shared and a solo ordinal ("5th") when it wasn't.
export function positionLabel(position: number, tied = true) {
  if (position === 1) return "Win";
  return tied ? `T${position}` : ordinal(position);
}

// A notable major finish rewrites the top of the recap. We only surface the
// positives (a win, a runner-up, a top 10, or a strong major season overall) —
// a missed cut isn't a headline worth leading with. Returns "" when nothing
// stands out.
function majorLine(simulation: SeasonSimulation): string {
  const majors = simulation.results.filter(
    (result) => result.event.kind === "major",
  );
  if (majors.length === 0) return "";

  const seed = simulation.seed ^ 0x5f356495;
  const won = majors.find((result) => result.position === 1);
  if (won) return fill(pick(MAJOR_WON, seed), { major: won.event.name });

  const runnerUp = majors.find((result) => result.madeCut && result.position === 2);
  if (runnerUp) {
    return fill(pick(MAJOR_RUNNER_UP, seed), { major: runnerUp.event.name });
  }

  const top10 = majors
    .filter((result) => result.madeCut && result.position <= 10)
    .sort((a, b) => a.position - b.position)[0];
  if (top10) return fill(pick(MAJOR_TOP10, seed), { major: top10.event.name });

  const top20Count = majors.filter(
    (result) => result.madeCut && result.position <= 20,
  ).length;
  if (top20Count >= 2) return pick(MAJOR_STRONG, seed);

  return "";
}

// The composite ending: how the regular season (regularSeasonFedExRank) and the
// playoff run (fedExRank) fit together, plus the biggest near-misses. Layered on
// top of the rank-based status.detail in the final block.
export function seasonBlurb(simulation: SeasonSimulation) {
  // Every trophy across the season — regular-season and playoff-event wins.
  const wins = [
    ...simulation.results.filter((result) => result.position === 1),
    ...simulation.playoffStages.filter((stage) => stage.position === 1),
  ];

  const madePlayoffs = simulation.playoffStages.length > 0;
  const reg = simulation.regularSeasonFedExRank;
  const fin = simulation.fedExRank;
  const deepRun = madePlayoffs && fin <= 30;
  const seed = simulation.seed;
  const flourishSeed = seed ^ 0x27d4eb2f;

  const major = majorLine(simulation);

  const primary = (() => {
    // Near-misses cut across every tier, so they lead.
    if (fin === 2) return pick(END_NARROW_MISS, seed);
    if (!madePlayoffs && wins.length === 0 && reg <= 73) {
      return pick(END_NARROW_MISS, seed);
    }
    if (madePlayoffs && !deepRun && fin <= 33) return pick(END_NARROW_MISS, seed);

    if (!madePlayoffs) {
      return wins.length > 0
        ? pick(END_MISSED_BUT_WON, seed)
        : pick(END_MISSED_NO_WIN, seed);
    }

    // Reached the finale without ever winning: the deep run is the story.
    if (wins.length === 0 && deepRun) return pick(END_NOWIN_DEEP, seed);

    // regular-season strength x playoff outcome.
    if (reg <= 15) return pick(deepRun ? END_GREAT_GREAT : END_GREAT_BAD, seed);
    if (reg <= 50) return pick(deepRun ? END_AVG_GREAT : END_AVG_AVG, seed);
    return pick(deepRun ? END_AVG_GREAT : END_POOR_SURPRISE, seed);
  })();

  // One optional flourish, favouring a dominant statistical season, then a big
  // payday when the year was a positive one.
  let flourish = "";
  if (simulation.totalSg >= 2.5) {
    flourish = pick(END_DOMINANT_STAT, flourishSeed);
  } else if (
    simulation.earnings >= 18_000_000 &&
    (deepRun || wins.length > 0)
  ) {
    flourish = pick(END_BIG_MONEY, flourishSeed);
  }

  return [major, primary, flourish].filter(Boolean).join(" ");
}
