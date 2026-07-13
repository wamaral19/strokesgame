"use client";

import { useCallback, useEffect, useState } from "react";
import { formatCurrency, formatSg } from "../../lib/format";

const KEY_STORAGE = "strokes-daily-admin-key";

type Totals = {
  total: number;
  avgCorrect: number | null;
  ballKnowers: number;
  avgWins: number | null;
  avgEarnings: number | null;
};

type DistributionRow = { score: number; count: number };
type ByDayRow = { date: string; count: number; avgCorrect: number | null };
type CompletionRow = {
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
  createdAt: string;
};

type StatsResponse = {
  totals: Totals;
  distribution: DistributionRow[];
  byDay: ByDayRow[];
  rows: CompletionRow[];
};

const card: React.CSSProperties = {
  border: "1px solid rgba(128,128,128,0.35)",
  borderRadius: 12,
  padding: "16px 18px",
};

function num(value: number | null, digits = 2) {
  return value === null || value === undefined ? "—" : value.toFixed(digits);
}

export default function DailyStatsAdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem(KEY_STORAGE) ?? "";
    setAdminKey(stored);
    setKeyInput(stored);
  }, []);

  const load = useCallback(
    async (key: string, date: string) => {
      if (!key) return;
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (date) params.set("date", date);
        const query = params.toString();
        const response = await fetch(`/api/daily-stats${query ? `?${query}` : ""}`, {
          headers: { "x-admin-key": key },
        });
        const body = (await response.json()) as StatsResponse & { error?: string };
        if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`);
        setData(body);
      } catch (caught) {
        setData(null);
        setError(caught instanceof Error ? caught.message : String(caught));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (adminKey) void load(adminKey, dateFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminKey]);

  const saveKey = () => {
    window.localStorage.setItem(KEY_STORAGE, keyInput);
    setAdminKey(keyInput);
  };

  const totals = data?.totals;
  const maxDistCount = Math.max(1, ...(data?.distribution ?? []).map((row) => row.count));

  return (
    <main style={{ maxWidth: 1040, margin: "0 auto", padding: "32px 20px 80px" }}>
      <h1 style={{ marginBottom: 4 }}>Daily Challenge Stats</h1>
      <p style={{ opacity: 0.7, marginTop: 0 }}>
        Completion volume and results logged from the Daily Challenge.
      </p>

      <section style={{ ...card, marginBottom: 24, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
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
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, opacity: 0.75 }}>Filter by date (optional)</span>
          <input
            type="date"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
            style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(128,128,128,0.5)" }}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            saveKey();
            void load(keyInput, dateFilter);
          }}
          style={{ padding: "9px 16px", borderRadius: 8, cursor: "pointer" }}
        >
          {loading ? "Loading…" : "Load stats"}
        </button>
      </section>

      {error ? (
        <p style={{ color: "#c0392b", fontWeight: 600 }}>{error}</p>
      ) : null}

      {totals ? (
        <>
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 12,
              marginBottom: 24,
            }}
          >
            <div style={card}>
              <div style={{ fontSize: 13, opacity: 0.7 }}>Completions</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{totals.total}</div>
            </div>
            <div style={card}>
              <div style={{ fontSize: 13, opacity: 0.7 }}>Avg correct categories</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{num(totals.avgCorrect)} / 4</div>
            </div>
            <div style={card}>
              <div style={{ fontSize: 13, opacity: 0.7 }}>Ball Knowers (4/4)</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{totals.ballKnowers}</div>
            </div>
            <div style={card}>
              <div style={{ fontSize: 13, opacity: 0.7 }}>Avg wins</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{num(totals.avgWins)}</div>
            </div>
            <div style={card}>
              <div style={{ fontSize: 13, opacity: 0.7 }}>Avg earnings</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>
                {totals.avgEarnings === null ? "—" : formatCurrency(Math.round(totals.avgEarnings))}
              </div>
            </div>
          </section>

          <section style={{ ...card, marginBottom: 24 }}>
            <h2 style={{ marginTop: 0 }}>Correct-category distribution</h2>
            {[0, 1, 2, 3, 4].map((score) => {
              const count = data?.distribution.find((row) => row.score === score)?.count ?? 0;
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

          {!dateFilter && data?.byDay.length ? (
            <section style={{ ...card, marginBottom: 24, overflowX: "auto" }}>
              <h2 style={{ marginTop: 0 }}>By day</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ textAlign: "left" }}>
                    <th style={{ padding: "6px 8px" }}>Date</th>
                    <th style={{ padding: "6px 8px" }}>Completions</th>
                    <th style={{ padding: "6px 8px" }}>Avg correct</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byDay.map((row) => (
                    <tr key={row.date} style={{ borderTop: "1px solid rgba(128,128,128,0.25)" }}>
                      <td style={{ padding: "6px 8px" }}>{row.date}</td>
                      <td style={{ padding: "6px 8px" }}>{row.count}</td>
                      <td style={{ padding: "6px 8px" }}>{num(row.avgCorrect)}</td>
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
                  <th style={{ padding: "6px 8px" }}>When</th>
                  <th style={{ padding: "6px 8px" }}>Date</th>
                  <th style={{ padding: "6px 8px" }}>Correct</th>
                  <th style={{ padding: "6px 8px" }}>Rating</th>
                  <th style={{ padding: "6px 8px" }}>Off Tee</th>
                  <th style={{ padding: "6px 8px" }}>Approach</th>
                  <th style={{ padding: "6px 8px" }}>Around Grn</th>
                  <th style={{ padding: "6px 8px" }}>Putting</th>
                  <th style={{ padding: "6px 8px" }}>Wins</th>
                  <th style={{ padding: "6px 8px" }}>Earnings</th>
                </tr>
              </thead>
              <tbody>
                {data?.rows.map((row) => (
                  <tr key={row.id} style={{ borderTop: "1px solid rgba(128,128,128,0.25)" }}>
                    <td style={{ padding: "6px 8px" }}>{row.createdAt}</td>
                    <td style={{ padding: "6px 8px" }}>{row.date}</td>
                    <td style={{ padding: "6px 8px" }}>{row.correctCategories}/4</td>
                    <td style={{ padding: "6px 8px" }}>{row.rating ?? "—"}</td>
                    <td style={{ padding: "6px 8px" }}>{formatSg(row.offTee)}</td>
                    <td style={{ padding: "6px 8px" }}>{formatSg(row.approach)}</td>
                    <td style={{ padding: "6px 8px" }}>{formatSg(row.aroundGreen)}</td>
                    <td style={{ padding: "6px 8px" }}>{formatSg(row.putting)}</td>
                    <td style={{ padding: "6px 8px" }}>{row.wins}</td>
                    <td style={{ padding: "6px 8px" }}>{formatCurrency(row.earnings)}</td>
                  </tr>
                ))}
                {data && data.rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: "12px 8px", opacity: 0.7 }}>
                      No completions logged yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>
        </>
      ) : null}
    </main>
  );
}
