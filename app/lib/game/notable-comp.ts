import { CATEGORY_ORDER } from "./categories";
import { NOTABLE_PLAYER_IDS } from "./notable-players";
import type { PlayerSeason } from "./types";

export type NotableSeasonComp = {
  player: string;
  year: number;
  totalSg: number;
};

// A season's total strokes gained: the sum of its four category values.
function seasonTotalSg(season: PlayerSeason): number {
  return CATEGORY_ORDER.reduce((sum, category) => sum + season.sg[category], 0);
}

// The notable-player season whose full-season total strokes gained lands closest
// to a run's total — the Daily Challenge "player comp." Frames a daily build as
// "you gained strokes like <player>'s <year> season."
export function closestNotableSeasonComp(
  seasons: PlayerSeason[],
  totalSg: number,
): NotableSeasonComp | null {
  const notables = seasons.filter((season) => NOTABLE_PLAYER_IDS.has(season.playerId));
  if (notables.length === 0) return null;
  let best = notables[0];
  let bestGap = Math.abs(seasonTotalSg(best) - totalSg);
  for (const season of notables) {
    const gap = Math.abs(seasonTotalSg(season) - totalSg);
    if (gap < bestGap) {
      best = season;
      bestGap = gap;
    }
  }
  return {
    player: best.player,
    year: best.year,
    totalSg: Number(seasonTotalSg(best).toFixed(2)),
  };
}
