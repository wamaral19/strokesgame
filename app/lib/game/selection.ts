import type { PlayerSeason } from "./types";

export function getRandomSeason(seasons: PlayerSeason[], excludedIds: Set<string>) {
  // Resample until the current run gets a season it has not already revealed.
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = seasons[Math.floor(Math.random() * seasons.length)];
    if (!excludedIds.has(candidate.id)) return candidate;
  }

  // The fallback is here for completeness; a four-card game should never reach
  // it, but future larger modes can still fail gracefully.
  return seasons.find((season) => !excludedIds.has(season.id)) ?? seasons[0];
}

export function getRandomPlayerSeason(seasons: PlayerSeason[], excludedIds: Set<string>) {
  const eligibleGroups = seasons.reduce((groups, season) => {
    const current = groups.get(season.player) ?? [];
    current.push(season);
    groups.set(season.player, current);
    return groups;
  }, new Map<string, PlayerSeason[]>());
  const eligiblePlayers = Array.from(eligibleGroups.keys());
  const availablePlayers = eligiblePlayers.filter((player) =>
    (eligibleGroups.get(player) ?? []).some((season) => !excludedIds.has(season.id)),
  );
  const player =
    availablePlayers[Math.floor(Math.random() * availablePlayers.length)] ?? eligiblePlayers[0];
  const playerSeasons = (eligibleGroups.get(player) ?? seasons).filter(
    (season) => !excludedIds.has(season.id),
  );
  const season =
    playerSeasons[Math.floor(Math.random() * playerSeasons.length)] ??
    getRandomSeason(seasons, excludedIds);
  return { player, season, years: playerSeasons.map((item) => item.year) };
}
