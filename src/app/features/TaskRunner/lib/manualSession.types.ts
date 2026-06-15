/**
 * Types for manual Claude Code CLI sessions.
 *
 * Manual sessions let users interact with Claude Code directly
 * (multi-turn conversation) alongside automated TaskRunner sessions.
 */

export type ManualSessionStatus =
  | 'idle'              // Created but not yet started
  | 'starting'          // Process spawning
  | 'running'           // Claude is processing (tool use, thinking)
  | 'waiting_input'     // Claude finished responding, awaiting user message
  | 'waiting_approval'  // Claude proposed tool_use, awaiting user approval
  | 'completed'         // Session ended normally
  | 'failed';           // Session crashed or errored

export interface ManualSessionEvent {
  timestamp: number;
  type: 'system' | 'assistant' | 'user' | 'result' | 'error' | 'input_needed' | 'approval_needed' | 'auto_approved' | 'raw';
  data: unknown;
}

/** Tools that are auto-approved without user confirmation */
export const SAFE_TOOLS = new Set(['Read', 'Glob', 'Grep', 'WebSearch', 'WebFetch']);

/** A tool that Claude wants to use, pending user approval */
export interface PendingToolApproval {
  toolUseId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
}

export interface ManualSession {
  id: string;
  executionId: string | null;
  pid: number | null;
  projectId: string;
  projectPath: string;
  projectName: string;
  status: ManualSessionStatus;
  events: ManualSessionEvent[];
  createdAt: number;
  lastActivityAt: number;
  /** Claude session ID for --resume support */
  claudeSessionId: string | null;
  /** User-facing label */
  label: string;
  /** Tools pending user approval (non-empty when status is waiting_approval) */
  pendingApprovals: PendingToolApproval[];
  /** Accumulated USD cost across all completed turns (from `result` events) */
  totalCostUsd: number;
  /** Accumulated execution time in ms across all completed turns */
  totalDurationMs: number;
  /** Accumulated input + output tokens across all completed turns */
  totalTokens: number;
  /** Number of completed turns (each `result` event = one turn) */
  turnCount: number;
}

/**
 * Token/cost/duration metrics extracted from a single Claude `result` event.
 *
 * The CLI emits raw snake_case fields (`cost_usd`, `duration_ms`) while the
 * browser stream route remaps them to camelCase (`totalCostUsd`, `durationMs`)
 * and nests usage under `usage`. This helper normalizes both shapes.
 */
export interface ResultMetrics {
  costUsd: number;
  durationMs: number;
  tokens: number;
}

/** Extract cost/duration/token metrics from a `result` event's data payload. */
export function extractResultMetrics(data: unknown): ResultMetrics {
  const d = (data as Record<string, unknown>) || {};

  const costUsd =
    (typeof d.cost_usd === 'number' ? d.cost_usd : undefined) ??
    (typeof d.total_cost_usd === 'number' ? d.total_cost_usd : undefined) ??
    (typeof d.totalCostUsd === 'number' ? d.totalCostUsd : undefined) ??
    0;

  const durationMs =
    (typeof d.duration_ms === 'number' ? d.duration_ms : undefined) ??
    (typeof d.durationMs === 'number' ? d.durationMs : undefined) ??
    0;

  // Token usage follows the Anthropic API usage shape.
  const usage = (d.usage as Record<string, unknown>) || {};
  const inputTokens =
    (typeof usage.input_tokens === 'number' ? usage.input_tokens : undefined) ??
    (typeof usage.inputTokens === 'number' ? usage.inputTokens : undefined) ??
    0;
  const outputTokens =
    (typeof usage.output_tokens === 'number' ? usage.output_tokens : undefined) ??
    (typeof usage.outputTokens === 'number' ? usage.outputTokens : undefined) ??
    0;

  return { costUsd, durationMs, tokens: inputTokens + outputTokens };
}
