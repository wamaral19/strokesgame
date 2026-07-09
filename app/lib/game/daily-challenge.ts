import schedule from "../../../public/daily-challenges/schedule.json";

export type DailyChallengeMedia =
  | {
      kind: "text";
      title: string;
      body: string;
    }
  | {
      kind: "image";
      title: string;
      src: string;
      alt: string;
      body?: string;
    }
  | {
      kind: "video";
      title: string;
      src: string;
      alt?: string;
      body?: string;
    };

export type DailyChallengeItem = {
  id: string;
  playerId: string;
  media: DailyChallengeMedia;
};

export type DailyChallenge = {
  id: string;
  date: string;
  title: string;
  items: DailyChallengeItem[];
};

export type DailyChallengeRating = "Ball Knower" | "Almost" | "Bleh" | "Trash";

export const DAILY_CHALLENGES = (schedule as DailyChallenge[]).slice().sort((a, b) =>
  a.date.localeCompare(b.date),
);

export function easternDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function getDailyChallenge(dateKey = easternDateKey()) {
  return (
    DAILY_CHALLENGES.find((challenge) => challenge.date === dateKey) ??
    DAILY_CHALLENGES.filter((challenge) => challenge.date < dateKey).at(-1) ??
    DAILY_CHALLENGES[0]
  );
}

export function dailyRating(score: number): DailyChallengeRating {
  if (score === 4) return "Ball Knower";
  if (score === 2) return "Almost";
  if (score === 1) return "Bleh";
  return "Trash";
}
