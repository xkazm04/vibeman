/**
 * Conductor V4 Session Manager
 *
 * Handles CLI session lifecycle: spawn, monitor, resume.
 * Includes Gap 4 (stream tool_use events) and Gap 5 (memory call tracking).
 */

import {
  startExecution,
  getExecution,
  abortExecution,
  type CLIProviderConfig,
} from '@/lib/claude-terminal/cli-service';
import type { V4RunConfig, V4SessionResult } from './types';

const POLL_INTERVAL_MS = 5000;

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
  const providerConfig: CLIProviderConfig = {
    provider: (config.provider || 'claude') as 'claude' | 'gemini' | 'ollama',
    model: config.model,
  };

  const extraEnv: Record<string, string> = {
    VIBEMAN_PROJECT_ID: '',
    VIBEMAN_TASK_ID: `conductor-v4-${runId}`,
  };

  const executionId = startExecution(
    projectPath,
    prompt,
    undefined,
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

  const executionId = startExecution(
    projectPath,
    'Continue the Conductor V4 pipeline from where you left off. Check which requirements were already completed via log_implementation, and continue with the remaining ones. Call report_progress with phase="validating" and percentage=100 when done.',
    sessionName,
    onEvent,
    providerConfig,
    extraEnv,
  );

  return executionId;
}

/** Callback for real-time tool activity during execution */
export interface V4MonitorCallbacks {
  /** Called when report_progress MCP tool fires */
  onProgress?: (phase: string, percentage: number, message: string) => void;
  /** Called when any tool_use event is observed (Gap 4: stream to UI) */
  onToolActivity?: (toolName: string, input: Record<string, unknown>) => void;
  /** Called when get_memory MCP tool is used (Gap 5: track for outcome resolution) */
  onMemoryQuery?: (memoryId: string, query: string) => void;
}

/**
 * Monitor a V4 session until completion.
 *
 * Gap 4: Extracts tool_use events from stream-json and forwards to onToolActivity.
 * Gap 5: Tracks get_memory calls for collective memory outcome resolution.
 */
export async function monitorSession(
  executionId: string,
  callbacks?: V4MonitorCallbacks,
): Promise<V4SessionResult> {
  return new Promise((resolve) => {
    let lastProgressPhase = 'starting';
    let lastProgressPercentage = 0;
    let sessionId: string | null = null;
    let implementationLogCount = 0;
    let lastEventIndex = 0;
    const memoryQueriesTracked: string[] = [];

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
          memoryIdsQueried: memoryQueriesTracked,
        });
        return;
      }

      // Process new events since last poll (Gap 4: stream tool activity)
      const newEvents = execution.events.slice(lastEventIndex);
      lastEventIndex = execution.events.length;

      for (const event of newEvents) {
        // Extract session ID
        if (event.type === 'init' && event.sessionId) {
          sessionId = event.sessionId;
        }

        // Gap 4: Forward tool_use events to UI callback
        if (event.type === 'tool_use' && callbacks?.onToolActivity) {
          callbacks.onToolActivity(event.name || '', event.input || {});
        }

        // Track implementation log calls
        if (event.type === 'tool_use' && event.name === 'mcp__vibeman__log_implementation') {
          implementationLogCount++;
        }

        // Gap 5: Track get_memory calls for outcome resolution
        if (event.type === 'tool_use' && event.name === 'mcp__vibeman__get_memory') {
          const query = (event.input as Record<string, unknown>)?.query as string || '';
          memoryQueriesTracked.push(query);
          if (callbacks?.onMemoryQuery) {
            callbacks.onMemoryQuery('', query);
          }
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
          memoryIdsQueried: memoryQueriesTracked,
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
