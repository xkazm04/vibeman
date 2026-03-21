/**
 * Conductor V4 Types
 *
 * Single-session autonomous pipeline with 1M context window.
 */

export interface V4RunConfig {
  /** Provider for CLI execution (default: 'claude') */
  provider?: string;
  /** Model override (default: let CLI decide) */
  model?: string;
  /** Max auto-resume attempts on failure (default: 3) */
  maxResumeAttempts?: number;
  /** Whether to use --chrome for browser testing (auto-detected from project type) */
  enableChrome?: boolean;
  /** Whether to auto-commit after execution (default: false — let CLI decide) */
  autoCommit?: boolean;
}

export interface V4PreFlightData {
  goal: {
    id: string;
    title: string;
    description: string | null;
    contextId: string | null;
  };
  /** All contexts (or focused context if goal has contextId) */
  contexts: Array<{
    id: string;
    name: string;
    description: string | null;
    file_paths: string;
    target: string | null;
    target_fulfillment: string | null;
    implemented_tasks: number;
    group_name?: string;
  }>;
  /** Knowledge base entries relevant to project */
  knowledge: Array<{
    domain: string;
    layer: string;
    pattern_type: string;
    title: string;
    pattern: string;
    code_example: string | null;
    anti_pattern: string | null;
    confidence: number;
  }>;
  /** Collective memory entries with effectiveness scores */
  memory: Array<{
    memory_type: string;
    title: string;
    description: string;
    code_pattern: string | null;
    effectiveness_score: number;
  }>;
  /** Brain insights with high confidence */
  insights: Array<{
    insight_type: string;
    title: string;
    description: string;
    confidence: number;
  }>;
  /** Existing accepted/pending ideas (to avoid duplication) */
  existingIdeas: Array<{
    id: string;
    title: string;
    status: string;
    category: string;
  }>;
  /** Whether project is NextJS (for --chrome flag) */
  isNextJS: boolean;
  /** Project path */
  projectPath: string;
  /** Project name */
  projectName: string;
}

export interface V4RunState {
  runId: string;
  projectId: string;
  goalId: string;
  status: V4RunStatus;
  sessionName: string;
  executionId: string | null;
  progress: number;
  progressPhase: string;
  progressMessage: string;
  implementationLogs: string[];
  resumeAttempts: number;
  startedAt: string;
  completedAt: string | null;
}

export type V4RunStatus =
  | 'starting'
  | 'running'
  | 'paused'
  | 'resuming'
  | 'completing'
  | 'completed'
  | 'failed'
  | 'interrupted';

export interface V4SessionResult {
  exitCode: number;
  completedNormally: boolean;
  implementationLogCount: number;
  lastProgressPhase: string;
  lastProgressPercentage: number;
  sessionId: string | null;
  error: string | null;
}
