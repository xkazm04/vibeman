/**
 * Brain Configuration Constants
 *
 * Single source of truth for all tunable brain subsystem parameters.
 * Contributors: adjust values here instead of hunting through multiple files.
 */

// ---------------------------------------------------------------------------
// Time Conversion
// ---------------------------------------------------------------------------

/** Milliseconds in one day — avoids repeated 24 * 60 * 60 * 1000 expressions. */
export const MS_PER_DAY = 24 * 60 * 60 * 1000; // 86 400 000

// ---------------------------------------------------------------------------
// Default Time Windows
// ---------------------------------------------------------------------------
// These are the default lookback windows used across API routes, repositories,
// and the reflection prompt builder. Each window has a specific analytical
// purpose — changing one may affect the quality of anomaly detection,
// correlation analysis, or effectiveness scoring.

/** Maximum window (days) accepted by any API query param. */
export const MAX_WINDOW_DAYS = 365;

/** Default window for behavioral context queries (days).
 *  Short (7 d) so context reflects recent activity, not stale history.
 *  Used by: /api/brain/context, /api/brain/dashboard, repository defaults. */
export const CONTEXT_WINDOW_DAYS = 7;

/** Anomaly baseline window (days). Needs ~30 d of data to compute
 *  meaningful daily averages for z-score comparison.
 *  Used by: /api/brain/anomalies (baselineDays param default). */
export const ANOMALY_BASELINE_DAYS = 30;

/** Anomaly current window (days). Short (3 d) to detect recent deviations
 *  from the 30-day baseline. Widening this smooths out real anomalies.
 *  Used by: /api/brain/anomalies (windowDays param default). */
export const ANOMALY_WINDOW_DAYS = 3;

/** Correlation analysis window (days). 14 d balances signal density
 *  against recency — too short yields noisy correlations, too long dilutes them.
 *  Used by: /api/brain/correlations. */
export const CORRELATION_WINDOW_DAYS = 14;

/** Effectiveness scoring window (days). 90 d gives enough pre/post direction
 *  data to score insight impact reliably.
 *  Used by: /api/brain/insights/effectiveness, effectiveness cache repo. */
export const EFFECTIVENESS_WINDOW_DAYS = 90;

/** Heatmap lookback window (days). 90 d provides a full quarter of daily
 *  signal data for the calendar-style heatmap.
 *  Used by: /api/brain/signals/heatmap, behavioralSignalDb.getDailyHeatmap. */
export const HEATMAP_WINDOW_DAYS = 90;

/** Temporal (hour×day) aggregation window (days). 30 d is one developer-month
 *  of rhythm data — enough to spot weekly patterns.
 *  Used by: /api/brain/signals/temporal, behavioralSignalDb.getTemporalAggregation. */
export const TEMPORAL_WINDOW_DAYS = 30;

/** Outcomes & implementation stats window (days). 30 d matches the standard
 *  sprint/monthly review cadence.
 *  Used by: /api/brain/outcomes, /api/brain/dashboard, reflectionPromptBuilder. */
export const OUTCOMES_WINDOW_DAYS = 30;

/** Global reflection outcome window (days). 60 d gives cross-project
 *  reflections twice the data of per-project ones for portfolio-level trends.
 *  Used by: reflectionPromptBuilder.gatherGlobalReflectionData. */
export const GLOBAL_REFLECTION_OUTCOME_WINDOW_DAYS = 60;

// ---------------------------------------------------------------------------
// Reflection Prompt Builder
// ---------------------------------------------------------------------------

/** Lookback window (days) for gathering reflection data (git, signals, logs).
 *  Aligns with OUTCOMES_WINDOW_DAYS so outcome stats and signal counts
 *  cover the same period. */
export const REFLECTION_DATA_WINDOW_DAYS = 30;

/** Default max directions fed into a single reflection data gathering pass. */
export const REFLECTION_MAX_DIRECTIONS_FETCH = 30;

