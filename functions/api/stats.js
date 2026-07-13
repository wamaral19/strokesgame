// Cloudflare Pages Function: GET /api/stats
//
// Returns aggregate + recent completion data for the admin dashboard. Gated by
// the same shared secret as the daily-challenge admin
// (x-admin-key === DAILY_ADMIN_SECRET).
//
// Requires a D1 binding named `DB` (see functions/schema.sql for setup).
//
// Query params (all optional):
//   mode   "daily" (default) | "classic" — which game mode to report on
//   date   YYYY-MM-DD — daily only: restrict every figure to one challenge date
//   limit  number     — cap on individual rows returned (default 200, max 1000)

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function dailyStats(env, url) {
  const dateParam = url.searchParams.get("date");
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : null;
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 200, 1), 1000);

  const where = date ? "WHERE challenge_date = ?" : "";
  const scope = date ? [date] : [];

  const totals = await env.DB.prepare(
    `SELECT
       COUNT(*)                                                AS total,
       AVG(correct_categories)                                 AS avgCorrect,
       SUM(CASE WHEN correct_categories = 4 THEN 1 ELSE 0 END) AS ballKnowers,
       AVG(wins)                                               AS avgWins,
       AVG(earnings)                                           AS avgEarnings
     FROM daily_completions ${where}`,
  )
    .bind(...scope)
    .first();

  const distribution = await env.DB.prepare(
    `SELECT correct_categories AS score, COUNT(*) AS count
     FROM daily_completions ${where}
     GROUP BY correct_categories
     ORDER BY correct_categories`,
  )
    .bind(...scope)
    .all();

  const byDay = await env.DB.prepare(
    `SELECT challenge_date AS date, COUNT(*) AS count, AVG(correct_categories) AS avgCorrect
     FROM daily_completions ${where}
     GROUP BY challenge_date
     ORDER BY challenge_date DESC
     LIMIT 90`,
  )
    .bind(...scope)
    .all();

  const rows = await env.DB.prepare(
    `SELECT
       id,
       challenge_date     AS date,
       correct_categories AS correctCategories,
       rating,
       sg_off_tee         AS offTee,
       sg_approach        AS approach,
       sg_around_green    AS aroundGreen,
       sg_putting         AS putting,
       wins,
       earnings,
       created_at         AS createdAt
     FROM daily_completions ${where}
     ORDER BY id DESC
     LIMIT ?`,
  )
    .bind(...scope, limit)
    .all();

  return {
    totals,
    distribution: distribution.results ?? [],
    byDay: byDay.results ?? [],
    rows: rows.results ?? [],
  };
}

async function classicStats(env, url) {
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 200, 1), 1000);

  const totals = await env.DB.prepare(
    `SELECT
       COUNT(*)                                       AS total,
       AVG(wins)                                      AS avgWins,
       AVG(earnings)                                  AS avgEarnings,
       AVG(total_sg)                                  AS avgTotalSg,
       SUM(CASE WHEN fedex_rank = 1 THEN 1 ELSE 0 END) AS champions
     FROM classic_completions`,
  ).first();

  const byMode = await env.DB.prepare(
    `SELECT
       stats_mode AS statsMode,
       year_mode  AS yearMode,
       field_mode AS fieldMode,
       COUNT(*)   AS count,
       AVG(wins)  AS avgWins
     FROM classic_completions
     GROUP BY stats_mode, year_mode, field_mode
     ORDER BY count DESC`,
  ).all();

  const rows = await env.DB.prepare(
    `SELECT
       id,
       sg_off_tee      AS offTee,
       sg_approach     AS approach,
       sg_around_green AS aroundGreen,
       sg_putting      AS putting,
       total_sg        AS totalSg,
       wins,
       earnings,
       fedex_rank      AS fedexRank,
       status_tier     AS statusTier,
       stats_mode      AS statsMode,
       year_mode       AS yearMode,
       field_mode      AS fieldMode,
       years,
       created_at      AS createdAt
     FROM classic_completions
     ORDER BY id DESC
     LIMIT ?`,
  )
    .bind(limit)
    .all();

  return {
    totals,
    byMode: byMode.results ?? [],
    rows: rows.results ?? [],
  };
}

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!env.DAILY_ADMIN_SECRET) {
    return json({ error: "Server missing DAILY_ADMIN_SECRET." }, 500);
  }
  if (request.headers.get("x-admin-key") !== env.DAILY_ADMIN_SECRET) {
    return json({ error: "Unauthorized." }, 401);
  }
  if (!env.DB) {
    return json({ error: "D1 binding `DB` is not configured." }, 500);
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") === "classic" ? "classic" : "daily";

  try {
    const data = mode === "classic" ? await classicStats(env, url) : await dailyStats(env, url);
    return json(data);
  } catch (error) {
    return json({ error: String(error && error.message ? error.message : error) }, 500);
  }
}

export async function onRequest() {
  return json({ error: "Use GET." }, 405);
}
