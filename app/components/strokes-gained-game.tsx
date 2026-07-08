"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import rawSeasons from "../lib/data/player-seasons.json";
import { formatCurrency, formatSg, positionLabel, seasonBlurb } from "../lib/format";
import { CATEGORY_META, CATEGORY_ORDER } from "../lib/game/categories";
import {
  buildSeed,
  categorySgFromAssignments,
  optimalCategoryBySeason,
  totalSelectedSg,
} from "../lib/game/scoring";
import { getRandomPlayerSeason } from "../lib/game/selection";
import { simulateSeason } from "../lib/game/simulation";
import type {
  CategoryBreakdown,
  CategoryKey,
  PlayerSeason,
  PlayoffStageResult,
  RegularSeasonSummary,
  SeasonSimulation,
  SlotAssignment,
} from "../lib/game/types";

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

const ZONE_META: Record<CategoryKey, { className: string; label: string }> = {
  offTee: { className: "zone--driving", label: "Driving" },
  approach: { className: "zone--approach", label: "Approach" },
  aroundGreen: { className: "zone--around-green", label: "Around the Green" },
  putting: { className: "zone--putting", label: "Putting" },
};

type SpinPhase = "player" | "year" | "ready";
type YearMode = "current" | "all" | "filter";

// On mobile, gently pull a freshly-revealed block/CTA into view so you don't
// have to scroll to reach the next thing. No-op on wider screens.
function scrollIntoViewOnMobile(
  node: HTMLElement | null,
  block: ScrollLogicalPosition = "start",
) {
  if (!node || typeof window === "undefined") return;
  if (!window.matchMedia("(max-width: 720px)").matches) return;
  node.scrollIntoView({ behavior: "smooth", block });
}

function Header() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <div className="wordmark">Strokes Game</div>
      </div>
    </header>
  );
}

function SpinnerPanel({
  displayPlayer,
  displayYear,
  phase,
  pickNumber,
  complete,
}: {
  displayPlayer: string;
  displayYear: string;
  phase: SpinPhase;
  pickNumber: number;
  complete: boolean;
}) {
  return (
    <section className="spinner-panel" aria-label="Current player and year">
      <div className="spinner-panel__top">
        <span className="eyebrow">Pick {pickNumber} of 4</span>
        <span className="pill">{complete ? "Complete" : phase === "ready" ? "Ready" : "Spinning"}</span>
      </div>
      <div className="spinner-panel__body">
        <div className={`reel reel--player ${phase === "player" ? "is-spinning" : ""}`}>
          <span className="eyebrow">Player</span>
          <strong>{displayPlayer}</strong>
        </div>
        <div className={`reel reel--year ${phase === "year" ? "is-spinning" : ""}`}>
          <span className="eyebrow">Year</span>
          <strong>{displayYear}</strong>
        </div>
      </div>
    </section>
  );
}

function YearFilterControl({
  mode,
  selectedYears,
  onModeChange,
  onToggleYear,
}: {
  mode: YearMode;
  selectedYears: number[];
  onModeChange: (mode: YearMode) => void;
  onToggleYear: (year: number) => void;
}) {
  const selectedLabel =
    selectedYears.length === 0
      ? "No years"
      : selectedYears.length === 1
        ? String(selectedYears[0])
        : `${selectedYears.length} years`;

  return (
    <section className="year-filter" aria-label="Years included">
      <div className="year-filter__tabs">
        <button
          type="button"
          className={mode === "current" ? "is-active" : ""}
          onClick={() => onModeChange("current")}
        >
          Current Year
        </button>
        <button
          type="button"
          className={mode === "all" ? "is-active" : ""}
          onClick={() => onModeChange("all")}
        >
          All Time
        </button>
        <button
          type="button"
          className={mode === "filter" ? "is-active" : ""}
          onClick={() => onModeChange("filter")}
        >
          Filter
        </button>
      </div>

      {mode === "filter" ? (
        <div className="year-filter__drawer">
          <div className="year-filter__summary">
            <span className="eyebrow">Years Included</span>
            <strong>{selectedLabel}</strong>
          </div>
          <div className="year-filter__years">
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
        </div>
      ) : null}
    </section>
  );
}

function StatList({
  season,
  idealCategory,
}: {
  season: PlayerSeason;
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
            <strong>{formatSg(season.sg[category])}</strong>
          </div>
        );
      })}
    </div>
  );
}

