import type { CategoryKey } from "./types";

// Editable copy bank for season outcomes. Each pool merges the "Copy" and
// "Alternate" lines from copy/pga-tour-game-scenario-copy.md; the simulation
// picks one deterministically from the season seed so a given run always
// narrates the same way while different runs vary. Placeholders (<major>,
// <tournament>, <category>) are substituted via fill().
//
// Because the game is a single season / single round with no prior-season
// history, baseline-dependent scenarios from the copy bank (Breakout Season,
// Career Year) are intentionally omitted, as are Final-Round Charge/Fade
// (there is no intra-event round data to detect them).

export function pick<T>(pool: readonly T[], seed: number): T {
  return pool[Math.abs(seed) % pool.length];
}

export function fill(text: string, vars: Record<string, string>): string {
  return text.replace(/<(\w+)>/g, (match, key: string) => vars[key] ?? match);
}

// Joins names into a natural-language list: "a", "a and b", "a, b, and c".
export function formatList(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

// The regular-season templates supply their own article ("the <tournament>"),
// so strip a leading "The " from event names ("The Players Championship") to
// avoid "the The Players Championship". Major templates name majors in full and
// do not use this.
export function tournamentPhrase(name: string): string {
  return name.replace(/^The\s+/, "");
}

// Natural-language phrase for a category, used to fill <category> placeholders.
export const CATEGORY_PHRASE: Record<CategoryKey, string> = {
  offTee: "the driver",
  approach: "the irons",
  aroundGreen: "the short game",
  putting: "the putter",
};

// ---------------------------------------------------------------------------
// Regular season — rank tiers (the "rest" of the recap after any win lead)
// ---------------------------------------------------------------------------

export const REG_TOP5 = [
  "A monster regular season lands you among the very top seeds heading into the FedEx Cup Playoffs. Expectations are high.",
  "You did not sneak into the postseason. You kicked the door in. A top-five regular season means the whole Tour knows you are dangerous.",
  "That is the kind of regular season that changes the way people talk about you. Now comes the hard part: making it hold up in August.",
] as const;

export const REG_TOP10 = [
  "You spent the regular season living near the top of leaderboards. You have done enough to matter. Now you need three good weeks to turn a great year into a famous one.",
  "Top 10 in the standings is not an accident. You built a season with real weight behind it, and the playoffs are ready to test it.",
] as const;

export const REG_TOP30 = [
  "You are safely inside the group everyone is chasing. No panic, no miracle needed. Just keep the good golf from turning into nervous golf.",
  "You enter the playoffs in real position, not just with hope. A few sharp rounds could make this season look much bigger than it did in June.",
] as const;

// 31–60: no dedicated band in the copy bank, so borrow the "Quietly Solid
// Season" lines, which fit a mid-pack playoff entry.
export const REG_MID = [
  "No fireworks, not much drama, just enough good golf to keep moving. There are worse ways to arrive in the playoffs.",
  "This was not a season built for posters, but it was built well enough to last. You are still here.",
] as const;

export const REG_BUBBLE = [
  "You made it to the postseason with almost no room to spare. It does not have to be pretty, but it does have to be better from here.",
  "That was a tense way to get in, but you are in. The scorecard does not ask how comfortable you were.",
] as const;

export const REG_MISSED = [
  "The regular season never quite gave you enough. There were flashes, but the playoffs needed more than flashes.",
  "You had your moments, but not enough of them stacked together. The FedEx Cup moves on without you this time.",
] as const;

// ---------------------------------------------------------------------------
// Regular season — win / no-win leads (prepended to the rank tier)
// ---------------------------------------------------------------------------

// Multi-win season (2 wins) with no majors or Players Championship among the
// trophies: describe it generically as a multi-win season, without naming the
// individual regular-season events.
export const REG_MULTI_WIN = [
  "A multi-win season. Winning more than once before the postseason is a statement, and you made it twice.",
  "Two trophies before the playoffs even start. Nobody gets to call this a fluke.",
] as const;

// Multi-win season (2 wins) that includes at least one major or the Players
// Championship. Fills <events> with the marquee wins, named in full.
export const REG_MULTI_WIN_MARQUEE = [
  "You did not just win, you won where it counts: <events>. A multi-win season with hardware like that travels forever.",
  "Two trophies, and the right ones — <events>. Nobody gets to call this a fluke.",
] as const;

// Historically strong season (3–7 wins) with no majors or Players win to name.
// Fills <count> with the spelled-out win total.
export const REG_HISTORIC = [
  "<count> wins in a single season. There is no soft way to say it: this was a historically strong year.",
  "A historically strong season with <count> trophies. Runs like this rewrite reputations.",
] as const;

// Historically strong season (3–7 wins) headlined by at least one major or the
// Players. Fills <count> with the win total and <events> with the marquee wins.
export const REG_HISTORIC_MARQUEE = [
  "<count> wins in a single season, headlined by <events> — a historically strong year that does not come around often.",
  "A historically strong season: <count> trophies, including <events>. People are going to remember this one.",
] as const;

// 8+ wins. A single fixed line — the most dominant seasons do not need variety.
export const REG_HALL_OF_FAME = [
  "Welcome to the Hall of Fame. When they talk about the most dominant seasons it's either you or Tiger in 2000. We're taking You vs The Field.",
] as const;

// Fills <tournament> with the win.
export const REG_WIN_OUTSIDE = [
  "Four great days at the <tournament> can cover an otherwise okay season. Get hot now and it can still be a great one.",
  "The season was uneven, but the trophy at the <tournament> changes the conversation. Now prove it can travel.",
] as const;

// Fills <tournament> with the win.
export const REG_SINGLE_WIN = [
  "You got it done at the <tournament>. A win changes the whole season.",
  "The <tournament> belongs on the resume now. Nobody can take the trophy back.",
] as const;

// Fills <tournament> with the win.
export const REG_FEAST_FAMINE = [
  "The <tournament> showed how good it gets; the missed cuts showed the other side. The playoffs decide which version packed the clubs.",
  "A highlight reel headlined by the <tournament>, plus a few pages to skip. Volatility can win or send you home.",
] as const;

// No-win, at least one top-three finish, missed the playoffs. Fills <tournament>.
export const REG_NO_WIN_TOP3_OUTSIDE = [
  "A couple of lip-ins instead of lip-outs and you would not have to sweat next year at all, but the breaks did not go your way at the <tournament>.",
  "The <tournament> showed what was possible, then the rest of the year showed how thin the margin can be. Close was not quite enough.",
] as const;

// Fills <tournament> with the player's best finish (the runner-up event).
export const REG_NO_WIN_RUNNER_UP = [
  "You almost got in the win column at the <tournament>. A runner-up still gives you a chance.",
  "No trophy, but the <tournament> got you close enough to feel the heat. Don't melt in the playoffs.",
] as const;

// Fills <tournament> with the player's best finish.
export const REG_CONSISTENT_TOP10 = [
  "You kept finding the first page of the leaderboard, the <tournament> included, but never the last handshake. The floor is real.",
  "Plenty to like in a season full of top 10s like the <tournament>. The empty win column still bothers you.",
] as const;

export const REG_STAT_MONSTER = [
  "The numbers say you played like someone who should have won. Golf, being golf, did not bother to agree. The playoffs owe you nothing, but you are due a run.",
  "Your strokes gained profile looks better than your trophy case. That can be frustrating. It can also be a warning sign for everyone else.",
] as const;

export const REG_BAD_STATS_GOOD = [
  "The stat sheet is not exactly glowing, but the standings still count. You got enough out of the season. Now you need the golf to catch up with the results.",
  "It was not always convincing, but it worked. The playoffs are less patient with magic tricks.",
] as const;

// ---------------------------------------------------------------------------
// Majors (woven into the final recap). All fill <major>.
// ---------------------------------------------------------------------------

export const MAJOR_WON = [
  "You won <major>. You are going down in the history books — you won one of the ones that really count.",
  "There are wins, and then there are wins with their own Wikipedia pages. <major> changed your career.",
] as const;

export const MAJOR_RUNNER_UP = [
  "You were one step from forever at <major>. That one is going to replay in your head, but it also proves the stage is not too big.",
  "Second at <major> hurts because it should. It also means you were close enough to make everyone nervous.",
] as const;

export const MAJOR_TOP10 = [
  "At <major>, where it mattered most, you showed up. Your major grid is getting a bit of color.",
  "A top 10 at <major> travels well. That is the kind of week that makes a season feel sturdier.",
] as const;

export const MAJOR_STRONG = [
  "The majors kept finding your name in respectable places. That is not a trophy, but it is not nothing.",
  "Across the biggest weeks, you looked like you belonged.",
] as const;

// ---------------------------------------------------------------------------
// Playoffs — stage outcomes
// ---------------------------------------------------------------------------

export const PO_ADVANCED_BMW = [
  "You made it through the first checkpoint. The field is smaller, the points are louder, and every loose swing gets more expensive.",
  "Round one is handled. Now the season gets sharper, and so does the math.",
] as const;

export const PO_ADVANCED_TC = [
  "You are going to East Lake. That means the season is officially more than solid. Now it is a chance at the whole thing.",
  "Top 30 gets you into the room where the FedEx Cup is decided. You earned the invite. Now earn the noise.",
] as const;

export const PO_ELIM_FIRST = [
  "The postseason did not last long enough. You had a seat at the table, but the first event took it back.",
  "One playoff week was all you got. That is a hard stop after a long season.",
] as const;

export const PO_ELIM_BEFORE_TC = [
  "You got through one gate but not the last one. East Lake was close enough to picture and too far away to touch.",
  "The season ends one step before the finale. Good year, tough exit.",
] as const;

export const PO_WON_FIRST = [
  "That is how you start a postseason. One week in, and you have made the bracket feel like it belongs to you.",
  "Opening the playoffs with a win changes everything. The points jump, the confidence jumps, and so does everyone else's blood pressure.",
] as const;

export const PO_WON_BMW = [
  "You won the event that sends people to East Lake with real belief. That is not momentum. That is a warning.",
  "The BMW Championship is a very good time to look like the best player in the field.",
] as const;

export const PO_WON_TC = [
  "You saved the best week for the last week. That is as clean as a season ending gets.",
  "The finale asked for your best and you brought it. Nobody gets to rewrite that ending.",
] as const;

export const PO_LOST_AS_FAVORITE = [
  "You arrived with the best seat in the house and still watched someone else lift the trophy. That one will sting.",
  "Starting position gave you the advantage. The final week took it away.",
] as const;

// ---------------------------------------------------------------------------
// Playoff strokes gained variance (per-event note). The dedicated category
// pools cover the ">1 stroke better/worse" cases; the run-relative pools cover
// carries / sinks / balanced. Fills <category> where noted.
// ---------------------------------------------------------------------------

export const SG_BETTER: Record<CategoryKey, readonly string[]> = {
  offTee: [
    "You hit it better than normal when it mattered most. Your swing coach might deserve a bonus.",
    "The driver showed up with playoff confidence. Fairways felt wider than they had any right to feel.",
  ],
  approach: [
    "You hit your irons better than normal when it mattered most. Your swing coach might deserve a bonus.",
    "The iron play got sharp at exactly the right time. You were not chasing pins. You were bothering them.",
  ],
  aroundGreen: [
    "Your hands made you some money.",
    "The short game kept rescuing rounds before they turned into problems. That is how playoff checks get bigger.",
  ],
  putting: [
    "I guess that is why they call it the green. You earned a lot of green by rolling the rock.",
    "The putter got hot and the season got very interested. Funny how that works.",
  ],
};

export const SG_WORSE: Record<CategoryKey, readonly string[]> = {
  offTee: [
    "Your driver let you down when it mattered.",
    "Too many playoff holes started from the wrong places. That is a hard way to build a score.",
  ],
  approach: [
    "Your irons let you down when it mattered.",
    "The approach game never quite found the window. In the playoffs, missed chances have a way of getting loud.",
  ],
  aroundGreen: [
    "Your chipping let you down when it mattered.",
    "The short game could not patch the leaks this time. Saves turned into stress, and stress turned into numbers.",
  ],
  putting: [
    "Your putting let you down when it mattered.",
    "You hit enough shots to have a better week, but the putter kept refusing the invitation.",
  ],
};

export const SG_BALANCED = [
  "No single part of the bag carried you, and no single part wrecked you. Sometimes the playoffs are just about whether the whole thing holds together.",
  "A balanced week. No fireworks from one category, no disaster from another. Just the full bag trying to survive.",
] as const;

export const SG_ONE_CARRIES = [
  "The whole week had a lead actor, and it was <category>. When the rest of the game got shaky, that part kept answering.",
  "You rode <category> as far as it would take you.",
] as const;

export const SG_ONE_SINKS = [
  "The difference was hiding in <category>. Bad week for that part to disappear.",
  "You can survive a lot in the playoffs. Not when <category> gives shots back.",
] as const;

// ---------------------------------------------------------------------------
// Composite endings (final recap)
// ---------------------------------------------------------------------------

export const END_GREAT_GREAT = [
  "This was the full-season version. You built the position, protected it, and still had enough left when the field got smaller.",
  "Some seasons look good in pieces. This one looks good from far away too.",
] as const;

export const END_GREAT_BAD = [
  "The regular season was too good to ignore, but the ending came too fast. That is the problem with playoff golf: it edits the story aggressively.",
  "You did the long part right and the short part wrong. Unfortunately, the short part gets the final word.",
] as const;

export const END_AVG_GREAT = [
  "The regular season did not shout your name. The playoffs did. Timing can make a season look completely different.",
  "You were fine for months, then dangerous when it mattered. Nobody complains about peaking late.",
] as const;

export const END_AVG_AVG = [
  "This was a professional season. Not a disaster, not a breakthrough, just enough good golf to keep the lights on.",
  "You were in the mix, but never really in control of it. Some years are like that.",
] as const;

export const END_POOR_SURPRISE = [
  "Most of the year was a grind, but you found one playoff moment worth saving. Sometimes that is enough to keep the offseason from feeling too long.",
  "It was not a great season, but it was not empty either. That late spark gives you something to carry forward.",
] as const;

export const END_MISSED_BUT_WON = [
  "A win should make a season feel secure. This one did not. The trophy is real, but so is the missed postseason.",
  "You got the best Sunday feeling in golf and still ran out of season. That is a strange little line on the resume.",
] as const;

export const END_NOWIN_DEEP = [
  "You never got the regular season trophy, but you kept giving yourself chances until the season became serious.",
  "Winning is the cleanest proof. A deep playoff run is not bad evidence either.",
] as const;

export const END_BIG_MONEY = [
  "The leaderboard was nice. The direct deposit was nicer. You made the season pay off.",
  "That is a lot of green for a few very stressful rounds of golf.",
] as const;

export const END_NARROW_MISS = [
  "One shot here, one better bounce there, and this season reads completely differently. Golf loves making math feel personal.",
  "You were close enough that it is almost worse. Almost does not advance, but it does linger.",
] as const;

export const END_DOMINANT_STAT = [
  "The numbers were not subtle. Tee to green, green to cup, week to week, you played like one of the best players alive.",
  "There are seasons where the stats need explaining. This was not one of them.",
] as const;

export const END_SCRAPPY = [
  "This was not elegant, but it survived. Sometimes the season is less about style and more about refusing to leave.",
  "You kept finding just enough. That can be annoying for everyone else, which is part of the charm.",
] as const;

// Missed the playoffs with no win to show for it — no dedicated copy-bank
// scenario, so a plain grind close-out for the final recap.
export const END_MISSED_NO_WIN = [
  "No trophy and no postseason — this one was all grind with not quite enough to show for it. Regroup and go get it next year.",
  "The season never found the gear it needed. Plenty of golf, just not enough of it at the right moments.",
] as const;
