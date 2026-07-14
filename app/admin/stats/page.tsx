"use client";

import { useCallback, useEffect, useState } from "react";
import { formatCurrency, formatSg } from "../../lib/format";

const KEY_STORAGE = "strokes-daily-admin-key";

type Mode = "daily" | "classic";

type DailyData = {
  totals: {
    total: number;
    avgCorrect: number | null;
    ballKnowers: number;
    avgWins: number | null;
    avgEarnings: number | null;
  };
  distribution: { score: number; count: number }[];
  byDay: { date: string; count: number; avgCorrect: number | null }[];
  rows: {
    id: number;
    date: string;
    correctCategories: number;
    rating: string | null;
    offTee: number;
    approach: number;
    aroundGreen: number;
    putting: number;
    wins: number;
    earnings: number;
    name: string | null;
    createdAt: string;
  }[];
};

type ClassicData = {
  totals: {
    total: number;
    avgWins: number | null;
    avgMulligans: number | null;
    avgEarnings: number | null;
    avgTotalSg: number | null;
    champions: number;
  };
  byMode: {
    statsMode: string | null;
    yearMode: string | null;
    fieldMode: string | null;
    count: number;
    avgWins: number | null;
  }[];
  rows: {
    id: number;
    offTee: number;
    approach: number;
    aroundGreen: number;
    putting: number;
    totalSg: number;
    wins: number;
    mulligans: number;
    earnings: number;
    fedexRank: number | null;
    statusTier: string | null;
    statsMode: string | null;
    yearMode: string | null;
    fieldMode: string | null;
    years: string | null;
    name: string | null;
    createdAt: string;
  }[];
};

const card: React.CSSProperties = {
  border: "1px solid rgba(128,128,128,0.35)",
  borderRadius: 12,
  padding: "16px 18px",
};

const cell: React.CSSProperties = { padding: "6px 8px" };

