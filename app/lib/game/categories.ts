import type { CategoryKey } from "./types";

export const CATEGORY_ORDER: CategoryKey[] = [
  "offTee",
  "approach",
  "aroundGreen",
  "putting",
];

export const CATEGORY_META: Record<
  CategoryKey,
  { label: string; shortLabel: string; statLabel: string; hint: string }
> = {
  offTee: {
    label: "Off the Tee",
    shortLabel: "OTT",
    statLabel: "SG: Off the Tee",
    hint: "Driver, distance, and control",
  },
  approach: {
    label: "Approach",
    shortLabel: "APP",
    statLabel: "SG: Approach",
    hint: "Iron play into greens",
  },
  aroundGreen: {
    label: "Around Green",
    shortLabel: "ARG",
    statLabel: "SG: Around the Green",
    hint: "Recovery and touch",
  },
  putting: {
    label: "Putting",
    shortLabel: "PUTT",
    statLabel: "SG: Putting",
    hint: "The flatstick",
  },
};
