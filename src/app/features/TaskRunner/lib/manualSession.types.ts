/**
 * Types for manual Claude Code CLI sessions.
 *
 * Manual sessions let users interact with Claude Code directly
 * (multi-turn conversation) alongside automated TaskRunner sessions.
 */

export type ManualSessionStatus =
  | 'idle'           // Created but not yet started
  | 'starting'       // Process spawning
  | 'running'        // Claude is processing (tool use, thinking)
  | 'waiting_input'  // Claude finished responding, awaiting user message
  | 'completed'      // Session ended normally
  | 'failed';        // Session crashed or errored

export interface ManualSessionEvent {
  timestamp: number;
  type: 'system' | 'assistant' | 'user' | 'result' | 'error' | 'input_needed' | 'raw';
  data: unknown;
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
}