function num(value: number | null | undefined, digits = 2) {
  return value === null || value === undefined ? "—" : value.toFixed(digits);
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={card}>
      <div style={{ fontSize: 13, opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

const STATS_LABEL: Record<string, string> = { show: "Show Stats", blind: "Blind" };
const YEAR_LABEL: Record<string, string> = { current: "Current", all: "All Time", filter: "Custom" };
const FIELD_LABEL: Record<string, string> = { entire: "Entire Field", notables: "Notables" };

function label(map: Record<string, string>, key: string | null) {
  if (!key) return "—";
  return map[key] ?? key;
}

export default function StatsAdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [mode, setMode] = useState<Mode>("daily");
  const [dateFilter, setDateFilter] = useState("");
  const [daily, setDaily] = useState<DailyData | null>(null);
  const [classic, setClassic] = useState<ClassicData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem(KEY_STORAGE) ?? "";
    setAdminKey(stored);
    setKeyInput(stored);
  }, []);

  const load = useCallback(async (key: string, activeMode: Mode, date: string) => {
    if (!key) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ mode: activeMode });
      if (activeMode === "daily" && date) params.set("date", date);
      const response = await fetch(`/api/stats?${params.toString()}`, {
        headers: { "x-admin-key": key },
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`);
      if (activeMode === "daily") setDaily(body as DailyData);
      else setClassic(body as ClassicData);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (adminKey) void load(adminKey, mode, dateFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminKey, mode]);

  const saveKey = () => {
    window.localStorage.setItem(KEY_STORAGE, keyInput);
    setAdminKey(keyInput);
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "8px 18px",
    borderRadius: 999,
    border: "1px solid rgba(128,128,128,0.5)",
    background: active ? "rgba(47,143,78,0.18)" : "transparent",
    fontWeight: active ? 700 : 500,
    cursor: "pointer",
  });

  return (
    <main style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 20px 80px" }}>
      <h1 style={{ marginBottom: 4 }}>Strokes Game Stats</h1>
      <p style={{ opacity: 0.7, marginTop: 0 }}>Completion volume and results logged from gameplay.</p>

      <div style={{ display: "flex", gap: 8, margin: "16px 0" }}>
        <button type="button" style={tabStyle(mode === "daily")} onClick={() => setMode("daily")}>
          Daily Challenge
        </button>
        <button type="button" style={tabStyle(mode === "classic")} onClick={() => setMode("classic")}>
          Classic
        </button>
      </div>

      <section
        style={{ ...card, marginBottom: 24, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 240px" }}>
          <span style={{ fontSize: 13, opacity: 0.75 }}>Admin key</span>
          <input
            type="password"
            value={keyInput}
            onChange={(event) => setKeyInput(event.target.value)}
            placeholder="DAILY_ADMIN_SECRET"
            style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(128,128,128,0.5)" }}
          />
        </label>
        {mode === "daily" ? (
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 13, opacity: 0.75 }}>Filter by date (optional)</span>
            <input
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(128,128,128,0.5)" }}
            />
          </label>
        ) : null}
        <button
          type="button"
          onClick={() => {
            saveKey();
            void load(keyInput, mode, dateFilter);
          }}
          style={{ padding: "9px 16px", borderRadius: 8, cursor: "pointer" }}
        >
          {loading ? "Loading…" : "Load stats"}
        </button>
      </section>

      {error ? <p style={{ color: "#c0392b", fontWeight: 600 }}>{error}</p> : null}

      {mode === "daily" && daily ? <DailyView data={daily} showByDay={!dateFilter} /> : null}
      {mode === "classic" && classic ? <ClassicView data={classic} /> : null}
    </main>
  );
}

function DailyView({ data, showByDay }: { data: DailyData; showByDay: boolean }) {
  const { totals } = data;
  const maxDistCount = Math.max(1, ...data.distribution.map((row) => row.count));

  return (
    <>
      <section
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}
      >
        <Stat label="Completions" value={totals.total} />
        <Stat label="Avg correct categories" value={`${num(totals.avgCorrect)} / 4`} />
        <Stat label="Ball Knowers (4/4)" value={totals.ballKnowers} />
        <Stat label="Avg wins" value={num(totals.avgWins)} />
        <Stat
          label="Avg earnings"
          value={totals.avgEarnings === null ? "—" : formatCurrency(Math.round(totals.avgEarnings))}
        />
      </section>

      <section style={{ ...card, marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>Correct-category distribution</h2>
        {[0, 1, 2, 3, 4].map((score) => {
          const count = data.distribution.find((row) => row.score === score)?.count ?? 0;
          const pct = totals.total ? Math.round((count / totals.total) * 100) : 0;
          return (
            <div key={score} style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0" }}>
              <span style={{ width: 34 }}>{score}/4</span>
              <div style={{ flex: 1, background: "rgba(128,128,128,0.2)", borderRadius: 6, height: 18 }}>
                <div
                  style={{
                    width: `${(count / maxDistCount) * 100}%`,
                    background: "#2f8f4e",
                    height: "100%",
                    borderRadius: 6,
                    minWidth: count ? 2 : 0,
                  }}
                />
              </div>
              <span style={{ width: 96, textAlign: "right", fontSize: 13 }}>
                {count} ({pct}%)
              </span>
            </div>
          );
        })}
      </section>

      {showByDay && data.byDay.length ? (
        <section style={{ ...card, marginBottom: 24, overflowX: "auto" }}>
          <h2 style={{ marginTop: 0 }}>By day</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th style={cell}>Date</th>
                <th style={cell}>Completions</th>
                <th style={cell}>Avg correct</th>
              </tr>
            </thead>
            <tbody>
              {data.byDay.map((row) => (
                <tr key={row.date} style={{ borderTop: "1px solid rgba(128,128,128,0.25)" }}>
                  <td style={cell}>{row.date}</td>
                  <td style={cell}>{row.count}</td>
                  <td style={cell}>{num(row.avgCorrect)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <section style={{ ...card, overflowX: "auto" }}>
        <h2 style={{ marginTop: 0 }}>Recent completions</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, whiteSpace: "nowrap" }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th style={cell}>When</th>
              <th style={cell}>Player</th>
              <th style={cell}>Date</th>
              <th style={cell}>Correct</th>
              <th style={cell}>Rating</th>
              <th style={cell}>Off Tee</th>
              <th style={cell}>Approach</th>
              <th style={cell}>Around Grn</th>
              <th style={cell}>Putting</th>
              <th style={cell}>Wins</th>
              <th style={cell}>Earnings</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.id} style={{ borderTop: "1px solid rgba(128,128,128,0.25)" }}>
                <td style={cell}>{row.createdAt}</td>
                <td style={{ ...cell, fontWeight: row.name ? 600 : 400 }}>{row.name || "—"}</td>
                <td style={cell}>{row.date}</td>
                <td style={cell}>{row.correctCategories}/4</td>
                <td style={cell}>{row.rating ?? "—"}</td>
                <td style={cell}>{formatSg(row.offTee)}</td>
                <td style={cell}>{formatSg(row.approach)}</td>
                <td style={cell}>{formatSg(row.aroundGreen)}</td>
                <td style={cell}>{formatSg(row.putting)}</td>
                <td style={cell}>{row.wins}</td>
                <td style={cell}>{formatCurrency(row.earnings)}</td>
              </tr>
            ))}
            {data.rows.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ padding: "12px 8px", opacity: 0.7 }}>
                  No completions logged yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </>
  );
}

function ClassicView({ data }: { data: ClassicData }) {
  const { totals } = data;

  return (
    <>
      <section
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}
      >
        <Stat label="Completions" value={totals.total} />
        <Stat label="FedEx Cup wins (rank 1)" value={totals.champions} />
        <Stat label="Avg wins" value={num(totals.avgWins)} />
        <Stat label="Avg mulligans" value={num(totals.avgMulligans)} />
        <Stat label="Avg total SG" value={num(totals.avgTotalSg)} />
        <Stat
          label="Avg earnings"
          value={totals.avgEarnings === null ? "—" : formatCurrency(Math.round(totals.avgEarnings))}
        />
      </section>

      {data.byMode.length ? (
        <section style={{ ...card, marginBottom: 24, overflowX: "auto" }}>
          <h2 style={{ marginTop: 0 }}>By mode config</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, whiteSpace: "nowrap" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th style={cell}>Stats</th>
                <th style={cell}>Time frame</th>
                <th style={cell}>Field</th>
                <th style={cell}>Completions</th>
                <th style={cell}>Avg wins</th>
              </tr>
            </thead>
            <tbody>
              {data.byMode.map((row, index) => (
                <tr key={index} style={{ borderTop: "1px solid rgba(128,128,128,0.25)" }}>
                  <td style={cell}>{label(STATS_LABEL, row.statsMode)}</td>
                  <td style={cell}>{label(YEAR_LABEL, row.yearMode)}</td>
                  <td style={cell}>{label(FIELD_LABEL, row.fieldMode)}</td>
                  <td style={cell}>{row.count}</td>
                  <td style={cell}>{num(row.avgWins)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <section style={{ ...card, overflowX: "auto" }}>
        <h2 style={{ marginTop: 0 }}>Recent completions</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, whiteSpace: "nowrap" }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th style={cell}>When</th>
              <th style={cell}>Player</th>
              <th style={cell}>FedEx</th>
              <th style={cell}>Outcome</th>
              <th style={cell}>Off Tee</th>
              <th style={cell}>Approach</th>
              <th style={cell}>Around Grn</th>
              <th style={cell}>Putting</th>
              <th style={cell}>Total SG</th>
              <th style={cell}>Wins</th>
              <th style={cell}>Mulls</th>
              <th style={cell}>Earnings</th>
              <th style={cell}>Mode</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.id} style={{ borderTop: "1px solid rgba(128,128,128,0.25)" }}>
                <td style={cell}>{row.createdAt}</td>
                <td style={{ ...cell, fontWeight: row.name ? 600 : 400 }}>{row.name || "—"}</td>
                <td style={cell}>{row.fedexRank ?? "—"}</td>
                <td style={cell}>{row.statusTier ?? "—"}</td>
                <td style={cell}>{formatSg(row.offTee)}</td>
                <td style={cell}>{formatSg(row.approach)}</td>
                <td style={cell}>{formatSg(row.aroundGreen)}</td>
                <td style={cell}>{formatSg(row.putting)}</td>
                <td style={cell}>{formatSg(row.totalSg)}</td>
                <td style={cell}>{row.wins}</td>
                <td style={cell}>{row.mulligans}</td>
                <td style={cell}>{formatCurrency(row.earnings)}</td>
                <td style={cell}>
                  {label(STATS_LABEL, row.statsMode)} · {label(YEAR_LABEL, row.yearMode)}
                  {row.yearMode === "filter" && row.years ? ` (${row.years})` : ""} ·{" "}
                  {label(FIELD_LABEL, row.fieldMode)}
                </td>
              </tr>
            ))}
            {data.rows.length === 0 ? (
              <tr>
                <td colSpan={13} style={{ padding: "12px 8px", opacity: 0.7 }}>
                  No completions logged yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </>
  );
}
