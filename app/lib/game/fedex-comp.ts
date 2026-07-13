import standings from "../data/fedex-2025-standings.json";

export type FedExComp = {
  player: string;
  points: number;
  rank: number;
};

// The final 2025 FedEx Cup regular-season standings, sorted best-to-worst by
// points. Used to give a simulated season a real-world "player comp".
const STANDINGS = standings as FedExComp[];

// Find the 2025 player whose regular-season FedEx Cup points land closest to the
// simulated total, so a run can be framed as "you played like <player> did."
export function closestFedExComp(points: number): FedExComp | null {
  if (STANDINGS.length === 0) return null;
  let best = STANDINGS[0];
  let bestGap = Math.abs(STANDINGS[0].points - points);
  for (const entry of STANDINGS) {
    const gap = Math.abs(entry.points - points);
    if (gap < bestGap) {
      best = entry;
      bestGap = gap;
    }
  }
  return best;
}
