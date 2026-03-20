/**
 * Tauri Terminal Strategy
 *
 * Drop-in replacement for the HTTP-based terminalStrategy.
 * Uses Tauri IPC (invoke + events) instead of HTTP API + SSE.
 *
 * When running inside Tauri, the TaskRunner can use this strategy
 * for zero-overhead CLI execution with native process management.
 */

import { tauriInvoke, tauriListen, isTauri } from './bridge';

export interface ExecuteClaudeArgs {
  project_path: string;
  prompt: string;
  resume_session_id?: string;
  provider?: string;
  model?: string;
  extra_env?: Record<string, string>;
  project_id?: string;
  task_id?: string;
  timeout_secs?: number;
}

export interface ExecuteResult {
  execution_id: string;
  pid: number;
}

export interface ExecutionEvent {
  execution_id: string;
  event_type: 'data' | 'stderr' | 'stdout_end' | 'completed' | 'error';
  data: unknown;
}

/**
 * Execute Claude Code via Tauri's Rust backend.
 * Returns immediately with execution_id; events stream via Tauri events.
 */
export async function executeClaude(args: ExecuteClaudeArgs): Promise<ExecuteResult> {
  return tauriInvoke<ExecuteResult>('execute_claude', { args });
}

/**
 * Abort a running Claude execution.
 */
export async function abortClaude(executionId: string): Promise<void> {
  return tauriInvoke<void>('abort_claude', { executionId });
}

/**
 * Get execution status.
 */
export async function claudeExecutionStatus(executionId: string): Promise<unknown> {
  return tauriInvoke<unknown>('claude_execution_status', { executionId });
}

/**
 * Listen to execution events for a specific execution_id.
 * Returns an unlisten function.
 */
export async function listenToExecution(
  executionId: string,
  onEvent: (event: ExecutionEvent) => void,
): Promise<() => void> {
  return tauriListen('claude-execution-event', (payload) => {
    const event = payload as ExecutionEvent;
    if (event.execution_id === executionId) {
      onEvent(event);
    }
  });
}

/**
 * Check if Tauri terminal strategy is available.
 * If true, the TaskRunner should prefer this over HTTP.
 */
export function isTauriTerminalAvailable(): boolean {
  return isTauri();
}
