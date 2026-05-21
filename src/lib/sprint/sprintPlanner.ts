/**
 * Sprint Planner Engine
 *
 * Pure functions that turn the existing predictive-standup outputs (velocity
 * metrics + task recommendations) into a week-level sprint plan with a
 * Monte Carlo confidence band and burnout-aware day allocation.
 *
 * No I/O, no React. The API route in /api/sprint/plan composes these with
 * the existing standup engine outputs.
 */

import type {
  TaskRecommendation,
  VelocityMetrics,
} from '@/app/db/models/standup.types';

// ── Tuning constants ─────────────────────────────────────────────────────────

/** Complexity → effort weight units. Light is the baseline. */
export const COMPLEXITY_WEIGHT: Record<TaskRecommendation['estimatedComplexity'], number> = {
  light: 1,
  medium: 2,
  heavy: 3,
};

/** Per-day weight caps mapping to burnout risk bands. */
const BURNOUT_THRESHOLDS = {
  low: 4,    // 0..4 weight units per day → low risk
  medium: 6, // 5..6 → medium
  // anything above 6 → high
} as const;

export type BurnoutLevel = 'low' | 'medium' | 'high';

export function burnoutLevel(weight: number): BurnoutLevel {
  if (weight <= BURNOUT_THRESHOLDS.low) return 'low';
  if (weight <= BURNOUT_THRESHOLDS.medium) return 'medium';
  return 'high';
}

// ── Monte Carlo: sprint completion probability ───────────────────────────────

export interface SprintSimulation {
  /** Tasks expected to finish at the 10th / 50th / 90th percentile. */
  p10: number;
  p50: number;
  p90: number;
  /** Probability (0..1) that all `taskCount` tasks finish within the sprint. */
  completionProbability: number;
  /** Number of Monte Carlo runs (for caller diagnostics). */
  runs: number;
}

/**
 * Monte Carlo simulation of how many tasks the sprint completes.
 *
 * Each simulated day samples from a normal distribution around the velocity
 * mean (implementationsPerDay) with a standard deviation derived from the
 * inverse of successRate (lower success → wider variance).
 *
 * Returns the percentile completion counts and the probability that the
 * planned `taskCount` is achieved within `sprintDays`.
 */
export function simulateSprintCompletion(
  velocity: VelocityMetrics,
  taskCount: number,
  sprintDays: number = 5,
  runs: number = 1000,
): SprintSimulation {
  const mean = Math.max(0, velocity.implementationsPerDay);
  // Success rate is 0..1; lower success means more variance. Floor at 0.1.
  const reliability = Math.max(0.1, Math.min(1, velocity.successRate || 0.7));
  const stdDev = mean * (1 - reliability) + 0.25; // never zero variance

  if (mean === 0 && stdDev <= 0.25) {
    // No history → flat zero-completion estimate
    return { p10: 0, p50: 0, p90: 0, completionProbability: 0, runs };
  }

  const completions = new Array<number>(runs);
  for (let i = 0; i < runs; i++) {
    let total = 0;
    for (let d = 0; d < sprintDays; d++) {
      total += Math.max(0, sampleNormal(mean, stdDev));
    }
    completions[i] = total;
  }
  completions.sort((a, b) => a - b);

  const pct = (q: number) => completions[Math.min(runs - 1, Math.floor(runs * q))];
  const succeeded = completions.filter(c => c >= taskCount).length;

  return {
    p10: roundOneDecimal(pct(0.1)),
    p50: roundOneDecimal(pct(0.5)),
    p90: roundOneDecimal(pct(0.9)),
    completionProbability: taskCount > 0 ? succeeded / runs : 1,
    runs,
  };
}

// ── Week distribution ───────────────────────────────────────────────────────

export interface DaySlot {
  /** 0-indexed day of the sprint (0 = first day). */
  index: number;
  /** Sorted bucket of tasks placed in this day. */
  tasks: TaskRecommendation[];
  /** Sum of COMPLEXITY_WEIGHT for the placed tasks. */
  weight: number;
  /** Derived burnout band for the day. */
  burnout: BurnoutLevel;
}

/**
 * Distribute task recommendations across `sprintDays` days, packing heaviest
 * tasks first into the least-loaded day (best-fit decreasing). The result is
 * an even-but-burnout-aware schedule: a 'heavy' task pulls forward to spread
 * the load, and any one day's cap is respected unless every day is at cap.
 *
 * Tasks already specifying a `suggestedSlot` of 'morning' bias toward earlier
 * days when ties exist, since the moonshot framing is "front-load high-focus
 * work."
 */
export function distributeAcrossWeek(
  recommendations: TaskRecommendation[],
  sprintDays: number = 5,
): DaySlot[] {
  const days: DaySlot[] = Array.from({ length: sprintDays }, (_, i) => ({
    index: i,
    tasks: [],
    weight: 0,
    burnout: 'low',
  }));

  // Sort by complexity desc, then priority desc — heavy + important first
  const sorted = [...recommendations].sort((a, b) => {
    const wDiff = COMPLEXITY_WEIGHT[b.estimatedComplexity] - COMPLEXITY_WEIGHT[a.estimatedComplexity];
    if (wDiff !== 0) return wDiff;
    return (b.priorityScore ?? 0) - (a.priorityScore ?? 0);
  });

  for (const task of sorted) {
    const w = COMPLEXITY_WEIGHT[task.estimatedComplexity];

    // Pick the day with the least current weight; on ties pick the earlier
    // day if the task is morning-slotted, else later (spread medium-load work)
    let bestIdx = 0;
    for (let i = 1; i < days.length; i++) {
      if (days[i].weight < days[bestIdx].weight) {
        bestIdx = i;
      } else if (days[i].weight === days[bestIdx].weight) {
        if (task.suggestedSlot === 'morning' && i < bestIdx) bestIdx = i;
        if (task.suggestedSlot === 'afternoon' && i > bestIdx) bestIdx = i;
      }
    }

    days[bestIdx].tasks.push(task);
    days[bestIdx].weight += w;
  }

  for (const d of days) d.burnout = burnoutLevel(d.weight);

  return days;
}

// ── Plumbing ────────────────────────────────────────────────────────────────

export interface SprintPlan {
  /** Day-by-day allocation. */
  days: DaySlot[];
  /** Monte Carlo simulation against the day-allocated task count. */
  simulation: SprintSimulation;
  /** Highest burnout band across the days — useful for a single-glance chip. */
  peakBurnout: BurnoutLevel;
  /** Total task count placed across the sprint. */
  taskCount: number;
}

export function buildSprintPlan(
  recommendations: TaskRecommendation[],
  velocity: VelocityMetrics,
  sprintDays: number = 5,
): SprintPlan {
  const days = distributeAcrossWeek(recommendations, sprintDays);
  const taskCount = days.reduce((sum, d) => sum + d.tasks.length, 0);
  const simulation = simulateSprintCompletion(velocity, taskCount, sprintDays);
  const peakBurnout = days.reduce<BurnoutLevel>((max, d) => {
    if (max === 'high' || d.burnout === 'high') return 'high';
    if (max === 'medium' || d.burnout === 'medium') return 'medium';
    return 'low';
  }, 'low');

  return { days, simulation, peakBurnout, taskCount };
}

// ── Internal helpers ────────────────────────────────────────────────────────

/** Box-Muller normal sample. */
function sampleNormal(mean: number, stdDev: number): number {
  const u1 = Math.random() || 1e-9; // avoid log(0)
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

function roundOneDecimal(x: number): number {
  return Math.round(x * 10) / 10;
}
