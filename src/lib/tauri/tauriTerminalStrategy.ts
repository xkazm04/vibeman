/**
 * Tauri Terminal Strategy
 *
 * Drop-in replacement for the HTTP-based terminalStrategy.
 * Uses Tauri IPC (invoke + events) instead of HTTP API + SSE.
 * Supports Claude Code CLI v2.1+ features via direct flags.
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
  // Wave 2: CLI v2.1+ flags
  /** Item 15: Named session for easy resume */
  session_name?: string;
  /** Item 15: Link to GitHub PR number or URL */
  from_pr?: string;
  /** Item 16: JSON schema for structured output */
  json_schema?: string;
  /** Item 18: Effort level (low|medium|high|max), default: medium */
  effort?: 'low' | 'medium' | 'high' | 'max';
  /** Item 4: Use CLI-native worktree isolation */
  use_worktree?: boolean;
  /** Max budget in USD */
  max_budget_usd?: number;
  /** Max agentic turns */
  max_turns?: number;
  /** Additional CLI settings JSON (for hooks config) */
  cli_settings?: string;
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
 */
export function isTauriTerminalAvailable(): boolean {
  return isTauri();
}

/**
 * Map task complexity (1-3) to CLI effort level.
 * Used by balancingEngine integration.
 */
export function complexityToEffort(complexity: number): ExecuteClaudeArgs['effort'] {
  switch (complexity) {
    case 1: return 'low';
    case 2: return 'medium';
    case 3: return 'high';
    default: return 'medium';
  }
}
