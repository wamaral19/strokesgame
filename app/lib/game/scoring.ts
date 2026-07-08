import { CATEGORY_ORDER } from "./categories";
import type { CategoryKey, PlayerSeason, SlotAssignment } from "./types";

export function buildSeed(assignments: SlotAssignment[]) {
  // Convert the four selected player seasons into a deterministic seed so the
  // completed card always maps to the same simulated premium schedule.
  return assignments
    .map((assignment) => `${assignment.category}:${assignment.season.id}`)
    .join("|")
    .split("")
    .reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619), 2166136261);
}

export function totalSelectedSg(assignments: SlotAssignment[]) {
  return assignments.reduce(
    (sum, assignment) => sum + assignment.season.sg[assignment.category],
    0,
  );
}

// Collapse the four locked assignments into the per-category SG means the
// simulation samples around. Any category the player has not yet filled defaults
// to 0 so the map is always complete.
export function categorySgFromAssignments(
  assignments: SlotAssignment[],
): Record<CategoryKey, number> {
  const map: Record<CategoryKey, number> = {
    offTee: 0,
    approach: 0,
    aroundGreen: 0,
    putting: 0,
  };
  assignments.forEach((assignment) => {
    map[assignment.category] = assignment.season.sg[assignment.category];
  });
  return map;
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  const result: T[][] = [];
  items.forEach((item, index) => {
    const rest = [...items.slice(0, index), ...items.slice(index + 1)];
    for (const perm of permutations(rest)) {
      result.push([item, ...perm]);
    }
  });
  return result;
}

// Given the four selected seasons, find the one-to-one player→category
// arrangement that maximizes total Strokes Gained (a 4×4 assignment problem,
// brute-forced over the 24 permutations). Returns each season's ideal category.
export function optimalCategoryBySeason(
  seasons: PlayerSeason[],
): Map<string, CategoryKey> {
  const ideal = new Map<string, CategoryKey>();
  if (seasons.length !== CATEGORY_ORDER.length) return ideal;

  let bestTotal = -Infinity;
  let bestOrder = CATEGORY_ORDER;
  for (const order of permutations(CATEGORY_ORDER)) {
    const total = seasons.reduce(
      (sum, season, index) => sum + season.sg[order[index]],
      0,
    );
    if (total > bestTotal) {
      bestTotal = total;
      bestOrder = order;
    }
  }

  seasons.forEach((season, index) => ideal.set(season.id, bestOrder[index]));
  return ideal;
}
