export type CategoryKey = "offTee" | "approach" | "aroundGreen" | "putting";

export type PlayerSeason = {
  id: string;
  playerId: string;
  player: string;
  year: number;
  sg: Record<CategoryKey, number>;
};

export type SlotAssignment = {
  category: CategoryKey;
  season: PlayerSeason;
};

export type EventKind = "regular" | "signature" | "major" | "players" | "playoff";

export type ScheduleEvent = {
  id: string;
  name: string;
  kind: EventKind;
  purse: number;
  fedExBase: number;
  fieldStrength: number;
  volatility: number;
  // Number of players in the field. Optional; defaults are inferred from kind
  // (signature ~72, full-field ~78). Playoff events set this explicitly because
  // the fields shrink to 70 / 50 / 30.
  fieldSize?: number;
};

export type EventResult = {
  event: ScheduleEvent;
  strokes: number;
  position: number;
  madeCut: boolean;
  fedExPoints: number;
  earnings: number;
};

// One category's result for a single playoff event. `mean` is the player's
// season-long SG for that category (their "average"); `weekValue` is what they
// actually posted that week. `above` drives the green/red colour coding.
export type CategoryBreakdown = {
  category: CategoryKey;
  mean: number;
  weekValue: number;
  delta: number;
  above: boolean;
};

export type StageWriteup = {
  label: string;
  headline: string;
  detail: string;
};

// The regular season, resolved as a single block before the playoffs reveal.
export type RegularSeasonSummary = {
  points: number;
  rank: number;
  earnings: number;
  wins: number;
  madePlayoffs: boolean;
  writeup: StageWriteup;
};

// One playoff event, revealed tournament-by-tournament. The four category
// breakdowns spin in first and build to `weekSg`, which sets the finish, the
// FedEx points, and the move from `rankBefore` to `rankAfter`.
export type PlayoffStageResult = {
  event: ScheduleEvent;
  categories: CategoryBreakdown[];
  weekSg: number;
  position: number;
  fedExPoints: number;
  earnings: number;
  rankBefore: number;
  rankAfter: number;
  isFinale: boolean;
  advanced: boolean;
  writeup: StageWriteup;
  // A one-line flavor note describing which part of the bag ran hot or cold
  // this week, derived from the category breakdown deltas.
  sgNote: string;
};

export type SeasonSimulation = {
  seed: number;
  totalSg: number;
  averageFinish: number;
  fedExPoints: number;
  fedExRank: number;
  regularSeasonFedExRank: number;
  status: {
    label: string;
    headline: string;
    detail: string;
    tier: string;
  };
  earnings: number;
  results: EventResult[];
  regularSeason: RegularSeasonSummary;
  playoffStages: PlayoffStageResult[];
};
