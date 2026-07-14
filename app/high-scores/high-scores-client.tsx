"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { formatCurrency } from "../lib/format";
import { getDailyChallenge } from "../lib/game/daily-challenge";

type DailyEntry = {
  name: string | null;
  earnings: number;
  wins: number;
  correctCategories: number;
  rating: string | null;
};

type DailyBoard = {
  mode: "daily";
  date: string | null;
  entries: DailyEntry[];
};

type ClassicEntry = {
  name: string | null;
  earnings: number;
  wins: number;
  totalSg: number;
  fedexRank: number | null;
};

type ClassicBucket = {
  statsMode: string;
  yearMode: string;
  fieldMode: string;
  usedMulligans: boolean;
  entries: ClassicEntry[];
};

type ClassicBoard = {
  mode: "classic";
  buckets: ClassicBucket[];
};

const STATS_LABEL: Record<string, string> = {
  show: "Show Stats",
  blind: "Blind",
};
const YEAR_LABEL: Record<string, string> = {
  current: "Current Season",
  all: "All Time",
  filter: "Custom Years",
};
const FIELD_LABEL: Record<string, string> = {
  entire: "Entire Field",
  notables: "Notables",
};

function labelOr(map: Record<string, string>, key: string | null) {
  if (!key) return "—";
  return map[key] ?? key;
}

// A challenge date is stored as YYYY-MM-DD; render it as a friendly label
// without dragging it through a timezone.
function formatDate(date: string | null) {
  if (!date) return "";
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const RANK_LABEL = ["1st", "2nd", "3rd"];

function ScoreRow({
  rank,
  name,
  earnings,
  meta,
}: {
  rank: number;
  name: string | null;
  earnings: number;
  meta: string;
}) {
  return (
    <li className={`score-row score-row--${rank + 1}`}>
      <span className="score-row__rank">{RANK_LABEL[rank] ?? `${rank + 1}th`}</span>
      <span className="score-row__body">
        <span className="score-row__name">{name || "Anonymous"}</span>
        <span className="score-row__meta">{meta}</span>
      </span>
      <span className="score-row__earnings">{formatCurrency(earnings)}</span>
    </li>
  );
}

function Board({ children }: { children: React.ReactNode }) {
  return <ol className="score-board">{children}</ol>;
}

function EmptyBoard() {
  return <p className="score-board__empty">No scores yet — be the first to post one.</p>;
}

export function HighScores() {
  const [tab, setTab] = useState<"daily" | "classic">("daily");
  const [daily, setDaily] = useState<DailyBoard | null>(null);
  const [classic, setClassic] = useState<ClassicBoard | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  // The Daily board refreshes every day, so scope it to the challenge date the
  // game is currently serving (the same date runs are logged under).
  const dailyDate = useMemo(() => getDailyChallenge().date, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    Promise.all([
      fetch(`/api/high-scores?mode=daily&date=${dailyDate}`).then((r) => r.json()),
      fetch(`/api/high-scores?mode=classic`).then((r) => r.json()),
    ])
      .then(([d, c]) => {
        if (cancelled) return;
        if (d?.error || c?.error) {
          setError(true);
        } else {
          setDaily(d as DailyBoard);
          setClassic(c as ClassicBoard);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dailyDate]);

  // Group classic buckets by their config combo so each combo shows its
  // mulligans / no-mulligans boards side by side.
  const classicGroups = useMemo(() => {
    if (!classic) return [];
    const groups = new Map<string, { title: string; buckets: ClassicBucket[] }>();
    for (const bucket of classic.buckets) {
      const key = `${bucket.statsMode}|${bucket.yearMode}|${bucket.fieldMode}`;
      const title = [
        labelOr(STATS_LABEL, bucket.statsMode),
        labelOr(YEAR_LABEL, bucket.yearMode),
        labelOr(FIELD_LABEL, bucket.fieldMode),
      ].join(" · ");
      let group = groups.get(key);
      if (!group) {
        group = { title, buckets: [] };
        groups.set(key, group);
      }
      group.buckets.push(bucket);
    }
    // Order each group's boards No Mulligans first, then Mulligans.
    for (const group of groups.values()) {
      group.buckets.sort((a, b) => Number(a.usedMulligans) - Number(b.usedMulligans));
    }
    return [...groups.values()];
  }, [classic]);

  return (
    <section className="high-scores">
      <div className="high-scores__head">
        <span className="eyebrow">All Time High Scores</span>
        <h1>The leaderboard.</h1>
        <p>Ranked by simulated season earnings. Only the top three make each board.</p>
      </div>

      <div className="high-scores__tabs" role="tablist" aria-label="Leaderboard game mode">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "daily"}
          className={`high-scores__tab ${tab === "daily" ? "is-active" : ""}`}
          onClick={() => setTab("daily")}
        >
          Daily Challenge
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "classic"}
          className={`high-scores__tab ${tab === "classic" ? "is-active" : ""}`}
          onClick={() => setTab("classic")}
        >
          Classic
        </button>
      </div>

      {loading ? (
        <p className="high-scores__status">Loading the leaderboard…</p>
      ) : error ? (
        <p className="high-scores__status">Couldn&apos;t load the leaderboard. Try again shortly.</p>
      ) : tab === "daily" ? (
        <div className="high-scores__panel">
          <div className="score-group">
            <div className="score-group__head">
              <h2>Today&apos;s Challenge</h2>
              <span className="pill">Resets daily{daily?.date ? ` · ${formatDate(daily.date)}` : ""}</span>
            </div>
            {daily && daily.entries.length > 0 ? (
              <Board>
                {daily.entries.map((entry, index) => (
                  <ScoreRow
                    key={index}
                    rank={index}
                    name={entry.name}
                    earnings={entry.earnings}
                    meta={`${entry.correctCategories}/4 ideal · ${entry.wins} ${
                      entry.wins === 1 ? "win" : "wins"
                    }`}
                  />
                ))}
              </Board>
            ) : (
              <EmptyBoard />
            )}
          </div>
        </div>
      ) : (
        <div className="high-scores__panel">
          {classicGroups.length === 0 ? (
            <EmptyBoard />
          ) : (
            classicGroups.map((group) => (
              <div className="score-group" key={group.title}>
                <div className="score-group__head">
                  <h2>{group.title}</h2>
                </div>
                <div className="score-group__boards">
                  {group.buckets.map((bucket) => (
                    <div
                      className="score-subboard"
                      key={`${group.title}-${bucket.usedMulligans}`}
                    >
                      <span className="score-subboard__label">
                        {bucket.usedMulligans ? "Mulligans" : "No Mulligans"}
                      </span>
                      {bucket.entries.length > 0 ? (
                        <Board>
                          {bucket.entries.map((entry, index) => (
                            <ScoreRow
                              key={index}
                              rank={index}
                              name={entry.name}
                              earnings={entry.earnings}
                              meta={`${entry.wins} ${entry.wins === 1 ? "win" : "wins"}${
                                entry.fedexRank ? ` · FedEx No. ${entry.fedexRank}` : ""
                              }`}
                            />
                          ))}
                        </Board>
                      ) : (
                        <EmptyBoard />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <Link className="ghost-button high-scores__back" href="/">
        Back to the Game
      </Link>
    </section>
  );
}