function ZoneSlot({
  category,
  assignment,
  onAssign,
  onMulligan,
  disabled,
}: {
  category: CategoryKey;
  assignment?: SlotAssignment;
  onAssign: (category: CategoryKey) => void;
  onMulligan: (category: CategoryKey) => void;
  disabled: boolean;
}) {
  const zone = ZONE_META[category];
  const canAssign = !assignment && !disabled;

  if (assignment) {
    const selectedValue = assignment.season.sg[category];
    return (
      <div
        className={`course-zone ${zone.className} course-zone--filled`}
        aria-label={`${zone.label} filled by ${assignment.season.player}`}
      >
        <span className="course-zone__head">
          <span className="course-zone__label">{zone.label}</span>
          <span className="course-zone__state">Locked</span>
        </span>

        <span className="course-zone__player">
          <strong>{assignment.season.player}</strong>
          <span>{assignment.season.year}</span>
          <em className={selectedValue < 0 ? "negative" : ""}>{formatSg(selectedValue)}</em>
        </span>

        <button
          type="button"
          className="mulligan-button"
          onClick={() => onMulligan(category)}
          aria-label={`Mulligan ${zone.label} — drop ${assignment.season.player} and respin`}
        >
          Mulligan
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`course-zone ${zone.className}`}
      disabled={!canAssign}
      onClick={() => onAssign(category)}
      aria-label={`Assign current player to ${zone.label}`}
    >
      <span className="course-zone__head">
        <span className="course-zone__label">{zone.label}</span>
        <span className="course-zone__state">{canAssign ? "Assign" : "Wait"}</span>
      </span>
      <span className="course-zone__empty" />
    </button>
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

function CourseBoard({
  assignmentByCategory,
  onAssign,
  onMulligan,
  disabled,
  mulligans,
}: {
  assignmentByCategory: Map<CategoryKey, SlotAssignment>;
  onAssign: (category: CategoryKey) => void;
  onMulligan: (category: CategoryKey) => void;
  disabled: boolean;
  mulligans: number;
}) {
  return (
    <section className="course-board" aria-label="Golf category board">
      <div className="course-board__art">
        <img src="/Golf Game Drawing.webp" alt="" className="course-board__image" />
      </div>
      <div className="course-zone-rail">
        {[...CATEGORY_ORDER].reverse().map((category) => (
          <ZoneSlot
            key={category}
            category={category}
            assignment={assignmentByCategory.get(category)}
            onAssign={onAssign}
            onMulligan={onMulligan}
            disabled={disabled}
          />
        ))}
      </div>
      <div className="mulligan-rail" aria-label={`Mulligans used: ${mulligans}`}>
        {Array.from({ length: mulligans }).map((_, index) => (
          <img
            key={index}
            src="/Groundhog Image.png"
            alt="Mulligan used"
            className="mulligan-rail__stamp"
          />
        ))}
      </div>
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
  eventNumber,
  isCurrent,
  continueLabel,
  blockRef,
  onContinue,
}: {
  stage: PlayoffStageResult;
  eventNumber: number;
  isCurrent: boolean;
  continueLabel: string;
  blockRef?: (node: HTMLElement | null) => void;
  onContinue: () => void;
}) {
  const [settledCount, setSettledCount] = useState(0);
  const order = CATEGORY_ORDER;
  const revealCount = Math.min(settledCount + 1, order.length);
  const summaryReady = settledCount >= order.length;
  const continueRef = useRef<HTMLButtonElement | null>(null);

  const byCategory = useMemo(
    () => new Map(stage.categories.map((item) => [item.category, item])),
    [stage],
  );

  // Once the stats settle, pull the CTA into view on mobile.
  useEffect(() => {
    if (summaryReady && isCurrent) {
      scrollIntoViewOnMobile(continueRef.current, "center");
    }
  }, [summaryReady, isCurrent]);

  return (
    <section className="playoff-block" aria-label={stage.event.name} ref={blockRef}>
      <div className="playoff-block__head">
        <span className="eyebrow">Playoff Event {eventNumber} of 3</span>
        <h3>{stage.event.name}</h3>
        <span className="playoff-block__seed">Enter as No. {stage.rankBefore}</span>
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
              <strong>{positionLabel(stage.position)}</strong>
            </div>
            <div>
              <span className="eyebrow">FedEx Points</span>
              <strong>{stage.fedExPoints}</strong>
            </div>
            <div>
              <span className="eyebrow">FedEx Position</span>
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
          </div>
          {isCurrent ? (
            <button
              type="button"
              className="primary-button"
              onClick={onContinue}
              ref={continueRef}
            >
              {continueLabel}
            </button>
          ) : null}
        </div>
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
      <div className="playoff-summary__grid playoff-summary__grid--trio">
        <div>
          <span className="eyebrow">FedEx Points</span>
          <strong>{summary.points.toLocaleString()}</strong>
        </div>
        <div>
          <span className="eyebrow">Regular-Season Rank</span>
          <strong>No. {summary.rank}</strong>
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
        <button type="button" className="primary-button" onClick={onContinue}>
          {summary.madePlayoffs ? "Enter the FedEx Cup Playoffs" : "See the final standings"}
        </button>
      ) : null}
    </section>
  );
}