/** Max context signals fetched for reflection analysis. */
export const REFLECTION_MAX_CONTEXT_SIGNALS = 100;

/** Max previous insights loaded to prevent duplicate generation. */
export const REFLECTION_MAX_PREVIOUS_INSIGHTS = 100;

/** Timeout for git operations during reflection data gathering (ms).
 *  5 s prevents git hangs from blocking reflection startup. */
export const REFLECTION_GIT_TIMEOUT_MS = 5_000;

/** Max git commits fetched during reflection data gathering. */
export const REFLECTION_MAX_COMMITS_FETCH = 30;

/** Max git commits included in the reflection prompt text. */
export const REFLECTION_PROMPT_MAX_COMMITS = 20;

// ---------------------------------------------------------------------------
// Signal Decay
// ---------------------------------------------------------------------------

/** Multiplier applied to signal weight on each decay pass (0.8–0.99).
 *  Lower = faster decay. 0.9 means signals lose 10% weight per pass. */
export const DEFAULT_DECAY_FACTOR = 0.9;

/** How many days of signals to keep before hard-deleting (7–90).
 *  Signals older than this are removed entirely during cleanup. */
export const DEFAULT_RETENTION_DAYS = 30;

/** Valid range for decay factor — UI sliders and API validation clamp to this. */
export const DECAY_FACTOR_MIN = 0.8;
export const DECAY_FACTOR_MAX = 0.99;

/** Valid range for retention days. */
export const RETENTION_DAYS_MIN = 7;
export const RETENTION_DAYS_MAX = 90;

/** Fraction of retentionDays used to calculate when decay starts.
 *  E.g., 0.2 means signals begin decaying after 20% of their retention window.
 *  Ensures gradual weight reduction across the full retention period. */
export const DECAY_START_FRACTION = 0.2;

/** Minimum decay start days — prevents decay from starting immediately. */
export const DECAY_START_MIN_DAYS = 1;

// ---------------------------------------------------------------------------
// Context Cache
// ---------------------------------------------------------------------------

/** Max entries in the behavioral-context LRU cache (brainService). */
export const CONTEXT_CACHE_MAX_ENTRIES = 200;

/** How long a cached behavioral-context entry stays fresh (ms).
 *  60 s is short enough that signal recording triggers a near-real-time refresh. */
export const CONTEXT_CACHE_TTL_MS = 60 * 1000; // 60 seconds

// ---------------------------------------------------------------------------
// Effectiveness Cache
// ---------------------------------------------------------------------------

/** TTL for insight-effectiveness cache rows in the DB (ms).
 *  24 h balances freshness against the O(insights × directions) compute cost. */
export const EFFECTIVENESS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ---------------------------------------------------------------------------
// Canvas / Signal Fetching
// ---------------------------------------------------------------------------

/** Maximum number of signals fetched for the Memory Canvas view. */
export const MAX_CANVAS_SIGNALS = 200;

/** How far back (days) the Memory Canvas looks for signals. */
export const CANVAS_WINDOW_DAYS = 14;

/** Polling interval for canvas signal refresh (ms). */
export const CANVAS_REFRESH_INTERVAL_MS = 30_000;

// ---------------------------------------------------------------------------
// Reflection
// ---------------------------------------------------------------------------

/** Number of decisions before an automatic reflection is suggested. */
export const REFLECTION_TRIGGER_THRESHOLD = 20;

/** Minimum gap between reflections (hours). Prevents runaway reflection loops. */
export const REFLECTION_MIN_GAP_HOURS = 24;

/** Max decisions fed into a single reflection prompt. */
export const REFLECTION_MAX_DECISIONS = 30;

/** Global reflection trigger: total decisions across all projects. */
export const GLOBAL_REFLECTION_TRIGGER_THRESHOLD = 50;

/** Minimum gap between global reflections (hours).
 *  3 days prevents excessive cross-project analysis. */
export const GLOBAL_REFLECTION_MIN_GAP_HOURS = 72;

