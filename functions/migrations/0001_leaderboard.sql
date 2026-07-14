-- Migration: add the leaderboard columns + indexes to an already-deployed DB.
-- schema.sql is idempotent for fresh setups; existing tables need these ALTERs.
--
-- Apply to the remote (deployed) D1 database:
--   npx wrangler d1 execute strokesgame-daily --remote --file=functions/migrations/0001_leaderboard.sql
--
-- SQLite has no "ADD COLUMN IF NOT EXISTS", so re-running this errors on the
-- ALTERs once the columns exist — that's expected and safe to ignore. The
-- CREATE INDEX statements are guarded with IF NOT EXISTS.

ALTER TABLE daily_completions   ADD COLUMN player_name TEXT;
ALTER TABLE classic_completions ADD COLUMN player_name TEXT;

CREATE INDEX IF NOT EXISTS idx_daily_completions_leaderboard
  ON daily_completions (challenge_date, earnings DESC);
CREATE INDEX IF NOT EXISTS idx_classic_completions_leaderboard
  ON classic_completions (stats_mode, year_mode, field_mode, earnings DESC);