function FinalBlock({
  simulation,
  blockRef,
  onNewRound,
}: {
  simulation: SeasonSimulation;
  blockRef?: (node: HTMLElement | null) => void;
  onNewRound: () => void;
}) {
  const wins = simulation.results.filter((result) => result.position === 1);
  const [eventsOpen, setEventsOpen] = useState(false);

  return (
    <section
      className="playoff-block playoff-block--final"
      aria-label="Final standings"
      ref={blockRef}
    >
      <div className="fedex-bar fedex-bar--final">
        <div>
          <span className="eyebrow">FedEx Cup Position</span>
          <strong>No. {simulation.fedExRank}</strong>
        </div>
        <div>
          <span className="eyebrow">Season Earnings</span>
          <strong>{formatCurrency(simulation.earnings)}</strong>
        </div>
      </div>
      <div className="playoff-block__head">
        <span className="eyebrow">{simulation.status.label}</span>
        <h3>{simulation.status.headline}</h3>
      </div>
      <p className="playoff-block__detail">{simulation.status.detail}</p>
      <p className="playoff-block__detail">{seasonBlurb(simulation)}</p>

      <div className="playoff-summary__grid playoff-summary__grid--final">
        <div>
          <span className="eyebrow">Final FedEx</span>
          <strong>No. {simulation.fedExRank}</strong>
        </div>
        <div>
          <span className="eyebrow">Wins</span>
          <strong>{wins.length}</strong>
        </div>
        <div>
          <span className="eyebrow">Total Earnings</span>
          <strong>{formatCurrency(simulation.earnings)}</strong>
        </div>
        <div>
          <span className="eyebrow">FedEx Tier</span>
          <strong className="playoff-summary__tier">{simulation.status.tier}</strong>
        </div>
      </div>

      {wins.length > 0 ? (
        <div className="wins-strip" aria-label="Wins">
          {wins.map((result) => (
            <span key={result.event.id}>{result.event.name}</span>
          ))}
        </div>
      ) : null}

      <button type="button" className="primary-button playoff-block__reset" onClick={onNewRound}>
        New Round
      </button>
    </section>
  );
}

