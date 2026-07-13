// Cloudflare Pages Function: GET /api/daily-stats
//
// Returns aggregate + recent Daily Challenge completion data for the admin
// dashboard. Gated by the same shared secret as the daily-challenge admin
// (x-admin-key === DAILY_ADMIN_SECRET).
//
// Requires a D1 binding named `DB` (see functions/schema.sql for setup).
//
// Query params (all optional):
//   date   YYYY-MM-DD — restrict every figure to a single challenge date
//   limit  number     — cap on individual rows returned (default 200, max 1000)

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
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
  const dateParam = url.searchParams.get("date");
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : null;
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 200, 1), 1000);

  const where = date ? "WHERE challenge_date = ?" : "";
  const scopeArgs = date ? [date] : [];

  try {
    const totals = await env.DB.prepare(
      `SELECT
         COUNT(*)                                                AS total,
         AVG(correct_categories)                                 AS avgCorrect,
         SUM(CASE WHEN correct_categories = 4 THEN 1 ELSE 0 END) AS ballKnowers,
         AVG(wins)                                               AS avgWins,
         AVG(earnings)                                           AS avgEarnings
       FROM daily_completions ${where}`,
    )
      .bind(...scopeArgs)
      .first();

    const distribution = await env.DB.prepare(
      `SELECT correct_categories AS score, COUNT(*) AS count
       FROM daily_completions ${where}
       GROUP BY correct_categories
       ORDER BY correct_categories`,
    )
      .bind(...scopeArgs)
      .all();

    const byDay = await env.DB.prepare(
      `SELECT challenge_date AS date, COUNT(*) AS count, AVG(correct_categories) AS avgCorrect
       FROM daily_completions ${where}
       GROUP BY challenge_date
       ORDER BY challenge_date DESC
       LIMIT 90`,
    )
      .bind(...scopeArgs)
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
      .bind(...scopeArgs, limit)
      .all();

    return json({
      totals,
      distribution: distribution.results ?? [],
      byDay: byDay.results ?? [],
      rows: rows.results ?? [],
    });
  } catch (error) {
    return json({ error: String(error && error.message ? error.message : error) }, 500);
  }
}

export async function onRequest() {
  return json({ error: "Use GET." }, 405);
}