/** Max projects included in a single global reflection. */
export const GLOBAL_REFLECTION_MAX_PROJECTS = 10;

/** Max directions analyzed per project during global reflection. */
export const GLOBAL_REFLECTION_MAX_DIRECTIONS_PER_PROJECT = 15;

// ---------------------------------------------------------------------------
// Signal Deduplication
// ---------------------------------------------------------------------------

/** Time window for suppressing duplicate signals (ms).
 *  Identical signals within this window are silently dropped. */
export const SIGNAL_DEDUP_WINDOW_MS = 60_000; // 60 seconds

/** Max gap between context-focus signals before a transition is recorded (ms).
 *  Signals separated by more than this are treated as independent sessions. */
export const CONTEXT_TRANSITION_MAX_GAP_MS = 60 * 60 * 1000; // 1 hour

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

/** How far back (days) the Timeline mini-view looks for signals.
 *  Shorter than CANVAS_WINDOW_DAYS for a denser, more recent view. */
export const TIMELINE_WINDOW_DAYS = 7;

// ---------------------------------------------------------------------------
// Signal Weight — minimum threshold
// ---------------------------------------------------------------------------

/** Signals with weight at or below this are considered fully decayed.
 *  The decay SQL query skips them (`weight > SIGNAL_MIN_WEIGHT`). */
export const SIGNAL_MIN_WEIGHT = 0.01;

// ---------------------------------------------------------------------------
// Signal Weights — per-type heuristics
// ---------------------------------------------------------------------------

/** Weight assigned to an accepted idea decision (Tinder swipe right). */
export const WEIGHT_IDEA_ACCEPTED = 0.8;
/** Weight assigned to a rejected idea decision (Tinder swipe left). */
export const WEIGHT_IDEA_REJECTED = 0.3;

/** Weight for goal lifecycle signals that include a status transition. */
export const WEIGHT_GOAL_TRANSITION = 1.0;
/** Weight for goal lifecycle signals without a transition. */
export const WEIGHT_GOAL_NO_TRANSITION = 0.5;

/** Weight for a successful cross-task analysis. */
export const WEIGHT_CROSS_TASK_SUCCESS = 2.0;
/** Weight for a failed cross-task analysis. */
export const WEIGHT_CROSS_TASK_FAILURE = 1.0;
/** Weight for a user-selected cross-task implementation plan. */
export const WEIGHT_CROSS_TASK_SELECTION = 1.5;

/** Git activity weights — tiered by change size. */
export const WEIGHT_GIT_HEAVY = 2.0;
export const WEIGHT_GIT_MODERATE = 1.5;
export const WEIGHT_GIT_LIGHT = 1.0;
export const GIT_HEAVY_FILES_THRESHOLD = 10;
export const GIT_HEAVY_LINES_THRESHOLD = 500;
export const GIT_MODERATE_FILES_THRESHOLD = 5;
export const GIT_MODERATE_LINES_THRESHOLD = 100;

/** API focus weights — tiered by usage/error rate. */
export const WEIGHT_API_HIGH_ERROR = 2.0;
export const WEIGHT_API_HEAVY_USAGE = 1.8;
export const WEIGHT_API_MODERATE_USAGE = 1.5;
export const WEIGHT_API_LIGHT = 1.0;
export const API_ERROR_RATE_THRESHOLD = 10;
export const API_HEAVY_CALL_THRESHOLD = 100;
export const API_MODERATE_CALL_THRESHOLD = 50;

/** API batch weights (simplified tiers). */
export const API_BATCH_HEAVY_THRESHOLD = 100;
export const API_BATCH_MODERATE_THRESHOLD = 10;
export const WEIGHT_API_BATCH_HEAVY = 2.0;
export const WEIGHT_API_BATCH_MODERATE = 1.5;
export const WEIGHT_API_BATCH_LIGHT = 1.0;

