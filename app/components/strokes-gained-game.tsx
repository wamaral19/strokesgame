"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import rawSeasons from "../lib/data/player-seasons.json";
import { formatCurrency, formatSg, positionLabel } from "../lib/format";
import { CATEGORY_META, CATEGORY_ORDER } from "../lib/game/categories";
import {
  dailyRating,
  easternDateKey,
  getDailyChallenge,
  type DailyChallenge,
  type DailyChallengeItem,
  type DailyChallengeMedia,
  type DailyChallengeRating,
} from "../lib/game/daily-challenge";
import {
  buildSeed,
  categorySgFromAssignments,
  optimalCategoryBySeason,
  totalSelectedSg,
} from "../lib/game/scoring";
import { NOTABLE_PLAYER_IDS } from "../lib/game/notable-players";
import { getRandomPlayerSeason } from "../lib/game/selection";
import { simulateSeason } from "../lib/game/simulation";
import type {
  CategoryBreakdown,
  CategoryKey,
  EventKind,
  PlayerSeason,
  PlayoffStageResult,
  RegularSeasonSummary,
  SeasonSimulation,
  SlotAssignment,
} from "../lib/game/types";

// Notable Finishes are ordered by championship prestige: majors first, then THE
// PLAYERS, the FedEx Cup Playoffs, Signature Events, and finally regular events.
const EVENT_KIND_PRIORITY: Record<EventKind, number> = {
  major: 0,
  players: 1,
  playoff: 2,
  signature: 3,
  regular: 4,
};

const SEASONS = rawSeasons as PlayerSeason[];
const PLAYER_GROUPS = SEASONS.reduce((groups, season) => {
  const current = groups.get(season.player) ?? [];
  current.push(season);
  groups.set(season.player, current);
  return groups;
}, new Map<string, PlayerSeason[]>());
const PLAYER_NAMES = Array.from(PLAYER_GROUPS.keys());
const AVAILABLE_YEARS = Array.from(new Set(SEASONS.map((season) => season.year))).sort(
  (a, b) => b - a,
);
const LATEST_YEAR = AVAILABLE_YEARS[0];

// Reveal-rail spin timing for a sub-4/4 daily run: each category flickers for
// DAILY_SPIN_STEP_MS before settling, and the season playback (with its FedEx
// Cup popup) waits DAILY_PLAYBACK_DELAY_MS after the last category lands.
const DAILY_SPIN_STEP_MS = 500;
const DAILY_PLAYBACK_DELAY_MS = 1500;

const ZONE_META: Record<CategoryKey, { className: string; label: string }> = {
  offTee: { className: "zone--driving", label: "Off the Tee" },
  approach: { className: "zone--approach", label: "Approach" },
  aroundGreen: { className: "zone--around-green", label: "Around the Green" },
  putting: { className: "zone--putting", label: "Putting" },
};

type SpinPhase = "player" | "year" | "ready";
type YearMode = "current" | "all" | "filter";
type StatsMode = "blind" | "show";
type FieldMode = "entire" | "notables";
type GameVariant = "classic" | "daily";

const STATS_MODE_LABEL: Record<StatsMode, string> = {
  blind: "Blind",
  show: "Show Stats",
};

const FIELD_MODE_LABEL: Record<FieldMode, string> = {
  entire: "Entire Field",
  notables: "Notables",
};

function yearModeLabel(yearMode: YearMode, selectedYears: number[]) {
  if (yearMode === "all") return "All Time";
  if (yearMode === "current") return `${LATEST_YEAR} Season`;
  return [...selectedYears].sort((a, b) => b - a).join(", ") || "Custom Years";
}

// The three chips that describe the game mode a run was played under — surfaced
// in the shareable season recap so a screenshot carries the full context.
function buildModeChips(
  statsMode: StatsMode,
  yearMode: YearMode,
  fieldMode: FieldMode,
  selectedYears: number[],
) {
  return [
    STATS_MODE_LABEL[statsMode],
    yearModeLabel(yearMode, selectedYears),
    FIELD_MODE_LABEL[fieldMode],
  ];
}

// Gently pull a freshly-revealed block/CTA into view so you don't have to
// realise there's a next thing and scroll to it yourself. Runs on every
// screen size; honours reduced-motion. Deferred a frame so the target has
// mounted/laid out before we scroll to it.
function scrollIntoViewSmooth(
  node: HTMLElement | null,
  block: ScrollLogicalPosition = "start",
) {
  if (!node || typeof window === "undefined") return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  requestAnimationFrame(() => {
    node.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block });
  });
}

function Header({
  onResetRequest,
  onHowToPlay,
}: {
  onResetRequest: () => void;
  onHowToPlay: () => void;
}) {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <button type="button" className="wordmark wordmark-button" onClick={onResetRequest}>
          Strokes Game
        </button>
        <button type="button" className="header-link-button" onClick={onHowToPlay}>
          How to Play
        </button>
      </div>
    </header>
  );
}

function HowToPlayDialog({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="reset-confirm how-to-play"
      role="dialog"
      aria-modal="true"
      aria-labelledby="how-to-play-title"
    >
      <div className="reset-confirm__backdrop" />
      <div className="reset-confirm__panel how-to-play__panel">
        <span className="eyebrow">How to Play</span>
        <h2 id="how-to-play-title">Build the perfect golfer from the best pieces of real players.</h2>
        <div className="how-to-play__copy">
          <p>
            Different players excel at different parts of the game. Even in one of Tiger&apos;s
            legendary seasons, another player could still be better with the putter. Your job is to
            take the right piece of each player&apos;s game and construct a golfer who can put
            together a legendary season.
          </p>
          <p>
            Strokes Gained measures how many shots a player gains or loses against the field in a
            specific area: off the tee, approach, around the green, or putting. Higher is better.
          </p>
        </div>
        <button type="button" className="primary-button" onClick={onClose}>
          Got It
        </button>
      </div>
    </div>
  );
}

function ResetConfirmDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="reset-confirm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-confirm-title"
    >
      <div className="reset-confirm__backdrop" />
      <div className="reset-confirm__panel">
        <h2 id="reset-confirm-title">Return to game mode selection?</h2>
        <div className="reset-confirm__actions">
          <button type="button" className="ghost-button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="primary-button" onClick={onConfirm}>
            Return to Game Mode Selection
          </button>
        </div>
      </div>
    </div>
  );
}

