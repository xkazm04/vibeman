'use client';

/**
 * useTaskRunnerConfig
 *
 * React hook that exposes the centralized TaskRunner configuration.
 * Values are derived from environment variables at build time (NEXT_PUBLIC_TR_*).
 */

import { TASK_RUNNER_CONFIG, type TaskRunnerConfig } from '../lib/taskRunnerConfig';

export function useTaskRunnerConfig(): TaskRunnerConfig {
  return TASK_RUNNER_CONFIG;
}
