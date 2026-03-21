/**
 * Conductor V4 Session Manager
 *
 * Handles CLI session lifecycle: spawn, monitor, resume.
 * Uses the existing CLI service for process management.
 */

import {
  startExecution,
  getExecution,
  abortExecution,
  type CLIProviderConfig,
} from '@/lib/claude-terminal/cli-service';
import type { V4RunConfig, V4SessionResult } from './types';

const POLL_INTERVAL_MS = 5000;
const RATE_LIMIT_BACKOFF_MS = 60000;

/**
 * Spawn a new V4 CLI session with the master prompt.
 */
export function spawnV4Session(
  runId: string,
  projectPath: string,
  prompt: string,
  config: V4RunConfig,
  isNextJS: boolean,
  onEvent?: (event: unknown) => void,
): string {
  const sessionName = `conductor-v4-${runId.substring(0, 12)}`;

  const providerConfig: CLIProviderConfig = {
    provider: (config.provider || 'claude') as 'claude' | 'gemini' | 'ollama',
    model: config.model,
  };

  // Build extra args for the CLI
  const extraArgs: string[] = [];

  // Named session for resume capability
  extraArgs.push('--name', sessionName);

  // Chrome for NextJS browser testing
  if (isNextJS && config.enableChrome !== false) {
    extraArgs.push('--chrome');
  }

  // No --effort, no --max-turns — quality first

  const extraEnv: Record<string, string> = {
    VIBEMAN_PROJECT_ID: '', // Will be set from context
    VIBEMAN_TASK_ID: `conductor-v4-${runId}`,
  };

  const executionId = startExecution(
    projectPath,
    prompt,
    undefined, // no resume session
    onEvent,
    providerConfig,
    extraEnv,
  );

  return executionId;
}

/**
 * Resume an interrupted V4 session by name.
 */
export function resumeV4Session(
  runId: string,
  projectPath: string,
  config: V4RunConfig,
  onEvent?: (event: unknown) => void,
): string {
  const sessionName = `conductor-v4-${runId.substring(0, 12)}`;

  const providerConfig: CLIProviderConfig = {
    provider: (config.provider || 'claude') as 'claude' | 'gemini' | 'ollama',
    model: config.model,
  };

  const extraEnv: Record<string, string> = {
    VIBEMAN_TASK_ID: `conductor-v4-${runId}`,
  };

  // Resume by session name
  const executionId = startExecution(
    projectPath,
    'Continue the Conductor V4 pipeline from where you left off. Check which requirements were already completed via log_implementation, and continue with the remaining ones. Call report_progress with phase="validating" and percentage=100 when done.',
    sessionName, // resume session
    onEvent,
    providerConfig,
    extraEnv,
  );

  return executionId;
}

/**
 * Monitor a V4 session until completion.
 * Returns the session result when done.
 */
export async function monitorSession(
  executionId: string,
  onProgress?: (phase: string, percentage: number, message: string) => void,
): Promise<V4SessionResult> {
  return new Promise((resolve) => {
    let lastProgressPhase = 'starting';
    let lastProgressPercentage = 0;
    let sessionId: string | null = null;
    let implementationLogCount = 0;

    const interval = setInterval(() => {
      const execution = getExecution(executionId);
      if (!execution) {
        clearInterval(interval);
        resolve({
          exitCode: -1,
          completedNormally: false,
          implementationLogCount,
          lastProgressPhase,
          lastProgressPercentage,
          sessionId,
          error: 'Execution not found',
        });
        return;
      }

      // Extract session ID from events
      for (const event of execution.events) {
        if (event.type === 'init' && event.sessionId) {
          sessionId = event.sessionId;
        }
      }

      // Check for terminal status
      if (execution.status === 'completed' || execution.status === 'error') {
        clearInterval(interval);

        const exitCode = execution.status === 'completed' ? 0 : 1;
        const completedNormally = lastProgressPhase === 'validating' && lastProgressPercentage >= 100;

        resolve({
          exitCode,
          completedNormally,
          implementationLogCount,
          lastProgressPhase,
          lastProgressPercentage,
          sessionId,
          error: execution.status === 'error'
            ? execution.events.find(e => e.type === 'error')?.message || 'Unknown error'
            : null,
        });
      }
    }, POLL_INTERVAL_MS);
  });
}

/**
 * Abort a V4 session.
 */
export function abortV4Session(executionId: string): void {
  abortExecution(executionId);
}

/**
 * Check if an error indicates a rate limit.
 */
export function isRateLimitError(error: string | null): boolean {
  if (!error) return false;
  const lower = error.toLowerCase();
  return lower.includes('rate limit') || lower.includes('429') || lower.includes('quota exceeded');
}
