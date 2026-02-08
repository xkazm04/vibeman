/**
 * CLI Component Types
 *
 * Shared types for CLI terminal components and task queue integration.
 */

import type { ProjectRequirement } from '@/app/features/TaskRunner/lib/types';

/**
 * Task queued for CLI execution
 */
export interface QueuedTask {
  id: string;
  projectId: string;
  projectPath: string;
  projectName: string;
  requirementName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  addedAt: number;
  startedAt?: number;
  completedAt?: number;
  /** Direct prompt content - if provided, executes this instead of a requirement file */
  directPrompt?: string;
}

// CLISessionState is defined in ./store/cliSessionStore.ts and re-exported from ./store/index.ts

/**
 * File change tracking
 */
export interface FileChange {
  id: string;
  sessionId: string;
  filePath: string;
  changeType: 'edit' | 'write' | 'read' | 'delete';
  timestamp: number;
  toolUseId?: string;
  preview?: string;
}

/**
 * Log entry for terminal display
 */
export interface LogEntry {
  id: string;
  type: 'user' | 'assistant' | 'tool_use' | 'tool_result' | 'system' | 'error';
  content: string;
  timestamp: number;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  model?: string;
}

/**
 * Execution info from CLI
 */
export interface ExecutionInfo {
  sessionId?: string;
  model?: string;
  tools?: string[];
  version?: string;
}

/**
 * Execution result from CLI
 */
export interface ExecutionResult {
  sessionId?: string;
  usage?: { inputTokens: number; outputTokens: number };
  durationMs?: number;
  totalCostUsd?: number;
  isError?: boolean;
}

/**
 * SSE Event from CLI stream
 * @deprecated Use CLIEvent from './protocol' for typed events
 */
export type CLISSEEvent = import('./protocol').CLIEvent;

// Re-export SkillId from the canonical source for consumers of this types module
export type { SkillId } from './skills';

/**
 * Props for CompactTerminal with task queue
 */
export interface CompactTerminalProps {
  instanceId: string;
  projectPath: string;
  title?: string;
  className?: string;
  // Task queue integration
  taskQueue?: QueuedTask[];
  onTaskStart?: (taskId: string) => void;
  onTaskComplete?: (taskId: string, success: boolean) => void;
  onQueueEmpty?: () => void;
  autoStart?: boolean;
  // Skills for specialized instructions
  enabledSkills?: SkillId[];
  // Background processing support
  currentExecutionId?: string | null;
  currentStoredTaskId?: string | null;
  onExecutionChange?: (executionId: string | null, taskId: string | null) => void;
}

/**
 * Props for CLIBatchPanel
 */
export interface CLIBatchPanelProps {
  selectedTaskIds: string[];
  requirements: ProjectRequirement[];
  getRequirementId: (req: ProjectRequirement) => string;
  onClearSelection?: () => void;
  onRequirementCompleted?: (reqId: string, projectPath: string, requirementName: string) => void;
  /** Enable remote batch management section */
  isRemoteMode?: boolean;
}

/**
 * Convert ProjectRequirement to QueuedTask
 */
export function requirementToQueuedTask(
  req: ProjectRequirement,
  reqId: string
): QueuedTask {
  return {
    id: reqId,
    projectId: req.projectId,
    projectPath: req.projectPath,
    projectName: req.projectName,
    requirementName: req.requirementName,
    status: 'pending',
    addedAt: Date.now(),
  };
}
