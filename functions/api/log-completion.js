// Cloudflare Pages Function: POST /api/log-completion
//
// Records one finished Daily Challenge run in D1. This is anonymous gameplay
// telemetry, so there is no admin auth — anyone finishing the daily writes a
// row. Reads happen through /api/daily-stats, which is admin-gated.
//
// Requires a D1 binding named `DB` (see functions/schema.sql for setup).

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function finiteNumber(value, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clampInt(value, min, max) {
  const n = Math.round(finiteNumber(value, min));
  return Math.min(max, Math.max(min, n));
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.DB) {
    return json({ error: "D1 binding `DB` is not configured." }, 500);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Body must be JSON." }, 400);
  }

  const date = typeof payload?.date === "string" ? payload.date : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return json({ error: "date must be YYYY-MM-DD." }, 400);
  }

  const sg = payload?.sg && typeof payload.sg === "object" ? payload.sg : {};
  const correct = clampInt(payload?.correctCategories, 0, 4);
  const wins = clampInt(payload?.wins, 0, 60);
  const earnings = Math.round(finiteNumber(payload?.earnings, 0));
  const rating = typeof payload?.rating === "string" ? payload.rating.slice(0, 32) : null;

  try {
    await env.DB.prepare(
      `INSERT INTO daily_completions
         (challenge_date, correct_categories, rating,
          sg_off_tee, sg_approach, sg_around_green, sg_putting,
          wins, earnings)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        date,
        correct,
        rating,
        finiteNumber(sg.offTee),
        finiteNumber(sg.approach),
        finiteNumber(sg.aroundGreen),
        finiteNumber(sg.putting),
        wins,
        earnings,
      )
      .run();

    return json({ ok: true });
  } catch (error) {
    return json({ error: String(error && error.message ? error.message : error) }, 500);
  }
}

export async function onRequest() {
  return json({ error: "Use POST." }, 405);
}