function TournamentLog({ simulation }: { simulation: SeasonSimulation }) {
  const [eventsOpen, setEventsOpen] = useState(false);

  return (
    <div className="event-accordion event-accordion--standalone">
      <button
        type="button"
        className="event-accordion__trigger"
        onClick={() => setEventsOpen((open) => !open)}
        aria-expanded={eventsOpen}
      >
        <span>Full Season Results</span>
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
            {simulation.results.map((result) => (
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
                <td>{result.madeCut ? positionLabel(result.position) : "MC"}</td>
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

function SeasonPlayback({
  simulation,
  onNewRound,
}: {
  simulation: SeasonSimulation;
  onNewRound: () => void;
}) {
  const stages = simulation.playoffStages;
  // step 0 = regular season; 1..stages.length = playoff events; stages.length+1
  // = final standings. Blocks with index <= step are revealed; the newest one
  // runs its spin animation and owns the "Continue" button.
  const [step, setStep] = useState(0);
  const finalStep = stages.length + 1;

  // Tracks the block that just became current, so we can scroll to it on mobile.
  // Ignore the detach call (null) so the newly-mounted block wins the race.
  const currentRef = useRef<HTMLElement | null>(null);
  const setCurrentRef = useCallback((node: HTMLElement | null) => {
    if (node) currentRef.current = node;
  }, []);

  // Reset the playback whenever a brand-new season is simulated.
  useEffect(() => {
    setStep(0);
  }, [simulation]);

  // On mobile, push the freshly-revealed block into view after each advance so
  // you don't have to scroll to reach the next CTA. Skip the initial render.
  useEffect(() => {
    if (step === 0) return;
    scrollIntoViewOnMobile(currentRef.current, "start");
  }, [step]);

  const advance = useCallback(() => setStep((value) => value + 1), []);

  const continueLabelFor = (index: number) => {
    const stage = stages[index];
    if (stage.isFinale || !stage.advanced) return "See the final standings";
    return `On to the ${stages[index + 1].event.name}`;
  };

  return (
    <section className="playback" aria-label="Season playback">
      <div className="playback__stack">
        <RegularSeasonBlock
          summary={simulation.regularSeason}
          isCurrent={step === 0}
          onContinue={advance}
        />

        <TournamentLog simulation={simulation} />

        {stages.map((stage, index) =>
          step >= index + 1 ? (
            <PlayoffStageBlock
              key={stage.event.id}
              stage={stage}
              eventNumber={index + 1}
              isCurrent={step === index + 1}
              continueLabel={continueLabelFor(index)}
              blockRef={step === index + 1 ? setCurrentRef : undefined}
              onContinue={advance}
            />
          ) : null,
        )}

        {step >= finalStep ? (
          <FinalBlock simulation={simulation} blockRef={setCurrentRef} onNewRound={onNewRound} />
        ) : null}
      </div>
    </section>
  );
}

export function StrokesGainedGame() {
  const [assignments, setAssignments] = useState<SlotAssignment[]>([]);
  const [currentSeason, setCurrentSeason] = useState<PlayerSeason | undefined>();
  const [displayPlayer, setDisplayPlayer] = useState("...");
  const [displayYear, setDisplayYear] = useState("...");
  const [phase, setPhase] = useState<SpinPhase>("player");
  const [mulligans, setMulligans] = useState(0);
  const [yearMode, setYearMode] = useState<YearMode>("all");
  const [selectedYears, setSelectedYears] = useState<number[]>([LATEST_YEAR]);
  const timers = useRef<number[]>([]);

  const eligibleSeasons = useMemo(() => {
    if (yearMode === "all") return SEASONS;
    if (yearMode === "current") {
      return SEASONS.filter((season) => season.year === LATEST_YEAR);
    }
    if (selectedYears.length === 0) return [];
    const years = new Set(selectedYears);
    return SEASONS.filter((season) => years.has(season.year));
  }, [selectedYears, yearMode]);

  const eligiblePlayerNames = useMemo(
    () => Array.from(new Set(eligibleSeasons.map((season) => season.player))),
    [eligibleSeasons],
  );

  const usedSeasonIds = useMemo(
    () => new Set(assignments.map((assignment) => assignment.season.id)),
    [assignments],
  );
  const complete = assignments.length === CATEGORY_ORDER.length;
  const totalSg = totalSelectedSg(assignments);
  const simulation = useMemo(() => {
    if (!complete) return undefined;
    return simulateSeason(categorySgFromAssignments(assignments), buildSeed(assignments));
  }, [assignments, complete]);

  const assignmentByCategory = useMemo(() => {
    return new Map(assignments.map((assignment) => [assignment.category, assignment]));
  }, [assignments]);

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
    setAssignments([]);
    setMulligans(0);
    startSpin(new Set());
    return clearSpinTimers;
  }, [clearSpinTimers, selectedYears, startSpin, yearMode]);

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
    if (!currentSeason || phase !== "ready" || assignmentByCategory.has(category) || complete) {
      return;
    }

    const nextAssignments = [...assignments, { category, season: currentSeason }];
    setAssignments(nextAssignments);

    if (nextAssignments.length < CATEGORY_ORDER.length) {
      const nextUsedIds = new Set([...usedSeasonIds, currentSeason.id]);
      startSpin(nextUsedIds);
    }
  };

  const handleMulligan = (category: CategoryKey) => {
    const remaining = assignments.filter((assignment) => assignment.category !== category);
    if (remaining.length === assignments.length) return;

    setMulligans((count) => count + 1);
    setAssignments(remaining);
    const remainingUsedIds = new Set(remaining.map((assignment) => assignment.season.id));
    startSpin(remainingUsedIds);
  };

  const resetGame = () => {
    clearSpinTimers();
    setAssignments([]);
    setMulligans(0);
    startSpin(new Set());
  };

  return (
    <main className="page-shell">
      <Header />

      <section className="play-layout">
        <div className="play-layout__left">
          <YearFilterControl
            mode={yearMode}
            selectedYears={selectedYears}
            onModeChange={handleYearModeChange}
            onToggleYear={handleToggleYear}
          />

          <SpinnerPanel
            displayPlayer={displayPlayer}
            displayYear={displayYear}
            phase={phase}
            pickNumber={Math.min(assignments.length + 1, 4)}
            complete={complete}
          />

          <div className="score-strip compact" aria-label="Run status">
            <div>
              <span className="eyebrow">Slots</span>
              <strong>{assignments.length}/4</strong>
            </div>
            <div>
              <span className="eyebrow">Total SG</span>
              <strong>{formatSg(totalSg)}</strong>
            </div>
          </div>
          <button className={complete ? "primary-button" : "ghost-button"} type="button" onClick={resetGame}>
            New Round
          </button>
        </div>

        <CourseBoard
          assignmentByCategory={assignmentByCategory}
          onAssign={handleAssign}
          onMulligan={handleMulligan}
          disabled={phase !== "ready" || complete}
          mulligans={mulligans}
        />
      </section>

      {simulation ? null : <AssignmentStats assignments={assignments} />}

      {simulation ? (
        <>
          <SeasonPlayback simulation={simulation} onNewRound={resetGame} />
          <AssignmentStats assignments={assignments} />
        </>
      ) : null}
    </main>
  );
}
