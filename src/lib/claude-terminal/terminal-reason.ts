/**
 * Shared helpers for classifying why a Claude query loop terminated.
 *
 * Both the direct Agent SDK path (sdk-service.ts) and the CLI subprocess path
 * (cli-service.ts) can surface this information via the SDK's `terminal_reason`
 * field (claude-agent-sdk 0.2.100+ / Claude Code CLI recent builds). Callers
 * should treat the reason as advisory — older runtimes may omit it entirely,
 * in which case we fall back to `'error'` (when is_error) or `'unknown'`.
 */

export type QueryTerminalReason =
  | 'completed'
  | 'aborted_tools'
  | 'max_turns'
  | 'blocking_limit'
  | 'error'
  | 'unknown';

const KNOWN_TERMINAL_REASONS: readonly QueryTerminalReason[] = [
  'completed',
  'aborted_tools',
  'max_turns',
  'blocking_limit',
  'error',
];

export function coerceTerminalReason(raw: unknown, isError: boolean): QueryTerminalReason {
  if (typeof raw === 'string' && (KNOWN_TERMINAL_REASONS as readonly string[]).includes(raw)) {
    return raw as QueryTerminalReason;
  }
  if (isError) return 'error';
  return 'unknown';
}

/**
 * Whether this reason represents a *soft* termination — the model stopped
 * cleanly but didn't necessarily finish the user-visible goal. Callers
 * (TaskRunner, brain signal recorders) can use this to avoid marking runs
 * as hard failures purely because the agent hit a turn/budget limit.
 */
export function isSoftTerminal(reason: QueryTerminalReason): boolean {
  return reason === 'max_turns' || reason === 'blocking_limit' || reason === 'aborted_tools';
}
