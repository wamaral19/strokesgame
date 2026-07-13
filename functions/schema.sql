-- D1 schema for Daily Challenge completion logging.
--
-- One row per finished Daily Challenge run: how many strokes-gained categories
-- the player got right, the SG profile they built, how many wins the simulated
-- season produced, and the season's on-course earnings.
--
-- ── One-time setup ────────────────────────────────────────────────────────────
--   1. Create the database:
--        npx wrangler d1 create strokesgame-daily
--   2. Apply this schema to it (remote = the deployed Pages project):
--        npx wrangler d1 execute strokesgame-daily --remote --file=functions/schema.sql
--   3. Bind it to the Pages project as variable name `DB`:
--        Cloudflare dashboard → Workers & Pages → strokesgame → Settings →
--        Functions → D1 database bindings → Add → Variable name: DB,
--        Database: strokesgame-daily. (Same place DAILY_ADMIN_SECRET lives.)
--
-- The completion logger (/api/log-completion) and the stats endpoint
-- (/api/daily-stats) both read `env.DB`.

CREATE TABLE IF NOT EXISTS daily_completions (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  challenge_date     TEXT    NOT NULL,          -- YYYY-MM-DD of the challenge played
  correct_categories INTEGER NOT NULL,          -- 0–4 categories placed correctly
  rating             TEXT,                       -- "Ball Knower" / "Almost" / "Bleh" / "Trash"
  sg_off_tee         REAL    NOT NULL DEFAULT 0,
  sg_approach        REAL    NOT NULL DEFAULT 0,
  sg_around_green    REAL    NOT NULL DEFAULT 0,
  sg_putting         REAL    NOT NULL DEFAULT 0,
  wins               INTEGER NOT NULL DEFAULT 0, -- simulated season wins (regular + playoffs)
  earnings           INTEGER NOT NULL DEFAULT 0, -- simulated season on-course earnings (USD)
  created_at         TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_daily_completions_date ON daily_completions (challenge_date);

-- Classic mode has no "correct categories" score; its distinguishing dimension
-- is the mode config the player chose (stats/time-frame/field). It shares the
-- same simulated outputs as the daily (SG profile, wins, earnings) plus the
-- FedEx finish.
CREATE TABLE IF NOT EXISTS classic_completions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  sg_off_tee      REAL    NOT NULL DEFAULT 0,
  sg_approach     REAL    NOT NULL DEFAULT 0,
  sg_around_green REAL    NOT NULL DEFAULT 0,
  sg_putting      REAL    NOT NULL DEFAULT 0,
  total_sg        REAL    NOT NULL DEFAULT 0,
  wins            INTEGER NOT NULL DEFAULT 0,
  mulligans       INTEGER NOT NULL DEFAULT 0,  -- re-spins used across the build
  earnings        INTEGER NOT NULL DEFAULT 0,
  fedex_rank      INTEGER,                     -- final FedEx Cup rank (1 = champion)
  status_tier     TEXT,                        -- outcome tier label from the sim
  stats_mode      TEXT,                        -- "show" | "blind"
  year_mode       TEXT,                        -- "current" | "all" | "filter"
  field_mode      TEXT,                        -- "entire" | "notables"
  years           TEXT,                        -- comma-joined seasons when year_mode = "filter"
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_classic_completions_created ON classic_completions (created_at);
