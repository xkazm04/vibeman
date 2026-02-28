/**
 * Task Runner Constants
 * Centralized tool names and phase weights to ensure type safety
 */

/**
 * Activity types based on tool usage
 */
export type ActivityType =
  | 'reading'      // Read tool
  | 'editing'      // Edit tool
  | 'writing'      // Write tool
  | 'searching'    // Grep, Glob tools
  | 'executing'    // Bash tool
  | 'planning'     // TodoWrite tool
  | 'thinking'     // No tool, assistant thinking
  | 'idle';        // No recent activity

/**
 * Execution phases of a task
 */
export type TaskPhase =
  | 'analyzing'
  | 'planning'
  | 'implementing'
  | 'validating'
  | 'idle';

/**
 * Canonical tool names used by Claude Code CLI
 */
export const TOOL_NAMES = {
  Read: 'Read',
  Edit: 'Edit',
  Write: 'Write',
  Grep: 'Grep',
  Glob: 'Glob',
  Bash: 'Bash',
  TodoWrite: 'TodoWrite',
  Task: 'Task',
  WebSearch: 'WebSearch',
  WebFetch: 'WebFetch',
  LSP: 'LSP',
  NotebookEdit: 'NotebookEdit',
} as const satisfies Record<string, string>;

/**
 * Type for all canonical tool names
 */
export type ToolName = keyof typeof TOOL_NAMES;

/**
 * Weights for each execution phase to estimate progress percentage.
 * Using satisfies ensures exhaustive checking of TaskPhase.
 */
export const PHASE_WEIGHTS = {
  idle: 0,
  analyzing: 15,
  planning: 30,
  implementing: 60,
  validating: 85,
} as const satisfies Record<TaskPhase, number>;