// A centered modal that surfaces the game's "next step" after the recap has had
// a beat to breathe. If dismissed, the same action remains inline right where
// the latest block ended.
function NextStepDialog({
  eyebrow,
  title,
  detail,
  actionLabel,
  onAction,
}: {
  eyebrow?: string;
  title: string;
  detail?: string;
  actionLabel: string;
  onAction: () => void;
}) {
  const actionRef = useRef<HTMLButtonElement | null>(null);
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setReady(false);
    setDismissed(false);
    const timer = window.setTimeout(() => setReady(true), 2000);
    return () => window.clearTimeout(timer);
  }, [actionLabel, title]);

  useEffect(() => {
    if (ready && !dismissed) {
      actionRef.current?.focus();
    }
  }, [dismissed, ready]);

  if (dismissed) {
    return (
      <div className="next-step-inline">
        <button type="button" className="primary-button" onClick={onAction}>
          {actionLabel}
        </button>
      </div>
    );
  }

  if (!ready) return null;

  return (
    <div
      className="reset-confirm next-step"
      role="dialog"
      aria-modal="true"
      aria-labelledby="next-step-title"
    >
      <div className="reset-confirm__backdrop" />
      <div className="reset-confirm__panel next-step__panel">
        <button
          type="button"
          className="next-step__close"
          onClick={() => setDismissed(true)}
          aria-label="Close next step popup"
        >
          X
        </button>
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h2 id="next-step-title">{title}</h2>
        {detail ? <p className="next-step__detail">{detail}</p> : null}
        <button type="button" className="primary-button" onClick={onAction} ref={actionRef}>
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

function ModeOption({
  active,
  disabled,
  title,
  hint,
  soon,
  onSelect,
}: {
  active: boolean;
  disabled?: boolean;
  title: string;
  hint?: string;
  soon?: boolean;
  onSelect?: () => void;
}) {
  return (
    <button
      type="button"
      className={`mode-option ${active ? "is-active" : ""}`}
      disabled={disabled}
      aria-pressed={active}
      onClick={onSelect}
    >
      <strong>{title}</strong>
      {soon ? <span className="mode-option__soon">Coming soon</span> : null}
      {hint ? <span className="mode-option__hint">{hint}</span> : null}
    </button>
  );
}

function GameModeChooser({
  statsMode,
  yearMode,
  fieldMode,
  selectedYears,
  isChange,
  onGameVariant,
  onStatsMode,
  onYearMode,
  onFieldMode,
  onToggleYear,
  onConfirm,
}: {
  statsMode: StatsMode;
  yearMode: YearMode;
  fieldMode: FieldMode;
  selectedYears: number[];
  isChange: boolean;
  onGameVariant: (mode: GameVariant) => void;
  onStatsMode: (mode: StatsMode) => void;
  onYearMode: (mode: YearMode) => void;
  onFieldMode: (mode: FieldMode) => void;
  onToggleYear: (year: number) => void;
  onConfirm: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const [showClassicOptions, setShowClassicOptions] = useState(false);
  const canConfirm = yearMode !== "filter" || selectedYears.length > 0;

  useEffect(() => {
    if (!showClassicOptions) return;
    // Only auto-focus on pointer devices. On touch, focusing the confirm button
    // (which sits at the bottom of the panel) scrolls the fixed modal to reveal
    // it — on first launch the mobile address bar makes the viewport short enough
    // that the panel overflows, so the scroll jumps the modal out from under the
    // user's tap. The first "Start Your Round" tap then misses and the popup
    // appears to require a second pass. See feat/next-step-popups.
    if (typeof window !== "undefined" && !window.matchMedia("(pointer: fine)").matches) {
      return;
    }
    confirmRef.current?.focus();
  }, [showClassicOptions]);

  const chooseDaily = () => {
    onGameVariant("daily");
    onConfirm();
  };

  const chooseClassic = () => {
    onGameVariant("classic");
    setShowClassicOptions(true);
  };

  return (
    <div
      className="mode-chooser"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mode-chooser-title"
    >
      <div className="mode-chooser__backdrop" />
      <div className="mode-chooser__panel">
        <span className="eyebrow">Choose Your Game Mode</span>
        <h2 id="mode-chooser-title">Pick how you want to play.</h2>

        {!showClassicOptions ? (
          <fieldset className="mode-group" aria-label="Game Mode">
            <div className="mode-options">
              <ModeOption
                active={false}
                title="Daily Challenge"
                hint="Use clues to build a player and compete."
                onSelect={chooseDaily}
              />
              <ModeOption
                active={false}
                title="Classic"
                hint="Try to construct a FedEx Cup winner"
                onSelect={chooseClassic}
              />
            </div>
          </fieldset>
        ) : null}

        {showClassicOptions ? (
          <>
            <fieldset className="mode-group">
              <legend>Stats</legend>
              <p className="mode-group__hint">
                Show the stats or only see a name when placing a player into a strokes gained category.
              </p>
              <div className="mode-options">
                <ModeOption
                  active={statsMode === "show"}
                  title="Show Stats"
                  onSelect={() => onStatsMode("show")}
                />
                <ModeOption
                  active={statsMode === "blind"}
                  title="Blind"
                  onSelect={() => onStatsMode("blind")}
                />
              </div>
            </fieldset>

            <fieldset className="mode-group">
              <legend>Time Frame</legend>
              <p className="mode-group__hint">Choose your time frame.</p>
              <div className="mode-options mode-options--trio">
                <ModeOption
                  active={yearMode === "current"}
                  title="Current"
                  onSelect={() => onYearMode("current")}
                />
                <ModeOption
                  active={yearMode === "all"}
                  title="All Time"
                  onSelect={() => onYearMode("all")}
                />
                <ModeOption
                  active={yearMode === "filter"}
                  title="Custom"
                  onSelect={() => onYearMode("filter")}
                />
              </div>
              {yearMode === "filter" ? (
                <div className="mode-years">
                  {AVAILABLE_YEARS.map((year) => (
                    <label key={year}>
                      <input
                        type="checkbox"
                        checked={selectedYears.includes(year)}
                        onChange={() => onToggleYear(year)}
                      />
                      <span>{year}</span>
                    </label>
                  ))}
                </div>
              ) : null}
            </fieldset>

            <fieldset className="mode-group">
              <legend>Field</legend>
              <p className="mode-group__hint">Names the casual fan would recognize.</p>
              <div className="mode-options">
                <ModeOption
                  active={fieldMode === "entire"}
                  title="Entire Field"
                  onSelect={() => onFieldMode("entire")}
                />
                <ModeOption
                  active={fieldMode === "notables"}
                  title="Notables"
                  onSelect={() => {
                    onFieldMode("notables");
                    onYearMode("all");
                  }}
                />
              </div>
            </fieldset>

            <button
              type="button"
              className="primary-button mode-chooser__confirm"
              onClick={onConfirm}
              disabled={!canConfirm}
              ref={confirmRef}
            >
              {isChange ? "Update Game Mode" : "Start Your Round"}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

// One-sentence explainer for why a playoff week's strokes gained can look
// strong yet still finish mid-pack — the SG scale is the same as the
// season-long stats; only the field got tougher.
const TRUE_SG_EXPLAINER =
  'These are "true" strokes gained — measured against the average PGA Tour field, the same scale as the season-long stats — so a strong number can still finish mid-pack against a stacked playoff field.';

// A small "ⓘ"-style hint that reveals its explainer on hover or keyboard focus.
// Pure CSS bubble; the trigger is focusable and the bubble is the accessible
// tooltip so it works without a pointer.
function InfoHint({ label, children }: { label: string; children: string }) {
  return (
    <span className="info-hint" tabIndex={0} role="note" aria-label={`${label}: ${children}`}>
      <span className="info-hint__label">{label}</span>
      <span className="info-hint__icon" aria-hidden="true">
        i
      </span>
      <span className="info-hint__bubble" aria-hidden="true">
        {children}
      </span>
    </span>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <span className="wordmark">Strokes Game</span>
      <Link className="ghost-button site-footer__contact" href="/contact">
        Contact Us
      </Link>
    </footer>
  );
}

function SpinnerPanel({
  displayPlayer,
  displayYear,
  phase,
  pickNumber,
  complete,
  showYear,
  assignmentByCategory,
  needsSpin,
  pendingCategory,
  statsReveal,
  totalSg,
  onAssign,
  onMulligan,
  onStartSpin,
}: {
  displayPlayer: string;
  displayYear: string;
  phase: SpinPhase;
  pickNumber: number;
  complete: boolean;
  showYear: boolean;
  assignmentByCategory: Map<CategoryKey, SlotAssignment>;
  needsSpin: boolean;
  pendingCategory?: CategoryKey;
  statsReveal?: React.ReactNode;
  totalSg: number;
  onAssign: (category: CategoryKey) => void;
  onMulligan: (category: CategoryKey) => void;
  onStartSpin: () => void;
}) {
  const canAssign = phase === "ready" && !complete;
  return (
    <section className="spinner-panel" aria-label="Current player and year">
      <div className="spinner-panel__top">
        <span className="eyebrow">Pick {pickNumber} of 4</span>
        <span className="pill">
          {complete ? "Complete" : needsSpin ? "Assigned" : phase === "ready" ? "Ready" : "Spinning"}
        </span>
      </div>
      <div className={`spinner-panel__body ${showYear ? "" : "spinner-panel__body--solo"}`}>
        <div className={`reel reel--player ${phase === "player" ? "is-spinning" : ""}`}>
          <span className="eyebrow">Player</span>
          <strong>{displayPlayer}</strong>
        </div>
        {showYear ? (
          <div className={`reel reel--year ${phase === "year" ? "is-spinning" : ""}`}>
            <span className="eyebrow">Year</span>
            <strong>{displayYear}</strong>
          </div>
        ) : null}
      </div>
      {statsReveal}
      <div className="classic-selection-stage">
        <div className="classic-selection-art" aria-hidden="true">
          <img src="/Golf Game Drawing.webp" alt="" />
        </div>
        <div className="classic-assignment-grid" aria-label="Assign current player to category">
          {CATEGORY_ORDER.map((category) => {
            const assignment = assignmentByCategory.get(category);
            const isPending = category === pendingCategory;
            // Earlier picks are locked; the current spin's player can still be
            // moved between open slots (or cleared out of their pending slot).
            const locked = Boolean(assignment) && !isPending;
            const interactive = canAssign && !locked;

            if (assignment && !isPending) {
              const selectedValue = assignment.season.sg[category];
              return (
                <div className="classic-assignment-card" key={category}>
                  <div className="classic-assignment-card__head">
                    <span className="eyebrow">{ZONE_META[category].label}</span>
                    <button
                      type="button"
                      className="mulligan-button"
                      onClick={() => onMulligan(category)}
                      aria-label={`Mulligan ${ZONE_META[category].label} — drop ${assignment.season.player} and respin`}
                    >
                      Mulligan
                    </button>
                  </div>
                  <strong>
                    {assignment.season.player} {assignment.season.year}
                  </strong>
                  <span className={`classic-assignment-card__value ${selectedValue < 0 ? "negative" : ""}`}>
                    {CATEGORY_META[category].statLabel}: {formatSg(selectedValue)}
                  </span>
                </div>
              );
            }

            return (
              <button
                type="button"
                className={`classic-assignment-slot ${isPending ? "is-pending" : ""}`}
                key={category}
                disabled={!interactive}
                onClick={() => onAssign(category)}
              >
                <span className="eyebrow">{ZONE_META[category].label}</span>
                <strong>{isPending ? "Selected" : canAssign ? "Assign" : "Wait"}</strong>
              </button>
            );
          })}
        </div>
        <div className="classic-assignment-total" aria-label="Total strokes gained">
          <span className="eyebrow">Total SG</span>
          <strong className={totalSg < 0 ? "negative" : ""}>{formatSg(totalSg)}</strong>
        </div>
      </div>
      {needsSpin && !complete ? (
        <div className="classic-spin-action">
          <button type="button" className="primary-button" onClick={onStartSpin}>
            Start Spin
          </button>
        </div>
      ) : null}
    </section>
  );
}

function StatList({
  season,
  idealCategory,
}: {
  season?: PlayerSeason;
  idealCategory?: CategoryKey;
}) {
  return (
    <div className="stat-list" aria-label="Revealed strokes gained stats">
      {CATEGORY_ORDER.map((category) => {
        const isIdeal = category === idealCategory;
        return (
          <div className={`stat-row ${isIdeal ? "stat-row--ideal" : ""}`} key={category}>
            <span>
              {CATEGORY_META[category].statLabel}
              {isIdeal ? <span className="stat-row__ideal-tag">Ideal</span> : null}
            </span>
            <strong>{season ? formatSg(season.sg[category]) : "—"}</strong>
          </div>
        );
      })}
    </div>
  );
}

function AssignmentStats({ assignments }: { assignments: SlotAssignment[] }) {
  if (assignments.length === 0) return null;

  // Once all four are locked, surface the arrangement that would have maximized
  // total SG by tagging each player's ideal category in green below.
  const idealBySeason = optimalCategoryBySeason(
    assignments.map((assignment) => assignment.season),
  );

  return (
    <section className="assignment-stats" aria-label="Revealed strokes gained stats">
      {assignments.map((assignment) => (
        <div className="assignment-stats__item" key={assignment.category}>
          <span className="eyebrow">{ZONE_META[assignment.category].label}</span>
          <strong>
            {assignment.season.player} {assignment.season.year}
          </strong>
          <StatList
            season={assignment.season}
            idealCategory={idealBySeason.get(assignment.season.id)}
          />
        </div>
      ))}
    </section>
  );
}

// One category reel inside a playoff event: it spins random SG values around the
// player's season mean for ~0.9s, then locks on the week's actual value and
// colours green (at or above the player's average) or red (below).
function SpinningStat({
  breakdown,
  onSettled,
}: {
  breakdown: CategoryBreakdown;
  onSettled: () => void;
}) {
  const [display, setDisplay] = useState(breakdown.mean);
  const [settled, setSettled] = useState(false);
  const settledCallback = useRef(onSettled);
  settledCallback.current = onSettled;

  useEffect(() => {
    const interval = window.setInterval(() => {
      setDisplay(breakdown.mean + (Math.random() * 2 - 1) * 1.6);
    }, 55);
    const settle = window.setTimeout(() => {
      window.clearInterval(interval);
      setDisplay(breakdown.weekValue);
      setSettled(true);
      settledCallback.current();
    }, 900);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(settle);
    };
  }, [breakdown]);

  const meta = CATEGORY_META[breakdown.category];
  const stateClass = !settled
    ? "playoff-stat--spinning"
    : breakdown.above
      ? "playoff-stat--up"
      : "playoff-stat--down";

  return (
    <div className={`playoff-stat ${stateClass}`}>
      <span className="eyebrow">{meta.shortLabel}</span>
      <strong className="playoff-stat__value">{formatSg(display)}</strong>
      <span className="playoff-stat__meta">
        {settled
          ? `avg ${formatSg(breakdown.mean)} · ${breakdown.above ? "+" : ""}${breakdown.delta.toFixed(2)}`
          : "spinning…"}
      </span>
    </div>
  );
}

function PlayoffStageBlock({
  stage,
  isCurrent,
  continueLabel,
  blockRef,
  onContinue,
}: {
  stage: PlayoffStageResult;
  isCurrent: boolean;
  continueLabel: string;
  blockRef?: (node: HTMLElement | null) => void;
  onContinue: () => void;
}) {
  const [settledCount, setSettledCount] = useState(0);
  const order = CATEGORY_ORDER;
  const revealCount = Math.min(settledCount + 1, order.length);
  const summaryReady = settledCount >= order.length;

  const byCategory = useMemo(
    () => new Map(stage.categories.map((item) => [item.category, item])),
    [stage],
  );

  return (
    <section className="playoff-block" aria-label={stage.event.name} ref={blockRef}>
      <div className="playoff-block__head playoff-block__head--event">
        <h3>{stage.event.name}</h3>
      </div>

      <div className="playoff-stat-rail__caption">
        <InfoHint label="True Strokes Gained">{TRUE_SG_EXPLAINER}</InfoHint>
      </div>

      <div className="playoff-stat-rail">
        {order.map((category, index) => {
          if (index < revealCount) {
            return (
              <SpinningStat
                key={category}
                breakdown={byCategory.get(category)!}
                onSettled={() => setSettledCount((count) => count + 1)}
              />
            );
          }
          return (
            <div className="playoff-stat playoff-stat--idle" key={category}>
              <span className="eyebrow">{CATEGORY_META[category].shortLabel}</span>
              <strong className="playoff-stat__value">--</strong>
              <span className="playoff-stat__meta">on deck</span>
            </div>
          );
        })}
      </div>

      {summaryReady ? (
        <div className="playoff-summary">
          <div className="playoff-summary__grid">
            <div>
              <span className="eyebrow">Finish</span>
              <strong>{positionLabel(stage.position, stage.tied)}</strong>
            </div>
            <div>
              <span className="eyebrow">FedEx Cup Points</span>
              <strong>{stage.fedExPoints}</strong>
            </div>
            <div>
              <span className="eyebrow">FedEx Cup Position</span>
              <strong>
                {stage.rankBefore} → {stage.rankAfter}
              </strong>
            </div>
            <div>
              <span className="eyebrow">Earned</span>
              <strong>{formatCurrency(stage.earnings)}</strong>
            </div>
          </div>
          <div className={`playoff-writeup ${stage.advanced ? "is-advance" : "is-out"}`}>
            <span className="eyebrow">{stage.writeup.label}</span>
            <h4>{stage.writeup.headline}</h4>
            <p>{stage.writeup.detail}</p>
            {stage.sgNote ? <p className="playoff-writeup__note">{stage.sgNote}</p> : null}
          </div>
        </div>
      ) : null}

      {isCurrent && summaryReady ? (
        <NextStepDialog
          eyebrow={stage.writeup.label}
          title={stage.writeup.headline}
          actionLabel={continueLabel}
          onAction={onContinue}
        />
      ) : null}
    </section>
  );
}

function RegularSeasonBlock({
  summary,
  isCurrent,
  onContinue,
}: {
  summary: RegularSeasonSummary;
  isCurrent: boolean;
  onContinue: () => void;
}) {
  return (
    <section className="playoff-block playoff-block--regular" aria-label="Regular season">
      <div className="playoff-block__head">
        <span className="eyebrow">{summary.writeup.label}</span>
        <h3>{summary.writeup.headline}</h3>
      </div>
      <div className="playoff-summary__grid">
        <div>
          <span className="eyebrow">FedEx Cup Points</span>
          <strong>{summary.points.toLocaleString()}</strong>
        </div>
        <div>
          <span className="eyebrow">Regular-Season Rank</span>
          <strong>No. {summary.rank}</strong>
        </div>
        <div>
          <span className="eyebrow">Wins</span>
          <strong>{summary.wins}</strong>
        </div>
        <div>
          <span className="eyebrow">Earned</span>
          <strong>{formatCurrency(summary.earnings)}</strong>
        </div>
      </div>
      <div className={`playoff-writeup ${summary.madePlayoffs ? "is-advance" : "is-out"}`}>
        <p>{summary.writeup.detail}</p>
      </div>
      {isCurrent ? (
        <NextStepDialog
          eyebrow={summary.writeup.label}
          title={summary.madePlayoffs ? "You're in the playoffs" : "Your season is over"}
          actionLabel={summary.madePlayoffs ? "Enter the FedEx Cup Playoffs" : "See the final standings"}
          onAction={onContinue}
        />
      ) : null}
    </section>
  );
}

function FinalBlock({
  simulation,
  assignments,
  mulligans,
  modeChips,
  blockRef,
  onNewRound,
}: {
  simulation: SeasonSimulation;
  assignments: SlotAssignment[];
  mulligans: number;
  modeChips: string[];
  blockRef?: (node: HTMLElement | null) => void;
  onNewRound: () => void;
}) {
  // Wins span the whole season: regular-season events plus any playoff-event
  // wins, which now live in `playoffStages` rather than `results`.
  const wins = [
    ...simulation.results.filter((result) => result.position === 1),
    ...simulation.playoffStages.filter((stage) => stage.position === 1),
  ];

  // The player combo, ordered by course zone (Putting → Off the Tee) with the
  // strokes gained that player posted in the category they were slotted into.
  const lineup = CATEGORY_ORDER.map((category) => ({
    category,
    season: assignments.find((assignment) => assignment.category === category)?.season,
  }));

  // Notable Finishes: every win first, then every top-5 finish, each group
  // ordered by event prestige (majors → players → playoffs → signature →
  // regular). Playoff events sit alongside the regular season here.
  const finishes = [
    ...simulation.results
      .filter((result) => result.madeCut)
      .map((result) => ({
        id: result.event.id,
        name: result.event.name,
        kind: result.event.kind,
        position: result.position,
        tied: result.tied,
      })),
    ...simulation.playoffStages.map((stage) => ({
      id: stage.event.id,
      name: stage.event.name,
      kind: stage.event.kind,
      position: stage.position,
      tied: stage.tied,
    })),
  ];
  const byPrestige = (a: { kind: EventKind; position: number }, b: typeof a) =>
    EVENT_KIND_PRIORITY[a.kind] - EVENT_KIND_PRIORITY[b.kind] || a.position - b.position;
  const notableFinishes = [
    ...finishes.filter((finish) => finish.position === 1).sort(byPrestige),
    ...finishes.filter((finish) => finish.position >= 2 && finish.position <= 5).sort(byPrestige),
  ];

  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  // A plain-text version of the recap so a run can be pasted anywhere (group
  // chats, notes) as well as screenshotted. Mirrors the on-screen content.
  const buildShareText = useCallback(() => {
    const lines = [
      "⛳ Strokes Game — Season Recap",
      `🏆 FedEx Cup: No. ${simulation.fedExRank}`,
      `💰 On Course Earnings: ${formatCurrency(simulation.earnings)}`,
      `🥇 Wins: ${wins.length}`,
      `🔁 Mulligans: ${mulligans}`,
      "",
      `Mode: ${modeChips.join(" · ")}`,
      "",
      "Lineup:",
      ...lineup.map(
        (slot) =>
          `• ${CATEGORY_META[slot.category].statLabel}: ${
            slot.season
              ? `${slot.season.player}, ${slot.season.year}, ${formatSg(slot.season.sg[slot.category])}`
              : "—"
          }`,
      ),
      `Total Strokes Gained: ${formatSg(simulation.totalSg)}`,
    ];
    if (notableFinishes.length > 0) {
      lines.push(
        "",
        "Notable Finishes:",
        ...notableFinishes.map((finish) => `• ${positionLabel(finish.position, finish.tied)} — ${finish.name}`),
      );
    }
    if (typeof window !== "undefined") {
      lines.push("", window.location.origin);
    }
    return lines.join("\n");
  }, [
    lineup,
    modeChips,
    mulligans,
    notableFinishes,
    simulation.earnings,
    simulation.fedExRank,
    simulation.totalSg,
    wins.length,
  ]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(buildShareText());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard can be blocked (permissions, insecure context) — fail quietly.
    }
  }, [buildShareText]);

  const handleShare = useCallback(async () => {
    const text = buildShareText();
    try {
      await navigator.share({ title: "Strokes Game — Season Recap", text });
    } catch {
      // User dismissed the share sheet, or it isn't available — no-op.
    }
  }, [buildShareText]);

  return (
    <section
      className="playoff-block playoff-block--final"
      aria-label="Season recap"
      ref={blockRef}
    >
      {/* Top box — every headline stat in the split-cell format. */}
      <div className="fedex-bar fedex-bar--final fedex-bar--quad">
        <div>
          <span className="eyebrow">FedEx Cup Position</span>
          <strong>No. {simulation.fedExRank}</strong>
        </div>
        <div>
          <span className="eyebrow">On Course Earnings</span>
          <strong>{formatCurrency(simulation.earnings)}</strong>
        </div>
        <div>
          <span className="eyebrow">Wins</span>
          <strong>{wins.length}</strong>
        </div>
        <div>
          <span className="eyebrow">Mulligans</span>
          <strong>{mulligans}</strong>
        </div>
      </div>

      <div className="recap-mode">
        <span className="recap-mode__label">Game Mode</span>
        <span className="recap-mode__value">{modeChips.join(" · ")}</span>
      </div>

      {/* Four quadrants — the lineup with each player's category performance,
          then a merged total-strokes-gained row along the bottom. */}
      <div className="recap-lineup-grid" aria-label="Your lineup">
        {lineup.map((slot) => {
          const value = slot.season?.sg[slot.category];
          return (
            <div className="recap-lineup-cell" key={slot.category}>
              <span className="recap-lineup-cat">{CATEGORY_META[slot.category].statLabel}</span>
              <div className="recap-lineup-line">
                <span className="recap-lineup-player">
                  {slot.season ? `${slot.season.player}, ${slot.season.year}` : "—"}
                </span>
                <span className={`recap-lineup-val ${value !== undefined && value < 0 ? "is-negative" : ""}`}>
                  {value !== undefined ? formatSg(value) : "—"}
                </span>
              </div>
            </div>
          );
        })}
        <div className="recap-lineup-total">
          Total Strokes Gained:{" "}
          <span className={simulation.totalSg < 0 ? "is-negative" : ""}>
            {formatSg(simulation.totalSg)}
          </span>
        </div>
      </div>

      <div className="notable-finishes">
        <span className="notable-finishes__title">Notable Finishes</span>
        {notableFinishes.length > 0 ? (
          <ul>
            {notableFinishes.map((finish) => (
              <li key={finish.id} className={finish.position === 1 ? "is-win" : ""}>
                <span className="notable-finishes__pos">{positionLabel(finish.position, finish.tied)}</span>
                <span className="notable-finishes__event">{finish.name}</span>
                <span className="pill">{finish.kind}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="notable-finishes__empty">No top-5 finishes this season.</p>
        )}
      </div>

      <div className="recap-actions">
        <button type="button" className="primary-button" onClick={handleCopy}>
          {copied ? "Copied!" : "Copy Recap"}
        </button>
        {canNativeShare ? (
          <button type="button" className="ghost-button" onClick={handleShare}>
            Share
          </button>
        ) : null}
        <span className="recap-actions__hint">Screenshot this recap to share it anywhere.</span>
      </div>

      <button type="button" className="primary-button playoff-block__reset" onClick={onNewRound}>
        New Round
      </button>
    </section>
  );
}

function TournamentLog({
  simulation,
  revealedPlayoffCount,
}: {
  simulation: SeasonSimulation;
  revealedPlayoffCount: number;
}) {
  const [eventsOpen, setEventsOpen] = useState(false);

  // `simulation.results` is the regular season only. Playoff events are played
  // one stage at a time, so append just the stages the playback has reached —
  // nothing about them exists in the table before we get there.
  const visibleResults = [
    ...simulation.results,
    ...simulation.playoffStages.slice(0, revealedPlayoffCount).map((stage) => ({
      event: stage.event,
      strokes: stage.weekSg,
      position: stage.position,
      tied: stage.tied,
      madeCut: true,
      fedExPoints: stage.fedExPoints,
      earnings: stage.earnings,
    })),
  ];

  return (
    <div className="event-accordion event-accordion--standalone">
      <button
        type="button"
        className="event-accordion__trigger"
        onClick={() => setEventsOpen((open) => !open)}
        aria-expanded={eventsOpen}
      >
        <span>Season Results</span>
        <span>{eventsOpen ? "Hide" : "Show"}</span>
      </button>

      {eventsOpen ? (
        <table className="event-table">
          <thead>
            <tr>
              <th>Finish</th>
              <th>Event</th>
              <th>Type</th>
              <th>Week SG</th>
              <th>FedEx</th>
              <th>Earnings</th>
            </tr>
          </thead>
          <tbody>
            {visibleResults.map((result) => (
              <tr
                key={result.event.id}
                className={
                  result.position === 1
                    ? "event-row--win"
                    : !result.madeCut
                      ? "event-row--cut"
                      : ""
                }
              >
                <td>{result.madeCut ? positionLabel(result.position, result.tied) : "MC"}</td>
                <td>{result.event.name}</td>
                <td>
                  <span className="pill">{result.event.kind}</span>
                </td>
                <td>{formatSg(result.strokes)}</td>
                <td>{result.madeCut ? result.fedExPoints : 0}</td>
                <td>{result.madeCut ? formatCurrency(result.earnings) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}

// The Tour Championship finale still gets its strokes-gained sim run on screen —
// the four category reels spin and settle exactly like the other playoff events
// — but instead of its own finish/earnings recap and continue button, it tallies
// for a beat and then hands off to the full season recap automatically.
function FinaleSimBlock({
  stage,
  isCurrent,
  blockRef,
  onSettled,
}: {
  stage: PlayoffStageResult;
  isCurrent: boolean;
  blockRef?: (node: HTMLElement | null) => void;
  onSettled: () => void;
}) {
  const [settledCount, setSettledCount] = useState(0);
  const order = CATEGORY_ORDER;
  const revealCount = Math.min(settledCount + 1, order.length);
  const summaryReady = settledCount >= order.length;
  const advancedRef = useRef(false);
  const settledCallback = useRef(onSettled);
  settledCallback.current = onSettled;

  const byCategory = useMemo(
    () => new Map(stage.categories.map((item) => [item.category, item])),
    [stage],
  );

  useEffect(() => {
    if (!summaryReady || !isCurrent || advancedRef.current) return;
    advancedRef.current = true;
    const timer = window.setTimeout(() => settledCallback.current(), 1100);
    return () => window.clearTimeout(timer);
  }, [summaryReady, isCurrent]);

  return (
    <section className="playoff-block" aria-label={stage.event.name} ref={blockRef}>
      <div className="playoff-block__head playoff-block__head--event">
        <h3>{stage.event.name}</h3>
      </div>

      <div className="playoff-stat-rail__caption">
        <InfoHint label="True Strokes Gained">{TRUE_SG_EXPLAINER}</InfoHint>
      </div>

      <div className="playoff-stat-rail">
        {order.map((category, index) => {
          if (index < revealCount) {
            return (
              <SpinningStat
                key={category}
                breakdown={byCategory.get(category)!}
                onSettled={() => setSettledCount((count) => count + 1)}
              />
            );
          }
          return (
            <div className="playoff-stat playoff-stat--idle" key={category}>
              <span className="eyebrow">{CATEGORY_META[category].shortLabel}</span>
              <strong className="playoff-stat__value">--</strong>
              <span className="playoff-stat__meta">on deck</span>
            </div>
          );
        })}
      </div>

      {summaryReady && isCurrent ? (
        <p className="playoff-block__detail">Tallying the final standings…</p>
      ) : null}
    </section>
  );
}

function SeasonPlayback({
  simulation,
  assignments,
  mulligans,
  modeChips,
  onNewRound,
  suppressInitialScroll = false,
}: {
  simulation: SeasonSimulation;
  assignments: SlotAssignment[];
  mulligans: number;
  modeChips: string[];
  onNewRound: () => void;
  suppressInitialScroll?: boolean;
}) {
  const stages = simulation.playoffStages;
  // East Lake's tournament recap is skipped, but its strokes-gained sim still
  // runs on screen (FinaleSimBlock) before handing off to the season recap. The
  // playoff recap blocks (with their own finish/earnings + continue button) are
  // every stage except the finale.
  const hasFinale = stages.length > 0 && stages[stages.length - 1].isFinale;
  const recapStages = hasFinale ? stages.slice(0, -1) : stages;
  const finaleStage = hasFinale ? stages[stages.length - 1] : undefined;
  // step 0 = regular season; 1..recapStages.length = playoff recap blocks; then
  // (if the run reached East Lake) the finale sim at finaleStep, and finally the
  // season recap at finalStep. Blocks with index <= step are revealed.
  const [step, setStep] = useState(0);
  const finaleStep = hasFinale ? recapStages.length + 1 : 0;
  const finalStep = recapStages.length + (hasFinale ? 2 : 1);

  // Tracks the block that just became current, so we can scroll to it on mobile.
  // Ignore the detach call (null) so the newly-mounted block wins the race.
  const currentRef = useRef<HTMLElement | null>(null);
  const setCurrentRef = useCallback((node: HTMLElement | null) => {
    if (node) currentRef.current = node;
  }, []);

  // The whole playback section, so we can pull it into view the moment the
  // season is simulated (i.e. right after the 4th category is assigned).
  const sectionRef = useRef<HTMLElement | null>(null);

  // Reset the playback whenever a brand-new season is simulated, and scroll it
  // into view so it's clear the run has moved on from category assignment.
  useEffect(() => {
    setStep(0);
    // In daily mode the reveal scrolls to the "ideal slots" result instead, so
    // don't yank the view down to the season playback here.
    if (suppressInitialScroll) return;
    scrollIntoViewSmooth(sectionRef.current, "start");
  }, [simulation, suppressInitialScroll]);

  // Push the freshly-revealed block into view after each advance so you don't
  // have to scroll to reach the next CTA. Skip the initial render.
  useEffect(() => {
    if (step === 0) return;
    scrollIntoViewSmooth(currentRef.current, "nearest");
  }, [step]);

  const advance = useCallback(() => setStep((value) => value + 1), []);

  const continueLabelFor = (index: number) => {
    const stage = recapStages[index];
    if (stage.advanced && index < recapStages.length - 1) {
      return `On to the ${recapStages[index + 1].event.name}`;
    }
    // Advancing past the last recap block means East Lake is next — its sim runs
    // before the standings. An eliminated run instead jumps to the recap.
    if (stage.advanced && finaleStage) {
      return `On to the ${finaleStage.event.name}`;
    }
    return "See your season recap";
  };

  return (
    <section className="playback" aria-label="Season playback" ref={sectionRef}>
      <div className="playback__stack">
        <RegularSeasonBlock
          summary={simulation.regularSeason}
          isCurrent={step === 0}
          onContinue={advance}
        />

        <TournamentLog
          simulation={simulation}
          revealedPlayoffCount={
            step >= finalStep ? stages.length : Math.min(step, recapStages.length)
          }
        />

        {recapStages.map((stage, index) =>
          step >= index + 1 ? (
            <PlayoffStageBlock
              key={stage.event.id}
              stage={stage}
              isCurrent={step === index + 1}
              continueLabel={continueLabelFor(index)}
              blockRef={step === index + 1 ? setCurrentRef : undefined}
              onContinue={advance}
            />
          ) : null,
        )}

        {finaleStage && step >= finaleStep ? (
          <FinaleSimBlock
            stage={finaleStage}
            isCurrent={step === finaleStep}
            blockRef={step === finaleStep ? setCurrentRef : undefined}
            onSettled={advance}
          />
        ) : null}

        {step >= finalStep ? (
          <FinalBlock
            simulation={simulation}
            assignments={assignments}
            mulligans={mulligans}
            modeChips={modeChips}
            blockRef={setCurrentRef}
            onNewRound={onNewRound}
          />
        ) : null}
      </div>
    </section>
  );
}

function MediaCard({ media, compact = false }: { media: DailyChallengeMedia; compact?: boolean }) {
  if (media.kind === "image") {
    return (
      <figure className={`daily-media ${compact ? "daily-media--compact" : ""}`}>
        <img src={media.src} alt={media.alt} />
      </figure>
    );
  }

  if (media.kind === "video") {
    return (
      <figure className={`daily-media ${compact ? "daily-media--compact" : ""}`}>
        <video src={media.src} aria-label={media.alt ?? media.title} controls={!compact} playsInline />
      </figure>
    );
  }

  return (
    <div className={`daily-media daily-media--text ${compact ? "daily-media--compact" : ""}`}>
      <p>{media.body}</p>
    </div>
  );
}

type DailyTileAssignment = {
  category: CategoryKey;
  item: DailyChallengeItem;
};

type StoredDailyUser = {
  email: string;
  pin: string;
};

const DAILY_USER_KEY = "strokes-game-daily-user";
const DAILY_RESULTS_KEY = "strokes-game-daily-results";

function DailySavePanel({
  challenge,
  score,
  rating,
  assignments,
}: {
  challenge: DailyChallenge;
  score: number;
  rating: DailyChallengeRating;
  assignments: SlotAssignment[];
}) {
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [savedEmail, setSavedEmail] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(DAILY_USER_KEY);
      if (!stored) return;
      const user = JSON.parse(stored) as StoredDailyUser;
      setEmail(user.email);
      setPin(user.pin);
      setSavedEmail(user.email);
    } catch {
      // Ignore malformed local storage.
    }
  }, []);

  const handleSave = () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail.includes("@") || !/^\d{4}$/.test(pin)) {
      setMessage("Use an email and a 4 digit PIN.");
      return;
    }

    const user: StoredDailyUser = { email: trimmedEmail, pin };
    const result = {
      challengeId: challenge.id,
      date: challenge.date,
      email: trimmedEmail,
      score,
      rating,
      savedAt: new Date().toISOString(),
      lineup: assignments.map((assignment) => ({
        category: assignment.category,
        seasonId: assignment.season.id,
        player: assignment.season.player,
        year: assignment.season.year,
      })),
    };

    try {
      const existing = JSON.parse(window.localStorage.getItem(DAILY_RESULTS_KEY) ?? "[]");
      const nextResults = Array.isArray(existing)
        ? [
            ...existing.filter(
              (item) =>
                item?.challengeId !== challenge.id || item?.email !== trimmedEmail,
            ),
            result,
          ]
        : [result];
      window.localStorage.setItem(DAILY_USER_KEY, JSON.stringify(user));
      window.localStorage.setItem(DAILY_RESULTS_KEY, JSON.stringify(nextResults));
      setSavedEmail(trimmedEmail);
      setMessage("Saved on this device.");
    } catch {
      setMessage("Could not save on this device.");
    }
  };

  return (
    <section className="daily-save" aria-label="Save daily challenge result">
      <div>
        <span className="eyebrow">Save Result</span>
        <h3>{savedEmail ? `Signed in as ${savedEmail}` : "Create a daily profile"}</h3>
        <p>Store this result with an email and 4 digit PIN.</p>
      </div>
      <div className="daily-save__form">
        <label>
          <span>Email</span>
          <input
            type="email"
            value={email}
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          <span>PIN</span>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            pattern="[0-9]*"
            value={pin}
            autoComplete="current-password"
            onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
          />
        </label>
        <button type="button" className="primary-button" onClick={handleSave}>
          Save
        </button>
      </div>
      {message ? <p className="daily-save__message">{message}</p> : null}
    </section>
  );
}

function bestSeasonForPlayerCategory(playerId: string, category: CategoryKey) {
  return SEASONS.filter((season) => season.playerId === playerId).reduce<PlayerSeason | undefined>(
    (best, season) => {
      if (!best || season.sg[category] > best.sg[category]) return season;
      return best;
    },
    undefined,
  );
}

function playerSeasons(playerId: string) {
  return SEASONS.filter((season) => season.playerId === playerId);
}

// Pick any season from the player's career at random. Used when the guess falls
// short of 4/4 — the reward is a random year rather than their statistical best.
function randomSeasonForPlayer(playerId: string) {
  const seasons = playerSeasons(playerId);
  if (seasons.length === 0) return undefined;
  return seasons[Math.floor(Math.random() * seasons.length)];
}

function optimalCategoryByDailyItem(items: DailyChallengeItem[]) {
  const ideal = new Map<string, CategoryKey>();
  if (items.length !== CATEGORY_ORDER.length) return ideal;

  function permutations<T>(values: T[]): T[][] {
    if (values.length <= 1) return [values];
    return values.flatMap((value, index) =>
      permutations([...values.slice(0, index), ...values.slice(index + 1)]).map((rest) => [
        value,
        ...rest,
      ]),
    );
  }

  let bestTotal = -Infinity;
  let bestOrder = CATEGORY_ORDER;
  for (const order of permutations(CATEGORY_ORDER)) {
    const total = items.reduce((sum, item, index) => {
      return sum + (bestSeasonForPlayerCategory(item.playerId, order[index])?.sg[order[index]] ?? -100);
    }, 0);
    if (total > bestTotal) {
      bestTotal = total;
      bestOrder = order;
    }
  }

  items.forEach((item, index) => ideal.set(item.id, bestOrder[index]));
  return ideal;
}

function DailyChallengeGame({
  challenge,
  onComplete,
  onRestart,
}: {
  challenge: DailyChallenge;
  onComplete: (assignments: SlotAssignment[]) => void;
  onRestart: () => void;
}) {
  const [phase, setPhase] = useState<"browse" | "assign" | "revealed">("assign");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [assignments, setAssignments] = useState<DailyTileAssignment[]>([]);
  // The revealed "ideal slots" result — scrolled into view on Submit so the
  // player lands on their score, not the season playback further down.
  const resultRef = useRef<HTMLDivElement | null>(null);

  const playerNameByItemId = useMemo(() => {
    return new Map(
      challenge.items.map((item) => [
        item.id,
        SEASONS.find((season) => season.playerId === item.playerId)?.player ?? "Unknown Player",
      ]),
    );
  }, [challenge]);

  const idealByItemId = useMemo(() => optimalCategoryByDailyItem(challenge.items), [challenge]);

  const currentItem = challenge.items[currentIndex] ?? challenge.items[0];
  const complete = assignments.length === CATEGORY_ORDER.length;

  // The resolved season behind each slot, decided once at reveal. A perfect 4/4
  // run earns each player's best year in the assigned category; anything less
  // gets a random year from that player's career (spun in below).
  const [resolvedAssignments, setResolvedAssignments] = useState<SlotAssignment[]>([]);
  // How many category tiles in the reveal rail have finished spinning. Each one
  // spins for 500ms before settling and handing off to the next.
  const [spinSettled, setSpinSettled] = useState(0);
  // Forces the rail to re-render mid-spin so the flickering values change.
  const [spinTick, setSpinTick] = useState(0);

  const score = useMemo(() => {
    return assignments.reduce((count, assignment) => {
      return count + (idealByItemId.get(assignment.item.id) === assignment.category ? 1 : 0);
    }, 0);
  }, [assignments, idealByItemId]);

  const rating = dailyRating(score);
  const isBallKnower = score === CATEGORY_ORDER.length;

  // What the run would have scored had every random year been the player's best
  // year in the assigned category. Shown as the target to beat when short of 4/4.
  const idealTotal = useMemo(() => {
    return assignments.reduce((sum, assignment) => {
      const best = bestSeasonForPlayerCategory(assignment.item.playerId, assignment.category);
      return sum + (best ? best.sg[assignment.category] : 0);
    }, 0);
  }, [assignments]);

  const move = (direction: -1 | 1) => {
    setCurrentIndex(
      (index) => (index + direction + challenge.items.length) % challenge.items.length,
    );
  };

  // Assign a strokes-gained category to a clue. Each category lives on exactly
  // one clue and each clue holds exactly one category, so placing a category
  // pulls it off whatever clue held it and clears the target clue's prior pick.
  // Tapping a clue's already-active category clears it.
  const assignCategory = (item: DailyChallengeItem, category: CategoryKey) => {
    if (phase === "revealed") return;
    setAssignments((current) => {
      const isActive = current.some(
        (assignment) => assignment.item.id === item.id && assignment.category === category,
      );
      if (isActive) {
        return current.filter((assignment) => assignment.item.id !== item.id);
      }
      return [
        ...current.filter(
          (assignment) => assignment.category !== category && assignment.item.id !== item.id,
        ),
        { category, item },
      ];
    });
  };

  // Revealing is an explicit, confirmed step: the player taps Submit once all
  // four slots are filled. No auto-lock, so they can re-shuffle picks first.
  const reveal = useCallback(() => {
    if (!complete) return;
    const ballKnower =
      assignments.reduce(
        (count, assignment) =>
          count + (idealByItemId.get(assignment.item.id) === assignment.category ? 1 : 0),
        0,
      ) === CATEGORY_ORDER.length;
    const resolved = assignments
      .map((assignment) => {
        const season = ballKnower
          ? bestSeasonForPlayerCategory(assignment.item.playerId, assignment.category)
          : randomSeasonForPlayer(assignment.item.playerId);
        return season ? { category: assignment.category, season } : undefined;
      })
      .filter((assignment): assignment is SlotAssignment => Boolean(assignment));
    if (resolved.length !== CATEGORY_ORDER.length) return;
    // A perfect run lands settled; a random-year run spins the rail in below.
    setSpinSettled(ballKnower ? CATEGORY_ORDER.length : 0);
    setResolvedAssignments(resolved);
    setPhase("revealed");
    // A perfect run has nothing to spin, so hand off to the season playback (and
    // its FedEx Cup popup) right away. A random-year run defers that until the
    // spin animation finishes — see the spin effect below.
    if (ballKnower) onComplete(resolved);
  }, [assignments, complete, idealByItemId, onComplete]);

  useEffect(() => {
    if (phase !== "revealed") return;
    scrollIntoViewSmooth(resultRef.current, "nearest");
  }, [phase]);

  // Drive the reveal-rail spin for a sub-4/4 run: each category flickers through
  // random years for DAILY_SPIN_STEP_MS, then settles before the next one starts.
  // Once the last one lands, wait DAILY_PLAYBACK_DELAY_MS before surfacing the
  // season playback (and its FedEx Cup popup) so the spin gets to breathe.
  useEffect(() => {
    if (phase !== "revealed" || isBallKnower || resolvedAssignments.length === 0) return;
    const timers: number[] = [];
    const flicker = window.setInterval(() => setSpinTick((tick) => tick + 1), 55);
    timers.push(flicker);
    CATEGORY_ORDER.forEach((_, index) => {
      const settle = window.setTimeout(() => {
        setSpinSettled(index + 1);
        if (index === CATEGORY_ORDER.length - 1) window.clearInterval(flicker);
      }, (index + 1) * DAILY_SPIN_STEP_MS);
      timers.push(settle);
    });
    const surfacePlayback = window.setTimeout(() => {
      onComplete(resolvedAssignments);
    }, CATEGORY_ORDER.length * DAILY_SPIN_STEP_MS + DAILY_PLAYBACK_DELAY_MS);
    timers.push(surfacePlayback);
    return () => {
      timers.forEach((timer) => {
        window.clearTimeout(timer);
        window.clearInterval(timer);
      });
    };
  }, [phase, isBallKnower, resolvedAssignments, onComplete]);

  // Per-category rows for the reveal rail. A settled row shows the resolved
  // season; the one currently spinning flickers through the player's real
  // seasons; rows still queued read "--" until their turn comes up.
  const railRows = CATEGORY_ORDER.map((category, index) => {
    const assignment = resolvedAssignments.find((item) => item.category === category);
    const settled = isBallKnower || index < spinSettled;
    const spinning = !isBallKnower && index === spinSettled;
    let displaySeason = assignment?.season;
    if (spinning && assignment) {
      const pool = playerSeasons(assignment.season.playerId);
      displaySeason = pool.length > 0 ? pool[(spinTick + index) % pool.length] : assignment.season;
    }
    const shown = (settled || spinning) && displaySeason ? displaySeason : undefined;
    return { category, assignment, settled, spinning, season: shown };
  });
  const displayedTotal = railRows.reduce(
    (sum, row) => sum + (row.season ? row.season.sg[row.category] : 0),
    0,
  );

  return (
    <section className="daily-challenge" aria-label={challenge.title}>
      <div className="daily-challenge__head">
        <div>
          <span className="eyebrow">{challenge.date}</span>
          <h1>{challenge.title}</h1>
        </div>
        <button type="button" className="ghost-button" onClick={onRestart}>
          Change Mode
        </button>
      </div>

      {phase === "browse" ? (
        <div className="daily-browser">
          <button
            type="button"
            className="daily-browser__arrow"
            onClick={() => move(-1)}
            aria-label="Previous clue"
          >
            ←
          </button>
          <MediaCard media={currentItem.media} />
          <button
            type="button"
            className="daily-browser__arrow"
            onClick={() => move(1)}
            aria-label="Next clue"
          >
            →
          </button>
          <div className="daily-browser__footer">
            <span>
              {currentIndex + 1}/{challenge.items.length}
            </span>
            <button type="button" className="primary-button" onClick={() => setPhase("assign")}>
              Back to Assignment
            </button>
          </div>
        </div>
      ) : null}

      {phase !== "browse" ? (
        <>
          {phase === "assign" ? (
            <div className="daily-assign-bar">
              <span>{assignments.length}/4 assigned — tap a category on each clue.</span>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setPhase("browse")}
              >
                Expand Images
              </button>
            </div>
          ) : null}

          <div className="daily-tile-grid" aria-label="Daily clue tiles">
            {challenge.items.map((item, index) => {
              const tileNumber = index + 1;
              const ideal = idealByItemId.get(item.id);
              const picked = assignments.find((assignment) => assignment.item.id === item.id);
              const pickedSeason = picked
                ? bestSeasonForPlayerCategory(item.playerId, picked.category)
                : undefined;
              const playerName = playerNameByItemId.get(item.id) ?? "Unknown Player";
              return (
                <div
                  key={item.id}
                  className={`daily-tile ${picked ? "is-assigned" : ""} ${
                    phase === "revealed" ? "is-revealed" : ""
                  }`}
                >
                  {phase === "revealed" ? (
                    <>
                      <MediaCard media={item.media} compact />
                      <span className="daily-tile__reveal">
                        <strong>{playerName}</strong>
                        {/* Only a perfect run earns the year + SG readout here.
                            A random-year run reveals the name only. */}
                        {isBallKnower && pickedSeason && picked ? (
                          <span>
                            {`${pickedSeason.year} ${CATEGORY_META[picked.category].shortLabel} ${formatSg(
                              pickedSeason.sg[picked.category],
                            )}`}
                          </span>
                        ) : null}
                      </span>
                      {picked && ideal ? (
                        <span
                          className={picked.category === ideal ? "daily-pick is-correct" : "daily-pick"}
                        >
                          Picked {ZONE_META[picked.category].label} · Ideal {ZONE_META[ideal].label}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="daily-tile__expand"
                        onClick={() => {
                          setCurrentIndex(index);
                          setPhase("browse");
                        }}
                        aria-label={`Expand clue ${tileNumber}`}
                      >
                        <MediaCard media={item.media} compact />
                      </button>
                      <div
                        className="daily-tile__cats"
                        role="group"
                        aria-label={`Assign a category to clue ${tileNumber}`}
                      >
                        {CATEGORY_ORDER.map((category) => {
                          const meta = CATEGORY_META[category];
                          const isActive = picked?.category === category;
                          // A category can only live on one clue. If another clue
                          // already holds it, lock it here with a grey slash.
                          const takenByOther = assignments.some(
                            (assignment) =>
                              assignment.category === category &&
                              assignment.item.id !== item.id,
                          );
                          return (
                            <button
                              type="button"
                              key={category}
                              className={`daily-cat-chip ${isActive ? "is-active" : ""} ${
                                takenByOther ? "is-taken" : ""
                              }`}
                              aria-pressed={isActive}
                              disabled={takenByOther}
                              aria-label={`${meta.label}${isActive ? " (assigned)" : ""}${
                                takenByOther ? " (already used)" : ""
                              }`}
                              onClick={() => assignCategory(item, category)}
                            >
                              {meta.shortLabel}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {phase === "assign" ? (
            <div className="daily-actions">
              <span>{assignments.length}/4 slots assigned</span>
              <button type="button" className="primary-button" onClick={reveal} disabled={!complete}>
                Submit
              </button>
            </div>
          ) : null}

          {phase === "revealed" ? (
            <div className="daily-result" ref={resultRef}>
              <div className="daily-result__head">
                <span className="eyebrow">{rating}</span>
                <p>
                  {isBallKnower
                    ? "4/4 — You get the best year of their career in the SG Category"
                    : `${score}/4 Ideal Categories — you get a random year from their career. Get them all right and get their best year.`}
                </p>
              </div>
              <div className="playoff-stat-rail daily-profile-rail" aria-label="Daily player profile">
                {railRows.map((row) => {
                  const meta = CATEGORY_META[row.category];
                  const value = row.season?.sg[row.category];
                  return (
                    <div
                      className={`playoff-stat playoff-stat--up daily-profile-stat ${
                        row.spinning ? "is-spinning" : ""
                      }`}
                      key={row.category}
                    >
                      <span className="eyebrow">{meta.shortLabel}</span>
                      <strong className="playoff-stat__value">
                        {value !== undefined ? formatSg(value) : "--"}
                      </strong>
                      <span className="playoff-stat__meta">
                        {row.assignment
                          ? row.season
                            ? `${row.assignment.season.player} · ${row.season.year}`
                            : row.assignment.season.player
                          : "unassigned"}
                      </span>
                    </div>
                  );
                })}
                <div className="playoff-stat playoff-stat--up daily-profile-stat daily-profile-stat--total">
                  <span className="eyebrow">SG Total</span>
                  <strong
                    className={`playoff-stat__value ${
                      displayedTotal < 0 ? "playoff-stat__value--negative" : ""
                    }`}
                  >
                    {formatSg(displayedTotal)}
                  </strong>
                  <span className="playoff-stat__meta">
                    {isBallKnower ? "All categories" : `Ideal: ${formatSg(idealTotal)}`}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

export function StrokesGainedGame() {
  const [gameModeChosen, setGameModeChosen] = useState(false);
  const [gameVariant, setGameVariant] = useState<GameVariant>("classic");
  const [dailyDateKey, setDailyDateKey] = useState(() => easternDateKey());
  const [statsMode, setStatsMode] = useState<StatsMode>("show");
  const [fieldMode, setFieldMode] = useState<FieldMode>("entire");
  const [assignments, setAssignments] = useState<SlotAssignment[]>([]);
  const [dailyAssignments, setDailyAssignments] = useState<SlotAssignment[]>([]);
  const [dailyRunId, setDailyRunId] = useState(0);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);
  const [currentSeason, setCurrentSeason] = useState<PlayerSeason | undefined>();
  const [displayPlayer, setDisplayPlayer] = useState("...");
  const [displayYear, setDisplayYear] = useState("...");
  const [phase, setPhase] = useState<SpinPhase>("player");
  const [mulligans, setMulligans] = useState(0);
  const [needsSpin, setNeedsSpin] = useState(false);
  const [yearMode, setYearMode] = useState<YearMode>("current");
  const [selectedYears, setSelectedYears] = useState<number[]>([LATEST_YEAR]);
  const timers = useRef<number[]>([]);
  const dailyChallenge = useMemo(() => getDailyChallenge(dailyDateKey), [dailyDateKey]);

  const eligibleSeasons = useMemo(() => {
    if (fieldMode === "notables") {
      return SEASONS.filter((season) => NOTABLE_PLAYER_IDS.has(season.playerId));
    }
    if (yearMode === "all") return SEASONS;
    if (yearMode === "current") {
      return SEASONS.filter((season) => season.year === LATEST_YEAR);
    }
    if (selectedYears.length === 0) return [];
    const years = new Set(selectedYears);
    return SEASONS.filter((season) => years.has(season.year));
  }, [fieldMode, selectedYears, yearMode]);

  const eligiblePlayerNames = useMemo(
    () => Array.from(new Set(eligibleSeasons.map((season) => season.player))),
    [eligibleSeasons],
  );

  const complete = assignments.length === CATEGORY_ORDER.length;
  const simulation = useMemo(() => {
    if (!complete) return undefined;
    return simulateSeason(categorySgFromAssignments(assignments), buildSeed(assignments));
  }, [assignments, complete]);
  const dailyComplete = dailyAssignments.length === CATEGORY_ORDER.length;
  const dailySimulation = useMemo(() => {
    if (!dailyComplete) return undefined;
    return simulateSeason(
      categorySgFromAssignments(dailyAssignments),
      buildSeed(dailyAssignments),
    );
  }, [dailyAssignments, dailyComplete]);

  const assignmentByCategory = useMemo(() => {
    return new Map(assignments.map((assignment) => [assignment.category, assignment]));
  }, [assignments]);

  // The slot holding the player from the current spin (if they've been tentatively
  // dropped somewhere). It stays movable until Start Spin locks the pick in.
  const pendingCategory = useMemo(() => {
    if (!needsSpin || !currentSeason) return undefined;
    return assignments.find((assignment) => assignment.season.id === currentSeason.id)?.category;
  }, [assignments, currentSeason, needsSpin]);

  const pendingSeasonId = needsSpin ? currentSeason?.id : undefined;
  const revealedAssignments = useMemo(() => {
    if (!pendingSeasonId) return assignments;
    return assignments.filter((assignment) => assignment.season.id !== pendingSeasonId);
  }, [assignments, pendingSeasonId]);
  const revealedTotalSg = totalSelectedSg(revealedAssignments);

  const clearSpinTimers = useCallback(() => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  }, []);

  const startSpin = useCallback(
    (excludedIds: Set<string>) => {
      clearSpinTimers();
      if (eligibleSeasons.length === 0) {
        setCurrentSeason(undefined);
        setDisplayPlayer("No seasons");
        setDisplayYear("--");
        setPhase("ready");
        return;
      }

      const next = getRandomPlayerSeason(eligibleSeasons, excludedIds);
      setNeedsSpin(false);
      setCurrentSeason(undefined);
      setPhase("player");
      // In Current Year mode every season shares the same year, so the year
      // reel holds steady on that year instead of spinning.
      const staticYear = yearMode === "current";
      setDisplayYear(staticYear ? String(next.season.year) : "...");

      const playerInterval = window.setInterval(() => {
        setDisplayPlayer(
          eligiblePlayerNames[Math.floor(Math.random() * eligiblePlayerNames.length)] ?? next.player,
        );
      }, 58);

      const settlePlayer = window.setTimeout(() => {
        window.clearInterval(playerInterval);
        setDisplayPlayer(next.player);

        if (staticYear) {
          setDisplayYear(String(next.season.year));
          setCurrentSeason(next.season);
          setPhase("ready");
          return;
        }

        setPhase("year");

        const years = next.years.length > 0 ? next.years : [next.season.year];
        const yearInterval = window.setInterval(() => {
          setDisplayYear(String(years[Math.floor(Math.random() * years.length)] ?? next.season.year));
        }, 50);

        const settleYear = window.setTimeout(() => {
          window.clearInterval(yearInterval);
          setDisplayYear(String(next.season.year));
          setCurrentSeason(next.season);
          setPhase("ready");
        }, 500);

        timers.current.push(yearInterval, settleYear);
      }, 1000);

      timers.current.push(playerInterval, settlePlayer);
    },
    [clearSpinTimers, eligiblePlayerNames, eligibleSeasons, yearMode],
  );

  useEffect(() => {
    // Hold off on the reels until a game mode is picked — no spinning behind the
    // chooser on first open.
    if (!gameModeChosen || gameVariant !== "classic") return;
    setAssignments([]);
    setMulligans(0);
    setNeedsSpin(false);
    startSpin(new Set());
    return clearSpinTimers;
  }, [clearSpinTimers, gameModeChosen, gameVariant, selectedYears, startSpin, yearMode]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const nextDateKey = easternDateKey();
      setDailyDateKey((current) => (current === nextDateKey ? current : nextDateKey));
    }, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setDailyAssignments([]);
    setDailyRunId((value) => value + 1);
  }, [dailyChallenge.id]);

  useEffect(() => {
    if (fieldMode === "notables" && yearMode !== "all") {
      setYearMode("all");
    }
  }, [fieldMode, yearMode]);

  const handleYearModeChange = (nextMode: YearMode) => {
    setYearMode(nextMode);
    if (nextMode === "filter" && selectedYears.length === 0) {
      setSelectedYears([LATEST_YEAR]);
    }
  };

  const handleToggleYear = (year: number) => {
    setSelectedYears((years) =>
      years.includes(year)
        ? years.filter((item) => item !== year)
        : [...years, year].sort((a, b) => b - a),
    );
  };

  const handleAssign = (category: CategoryKey) => {
    if (!currentSeason || phase !== "ready" || complete) return;

    const existing = assignmentByCategory.get(category);
    // A slot filled by an earlier, locked pick is off-limits — you can only
    // shuffle the player from the current spin around until you Start Spin.
    if (existing && existing.season.id !== currentSeason.id) return;

    // Clicking the slot the current player already occupies clears it, freeing
    // them to be placed elsewhere (or left unplaced).
    if (existing && existing.season.id === currentSeason.id) {
      setAssignments(assignments.filter((assignment) => assignment.category !== category));
      setNeedsSpin(false);
      return;
    }

    // Otherwise place the current player here, first lifting them out of any
    // slot they were tentatively dropped into this turn.
    const withoutCurrent = assignments.filter(
      (assignment) => assignment.season.id !== currentSeason.id,
    );
    const nextAssignments = [...withoutCurrent, { category, season: currentSeason }];
    setAssignments(nextAssignments);
    setNeedsSpin(nextAssignments.length < CATEGORY_ORDER.length);
  };

  const handleStartSpin = () => {
    if (!needsSpin || complete) return;
    const nextUsedIds = new Set(assignments.map((assignment) => assignment.season.id));
    startSpin(nextUsedIds);
  };

  const handleMulligan = (category: CategoryKey) => {
    const remaining = assignments.filter((assignment) => assignment.category !== category);
    if (remaining.length === assignments.length) return;

    setMulligans((count) => count + 1);
    setAssignments(remaining);
    setNeedsSpin(false);
    const remainingUsedIds = new Set(remaining.map((assignment) => assignment.season.id));
    startSpin(remainingUsedIds);
  };

  const resetGame = () => {
    clearSpinTimers();
    setAssignments([]);
    setMulligans(0);
    setNeedsSpin(false);
    startSpin(new Set());
  };

  const resetDaily = () => {
    setDailyAssignments([]);
    setDailyRunId((value) => value + 1);
  };

  const returnToGameModeSelection = () => {
    clearSpinTimers();
    setResetConfirmOpen(false);
    setGameModeChosen(false);
    setGameVariant("classic");
    setStatsMode("show");
    setFieldMode("entire");
    setAssignments([]);
    setDailyAssignments([]);
    setDailyRunId((value) => value + 1);
    setCurrentSeason(undefined);
    setDisplayPlayer("...");
    setDisplayYear("...");
    setPhase("player");
    setMulligans(0);
    setNeedsSpin(false);
    setYearMode("current");
    setSelectedYears([LATEST_YEAR]);
  };

  return (
    <main className="page-shell">
      {!gameModeChosen ? (
        <GameModeChooser
          statsMode={statsMode}
          yearMode={yearMode}
          fieldMode={fieldMode}
          selectedYears={selectedYears}
          isChange={assignments.length > 0 || mulligans > 0}
          onGameVariant={(mode) => {
            setGameVariant(mode);
            if (mode === "daily") {
              clearSpinTimers();
            }
          }}
          onStatsMode={setStatsMode}
          onYearMode={handleYearModeChange}
          onFieldMode={setFieldMode}
          onToggleYear={handleToggleYear}
          onConfirm={() => setGameModeChosen(true)}
        />
      ) : null}

      <Header
        onResetRequest={() => setResetConfirmOpen(true)}
        onHowToPlay={() => setHowToPlayOpen(true)}
      />

      {resetConfirmOpen ? (
        <ResetConfirmDialog
          onCancel={() => setResetConfirmOpen(false)}
          onConfirm={returnToGameModeSelection}
        />
      ) : null}

      {howToPlayOpen ? <HowToPlayDialog onClose={() => setHowToPlayOpen(false)} /> : null}

      {gameVariant === "daily" ? (
        <>
          <DailyChallengeGame
            key={`${dailyChallenge.id}-${dailyRunId}`}
            challenge={dailyChallenge}
            onComplete={setDailyAssignments}
            onRestart={() => {
              resetDaily();
              setGameModeChosen(false);
            }}
          />
          {dailySimulation ? (
            <SeasonPlayback
              simulation={dailySimulation}
              assignments={dailyAssignments}
              mulligans={0}
              modeChips={["Daily Challenge", dailyChallenge.date]}
              onNewRound={resetDaily}
              suppressInitialScroll
            />
          ) : null}
          {dailySimulation ? <AssignmentStats assignments={dailyAssignments} /> : null}
          <SiteFooter />
        </>
      ) : (
        <>
      <section className="play-layout">
        <div className="play-layout__left">
          <button
            type="button"
            className="ghost-button mode-change-button"
            onClick={() => setGameModeChosen(false)}
          >
            Change Game Mode
          </button>

          <SpinnerPanel
            displayPlayer={displayPlayer}
            displayYear={displayYear}
            phase={phase}
            pickNumber={Math.min(assignments.length + 1, 4)}
            complete={complete}
            showYear={yearMode !== "current"}
            assignmentByCategory={assignmentByCategory}
            needsSpin={needsSpin}
            pendingCategory={pendingCategory}
            statsReveal={
              statsMode === "show" && !complete ? (
                <div className="stat-reveal" aria-label="Current player stats">
                  <StatList season={phase === "ready" ? currentSeason : undefined} />
                </div>
              ) : null
            }
            totalSg={revealedTotalSg}
            onAssign={handleAssign}
            onMulligan={handleMulligan}
            onStartSpin={handleStartSpin}
          />

          <button className={complete ? "primary-button" : "ghost-button"} type="button" onClick={resetGame}>
            New Round
          </button>
        </div>
      </section>

      {simulation ? null : <AssignmentStats assignments={revealedAssignments} />}

      {simulation ? (
        <>
          <SeasonPlayback
            simulation={simulation}
            assignments={assignments}
            mulligans={mulligans}
            modeChips={buildModeChips(statsMode, yearMode, fieldMode, selectedYears)}
            onNewRound={resetGame}
            suppressInitialScroll
          />
        </>
      ) : null}

      <SiteFooter />
        </>
      )}
    </main>
  );
}
