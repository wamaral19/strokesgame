// Cloudflare Pages Function: POST /api/log-completion
//
// Records one finished run in D1. `mode` selects the table: "daily" (default)
// writes to daily_completions, "classic" writes to classic_completions. This is
// anonymous gameplay telemetry, so there is no admin auth — anyone finishing a
// run writes a row. Reads happen through /api/stats, which is admin-gated.
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

  const mode = payload?.mode === "classic" ? "classic" : "daily";
  const sg = payload?.sg && typeof payload.sg === "object" ? payload.sg : {};
  const wins = clampInt(payload?.wins, 0, 60);
  const earnings = Math.round(finiteNumber(payload?.earnings, 0));

  try {
    if (mode === "classic") {
      const years = Array.isArray(payload?.years)
        ? payload.years
            .map((year) => parseInt(year, 10))
            .filter((year) => Number.isFinite(year))
            .join(",")
        : null;

      await env.DB.prepare(
        `INSERT INTO classic_completions
           (sg_off_tee, sg_approach, sg_around_green, sg_putting, total_sg,
            wins, earnings, fedex_rank, status_tier,
            stats_mode, year_mode, field_mode, years)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          finiteNumber(sg.offTee),
          finiteNumber(sg.approach),
          finiteNumber(sg.aroundGreen),
          finiteNumber(sg.putting),
          finiteNumber(payload?.totalSg),
          wins,
          earnings,
          Number.isFinite(payload?.fedexRank) ? Math.round(payload.fedexRank) : null,
          typeof payload?.statusTier === "string" ? payload.statusTier.slice(0, 48) : null,
          typeof payload?.statsMode === "string" ? payload.statsMode.slice(0, 16) : null,
          typeof payload?.yearMode === "string" ? payload.yearMode.slice(0, 16) : null,
          typeof payload?.fieldMode === "string" ? payload.fieldMode.slice(0, 16) : null,
          years,
        )
        .run();

      return json({ ok: true });
    }

    const date = typeof payload?.date === "string" ? payload.date : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return json({ error: "date must be YYYY-MM-DD." }, 400);
    }
    const correct = clampInt(payload?.correctCategories, 0, 4);
    const rating = typeof payload?.rating === "string" ? payload.rating.slice(0, 32) : null;

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
