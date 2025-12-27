/**
 * Automation Scheduler Service
 * Background scheduler for standup automation cycles
 */

import { logger } from '@/lib/logger';
import {
  StandupAutomationConfig,
  AutomationStatus,
  AutomationCycleResult,
  DEFAULT_CONFIG,
  SchedulerState,
} from './types';

// Singleton state for the scheduler
let schedulerState: SchedulerState = {
  isRunning: false,
  intervalId: null,
  config: { ...DEFAULT_CONFIG },
  lastCycleResult: null,
  history: [],
};

// Maximum history entries to keep
const MAX_HISTORY_SIZE = 100;

// Callback for running a cycle - will be set by automationEngine
let runCycleCallback: (() => Promise<AutomationCycleResult[]>) | null = null;

/**
 * Register the cycle runner callback
 */
export function registerCycleRunner(callback: () => Promise<AutomationCycleResult[]>): void {
  runCycleCallback = callback;
}

/**
 * Get the current scheduler state
 */
export function getSchedulerState(): SchedulerState {
  return { ...schedulerState };
}

/**
 * Get the current automation status
 */
export function getAutomationStatus(): AutomationStatus {
  const now = Date.now();
  let nextRun: string | null = null;

  if (schedulerState.isRunning && schedulerState.intervalId) {
    // Calculate next run based on interval
    const intervalMs = schedulerState.config.intervalMinutes * 60 * 1000;
    const lastRunTime = schedulerState.lastCycleResult
      ? new Date(schedulerState.lastCycleResult.timestamp).getTime()
      : now;
    const nextRunTime = lastRunTime + intervalMs;
    nextRun = new Date(nextRunTime).toISOString();
  }

  // Calculate aggregate stats
  const stats = schedulerState.history.reduce(
    (acc, result) => {
      acc.goalsEvaluated += result.goalsEvaluated;
      acc.statusesUpdated += result.statusesUpdated.length;
      acc.goalsGenerated += result.goalsGenerated.length;
      acc.tasksCreated += result.tasksCreated.length;
      return acc;
    },
    { goalsEvaluated: 0, statusesUpdated: 0, goalsGenerated: 0, tasksCreated: 0 }
  );

  return {
    running: schedulerState.isRunning,
    lastRun: schedulerState.lastCycleResult?.timestamp || null,
    nextRun,
    currentProjectId: null, // Set during active cycle
    cycleInProgress: false, // Set during active cycle
    totalCyclesRun: schedulerState.history.length,
    stats,
  };
}

/**
 * Get the current configuration
 */
export function getConfig(): StandupAutomationConfig {
  return { ...schedulerState.config };
}

/**
 * Update the automation configuration
 */
export function updateConfig(updates: Partial<StandupAutomationConfig>): StandupAutomationConfig {
  schedulerState.config = {
    ...schedulerState.config,
    ...updates,
  };

  // If running, restart with new interval
  if (schedulerState.isRunning && updates.intervalMinutes) {
    stop();
    start(schedulerState.config);
  }

  logger.info('[AutomationScheduler] Config updated:', schedulerState.config);
  return { ...schedulerState.config };
}

/**
 * Record token usage from a cycle (for logging purposes)
 */
export function recordTokenUsage(tokens: { input: number; output: number }): void {
  const total = tokens.input + tokens.output;
  logger.debug('[AutomationScheduler] Token usage recorded:', { added: total });
}

/**
 * Add a cycle result to history
 */
export function addCycleResult(result: AutomationCycleResult): void {
  schedulerState.lastCycleResult = result;
  schedulerState.history.unshift(result);

  // Trim history if needed
  if (schedulerState.history.length > MAX_HISTORY_SIZE) {
    schedulerState.history = schedulerState.history.slice(0, MAX_HISTORY_SIZE);
  }
}

/**
 * Get cycle history
 */
export function getHistory(limit: number = 20): AutomationCycleResult[] {
  return schedulerState.history.slice(0, limit);
}

/**
 * Execute a single automation cycle
 */
async function executeCycle(): Promise<void> {
  if (!runCycleCallback) {
    logger.warn('[AutomationScheduler] No cycle runner registered');
    return;
  }

  try {
    logger.info('[AutomationScheduler] Starting automation cycle');

    const results = await runCycleCallback();

    // Record results
    for (const result of results) {
      addCycleResult(result);
      recordTokenUsage(result.tokensUsed);
    }

    logger.info('[AutomationScheduler] Cycle completed', {
      projectsProcessed: results.length,
      totalGoalsEvaluated: results.reduce((sum, r) => sum + r.goalsEvaluated, 0),
      totalChanges: results.reduce((sum, r) => sum + r.statusesUpdated.length, 0),
    });
  } catch (error) {
    logger.error('[AutomationScheduler] Cycle failed:', error);
  }
}

/**
 * Start the automation scheduler
 */
export function start(config?: Partial<StandupAutomationConfig>): boolean {
  if (schedulerState.isRunning) {
    logger.warn('[AutomationScheduler] Already running');
    return false;
  }

  if (config) {
    schedulerState.config = {
      ...schedulerState.config,
      ...config,
    };
  }

  if (!schedulerState.config.enabled) {
    schedulerState.config.enabled = true;
  }

  const intervalMs = schedulerState.config.intervalMinutes * 60 * 1000;

  // Set up the interval
  schedulerState.intervalId = setInterval(executeCycle, intervalMs);
  schedulerState.isRunning = true;

  logger.info('[AutomationScheduler] Started', {
    intervalMinutes: schedulerState.config.intervalMinutes,
    projectIds: schedulerState.config.projectIds,
    autonomyLevel: schedulerState.config.autonomyLevel,
  });

  // Run immediately on start
  executeCycle();

  return true;
}

/**
 * Stop the automation scheduler
 */
export function stop(): boolean {
  if (!schedulerState.isRunning) {
    logger.warn('[AutomationScheduler] Not running');
    return false;
  }

  if (schedulerState.intervalId) {
    clearInterval(schedulerState.intervalId);
    schedulerState.intervalId = null;
  }

  schedulerState.isRunning = false;
  schedulerState.config.enabled = false;

  logger.info('[AutomationScheduler] Stopped');
  return true;
}

/**
 * Trigger an immediate cycle (manual trigger)
 */
export async function runNow(): Promise<AutomationCycleResult[]> {
  if (!runCycleCallback) {
    logger.warn('[AutomationScheduler] No cycle runner registered');
    return [];
  }

  logger.info('[AutomationScheduler] Manual trigger - running now');

  try {
    const results = await runCycleCallback();

    // Record results
    for (const result of results) {
      addCycleResult(result);
      recordTokenUsage(result.tokensUsed);
    }

    return results;
  } catch (error) {
    logger.error('[AutomationScheduler] Manual trigger failed:', error);
    return [];
  }
}

/**
 * Reset all state (for testing or complete restart)
 */
export function reset(): void {
  stop();

  schedulerState = {
    isRunning: false,
    intervalId: null,
    config: { ...DEFAULT_CONFIG },
    lastCycleResult: null,
    history: [],
  };

  logger.info('[AutomationScheduler] State reset');
}
