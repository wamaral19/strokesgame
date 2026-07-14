import standings from "../data/fedex-2025-standings.json";

export type FedExComp = {
  player: string;
  points: number;
  rank: number;
};

// The final 2025 FedEx Cup standings, sorted best-to-worst by points. Used to
// give a simulated season a real-world "player comp".
const STANDINGS = standings as FedExComp[];

// The 2025 player who finished at the same FedEx Cup position as this run, so a
// season can be framed as "you finished where <player> did." Comps by finishing
// position rather than raw points.
export function fedExCompByRank(rank: number): FedExComp | null {
  if (STANDINGS.length === 0) return null;
  return STANDINGS.find((entry) => entry.rank === rank) ?? null;
}
