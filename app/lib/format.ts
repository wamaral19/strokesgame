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

export function positionLabel(position: number) {
  if (position === 1) return "Win";
  return `T${position}`;
}

const WIN_FLEX_LINES = [
  "Double meat and guac at Chipotle? Yeah, that's not a problem.",
  "Go ahead and leave the courtesy car with the valet. You've earned it.",
  "Buying a round for the whole locker room? Barely dents the checkbook.",
  "First class home instead of the red-eye in coach. Money's not the issue anymore.",
];

export function seasonBlurb(simulation: SeasonSimulation) {
  const wins = simulation.results.filter((result) => result.position === 1);

  // Rank-based tail describing how the overall season shook out.
  const rankTail =
    simulation.fedExRank <= 5
      ? "Add it up and this was the real deal, a season-long run at the Cup."
      : simulation.fedExRank <= 30
        ? "You did plenty to reach East Lake and hang around the FedEx Cup chatter all summer."
        : simulation.fedExRank <= 70
          ? "Playoff-caliber stuff, just not quite enough juice to scare the top of the leaderboard."
          : simulation.fedExRank <= 100
            ? "It kept your card safe, even if the season never really cracked the playoff race."
            : "It wasn't enough to lock down full status, though, so it was a bumpy year despite the odd bright spot.";

  if (wins.length === 0) {
    return `You never got your hands on a trophy, so this one was all grind and week-to-week consistency. ${rankTail}`;
  }

  const majorWin = wins.find((result) => result.event.kind === "major");
  const bigWin = wins.find(
    (result) =>
      result.event.kind === "players" ||
      result.event.kind === "signature" ||
      result.event.kind === "playoff",
  );
  const otherWins = wins.length - 1;

  // A major rewrites the whole season. Even a pile of missed cuts around it
  // still adds up to a career year, so it gets its own call-out with no
  // FedEx-rank caveats attached.
  if (majorWin) {
    if (simulation.fedExRank > 70) {
      return `You won ${majorWin.event.name}. You're going down in the history books, and you could have missed the cut every other week and still called it a career year.`;
    }
    const extra =
      otherWins > 0
        ? ` Stack ${otherWins} more win${otherWins > 1 ? "s" : ""} on top of it and it's an all-timer of a season.`
        : " Everything else this year was just gravy on top.";
    return `You won ${majorWin.event.name}. You're going down in the history books.${extra}`;
  }

  // The Players, a Signature Event, or a playoff event: not the history books,
  // but a monster payday worth leaning into.
  if (bigWin) {
    if (wins.length === 1) {
      return `You won ${bigWin.event.name}, one of the fattest purses on tour. That's generational-wealth money for a single week's work. ${rankTail}`;
    }
    return `You won ${wins.length} times, headlined by ${bigWin.event.name}, and cashed some of the biggest checks of the year. The accountant is very happy. ${rankTail}`;
  }

  // Regular-event wins only: one hot week that carried the season.
  const flex =
    wins.length >= 3
      ? "We don't fly commercial anymore."
      : wins.length === 2
        ? "Tiger would consider it a good month. Most would consider it a good career."
        : WIN_FLEX_LINES[simulation.earnings % WIN_FLEX_LINES.length];
  const winText =
    wins.length === 1
      ? `You won ${wins[0].event.name}, and that one week saved the season all by itself.`
      : `You racked up ${wins.length} wins, including ${wins
          .slice(0, 2)
          .map((result) => result.event.name)
          .join(" and ")}.`;
  return `${winText} ${flex} ${rankTail}`;
}