/** Context focus weights — tiered by engagement duration. */
export const WEIGHT_CONTEXT_HEAVY = 2.0;
export const WEIGHT_CONTEXT_MODERATE = 1.5;
export const WEIGHT_CONTEXT_LIGHT = 1.0;
export const CONTEXT_HEAVY_DURATION_MINUTES = 5;
export const CONTEXT_MODERATE_DURATION_MINUTES = 10;

/** Implementation weights — tiered by file count. */
export const WEIGHT_IMPL_MANY_FILES = 2.5;
export const WEIGHT_IMPL_MODERATE_FILES = 2.0;
export const WEIGHT_IMPL_SUCCESS = 1.5;
export const WEIGHT_IMPL_FAILURE = 1.0;
export const IMPL_MANY_FILES_THRESHOLD = 10;
export const IMPL_MODERATE_FILES_THRESHOLD = 5;

/** CLI memory weights — by category. Higher = more influence on behavioral context. */
export const WEIGHT_CLI_DECISION = 2.0;
export const WEIGHT_CLI_PATTERN = 1.8;
export const WEIGHT_CLI_INSIGHT = 1.5;
export const WEIGHT_CLI_LESSON = 1.5;
export const WEIGHT_CLI_CONTEXT = 1.2;
export const WEIGHT_CLI_DEFAULT = 1.5;

// ---------------------------------------------------------------------------
// CLI Memory — task-outcome producer + assembler reader bounds
// ---------------------------------------------------------------------------
// Every finished CLI task emits ONE bounded cli_memory signal (produced from the
// durable task_outcome, migration 237). The assembler reads recent cli_memory
// back into the next execution prompt so the fleet learns across runs. All
// bounds here are hard caps that keep both the stored signal and the injected
// prompt section token-bounded — never let outcome data grow unboundedly.

/** Hard cap on the persisted cli_memory `message` length (chars). */
export const CLI_MEMORY_MAX_MESSAGE_CHARS = 280;
/** Hard cap on the error snippet folded into a failed-run cli_memory (chars). */
export const CLI_MEMORY_MAX_ERROR_CHARS = 140;
/** Max changed-file names attached to a cli_memory signal. */
export const CLI_MEMORY_MAX_FILES = 5;
/** Max recent cli_memory entries the assembler injects into one prompt. */
export const CLI_MEMORY_ASSEMBLER_MAX_ENTRIES = 5;
/** Per-entry char cap when the assembler renders a cli_memory line. */
export const CLI_MEMORY_ASSEMBLER_MAX_CHARS = 160;

// ---------------------------------------------------------------------------
// Effectiveness Scoring
// ---------------------------------------------------------------------------

/** Score above which an insight is classified as 'helpful'. */
export const EFFECTIVENESS_HELPFUL_THRESHOLD = 10;
/** Score below which an insight is classified as 'misleading'. */
export const EFFECTIVENESS_MISLEADING_THRESHOLD = -10;

// ---------------------------------------------------------------------------
// Reflection Fallback Triggers
// ---------------------------------------------------------------------------

/** Minimum decisions for initial reflection (no prior reflection exists). */
export const REFLECTION_INITIAL_DECISIONS_MIN = 10;
/** Days without reflection before weekly fallback kicks in. */
export const REFLECTION_WEEKLY_FALLBACK_DAYS = 7;
/** Minimum decisions needed alongside weekly fallback. */
export const REFLECTION_WEEKLY_DECISIONS_MIN = 5;

// ---------------------------------------------------------------------------
// Concurrency
// ---------------------------------------------------------------------------

/** How long a reflection-completion lock is held before auto-expiring (ms).
 *  Guards against zombie locks from crashed completions. */
export const COMPLETION_LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// ---------------------------------------------------------------------------
// Reflection Timeout
// ---------------------------------------------------------------------------

/** How long a reflection can stay in 'running' state before being auto-failed (ms).
 *  Prevents stuck reflections from permanently blocking new ones after crashes. */
export const REFLECTION_RUNNING_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
