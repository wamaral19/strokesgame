// Cloudflare Pages Function: /api/high-scores
//
// Public, un-gated leaderboard for the "All Time High Scores" tab. Runs are
// ranked by simulated season earnings (descending); only the top 3 of each
// board are ever returned.
//
//   GET  /api/high-scores?mode=daily&date=YYYY-MM-DD
//        Top 3 earners for one challenge date. The Daily board "refreshes
//        daily" — it is always scoped to a single day. `date` defaults to the
//        most recent challenge date present in the table.
//
//   GET  /api/high-scores?mode=classic
//        Top 3 earners in each config bucket. A bucket is one
//        (stats_mode × year_mode × field_mode) combination split by whether any
//        mulligans were used (mulligans > 0 → "yes", = 0 → "no").
//
//   POST /api/high-scores   { mode, id, name }
//        Attaches an optional name/initials to an already-logged run (the row
//        id returned by /api/log-completion). A run's name can only be set once.
//
// Requires a D1 binding named `DB` (see functions/schema.sql for setup). Reads
// are public because this is player-facing; nothing sensitive is exposed.

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function cleanName(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/\s+/g, " ").trim().slice(0, 24);
  return trimmed.length > 0 ? trimmed : null;
}

async function dailyBoard(env, url) {
  const dateParam = url.searchParams.get("date");
  let date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : null;

  if (!date) {
    const latest = await env.DB.prepare(
      `SELECT challenge_date AS date FROM daily_completions
       ORDER BY challenge_date DESC LIMIT 1`,
    ).first();
    date = latest?.date ?? null;
  }

  if (!date) return { mode: "daily", date: null, entries: [] };

  const rows = await env.DB.prepare(
    `SELECT
       player_name        AS name,
       earnings,
       wins,
       correct_categories AS correctCategories,
       rating,
       created_at         AS createdAt
     FROM daily_completions
     WHERE challenge_date = ?
     ORDER BY earnings DESC, wins DESC, id ASC
     LIMIT 3`,
  )
    .bind(date)
    .all();

  return { mode: "daily", date, entries: rows.results ?? [] };
}

async function classicBoards(env) {
  // ROW_NUMBER partitions by the full config combo + the mulligan flag, so each
  // bucket keeps only its three best earners.
  const rows = await env.DB.prepare(
    `WITH ranked AS (
       SELECT
         stats_mode,
         year_mode,
         field_mode,
         CASE WHEN mulligans > 0 THEN 1 ELSE 0 END AS used_mulligans,
         player_name,
         earnings,
         wins,
         total_sg,
         fedex_rank,
         status_tier,
         created_at,
         ROW_NUMBER() OVER (
           PARTITION BY stats_mode, year_mode, field_mode,
                        CASE WHEN mulligans > 0 THEN 1 ELSE 0 END
           ORDER BY earnings DESC, wins DESC, id ASC
         ) AS rn
       FROM classic_completions
     )
     SELECT
       stats_mode      AS statsMode,
       year_mode       AS yearMode,
       field_mode      AS fieldMode,
       used_mulligans  AS usedMulligans,
       player_name     AS name,
       earnings,
       wins,
       total_sg        AS totalSg,
       fedex_rank      AS fedexRank,
       status_tier     AS statusTier,
       created_at      AS createdAt
     FROM ranked
     WHERE rn <= 3
     ORDER BY statsMode, yearMode, fieldMode, usedMulligans, earnings DESC`,
  ).all();

  // Fold the flat rows into one entry list per bucket, keyed by config + flag.
  const buckets = new Map();
  for (const row of rows.results ?? []) {
    const key = `${row.statsMode}|${row.yearMode}|${row.fieldMode}|${row.usedMulligans}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        statsMode: row.statsMode,
        yearMode: row.yearMode,
        fieldMode: row.fieldMode,
        usedMulligans: row.usedMulligans === 1,
        entries: [],
      };
      buckets.set(key, bucket);
    }
    bucket.entries.push({
      name: row.name,
      earnings: row.earnings,
      wins: row.wins,
      totalSg: row.totalSg,
      fedexRank: row.fedexRank,
      statusTier: row.statusTier,
      createdAt: row.createdAt,
    });
  }

  return { mode: "classic", buckets: [...buckets.values()] };
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.DB) {
    return json({ error: "D1 binding `DB` is not configured." }, 500);
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") === "classic" ? "classic" : "daily";

  try {
    const data = mode === "classic" ? await classicBoards(env) : await dailyBoard(env, url);
    return json(data);
  } catch (error) {
    return json({ error: String(error && error.message ? error.message : error) }, 500);
  }
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

  const table = payload?.mode === "classic" ? "classic_completions" : "daily_completions";
  const id = Number(payload?.id);
  const name = cleanName(payload?.name);

  if (!Number.isInteger(id) || id <= 0) {
    return json({ error: "A valid run `id` is required." }, 400);
  }
  if (!name) {
    return json({ error: "A non-empty `name` is required." }, 400);
  }

  try {
    // Only ever set a name that hasn't been set — a run can't be renamed or
    // have someone else's name overwritten.
    const result = await env.DB.prepare(
      `UPDATE ${table} SET player_name = ? WHERE id = ? AND player_name IS NULL`,
    )
      .bind(name, id)
      .run();

    const updated = result?.meta?.changes ?? result?.changes ?? 0;
    return json({ ok: updated > 0, updated });
  } catch (error) {
    return json({ error: String(error && error.message ? error.message : error) }, 500);
  }
}

export async function onRequest() {
  return json({ error: "Use GET or POST." }, 405);
}
