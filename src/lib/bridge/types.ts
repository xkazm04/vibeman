/**
 * Bridge Layer Types
 * Types for 3rd party control of Vibeman via REST API + SSE
 */

// Event types that can be streamed to clients
export type BridgeEventType =
  | 'idea_generated'
  | 'idea_updated'
  | 'batch_progress'
  | 'task_started'
  | 'task_completed'
  | 'task_failed'
  | 'goal_created'
  | 'goal_deleted'
  | 'connection_established'
  | 'error';

export interface BridgeEvent<T = unknown> {
  type: BridgeEventType;
  payload: T;
  timestamp: string;
  projectId: string;
}

// Idea-related events
export interface IdeaGeneratedPayload {
  ideaId: string;
  title: string;
  scanType: string;
  contextId?: string;
}

export interface IdeaUpdatedPayload {
  ideaId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'implemented';
  previousStatus?: string;
}

// Batch-related events
export interface BatchProgressPayload {
  batchId: string;
  completed: number;
  total: number;
  currentTaskId?: string;
  currentTaskTitle?: string;
}

// Task-related events
export interface TaskEventPayload {
  taskId: string;
  batchId: string;
  title: string;
  status: 'running' | 'completed' | 'failed';
  error?: string;
}

// Goal-related events
export interface GoalEventPayload {
  goalId: string;
  name: string;
  projectId: string;
}

// API Request/Response types

export interface GenerateIdeasRequest {
  projectId: string;
  scanTypes: string[];
  contextIds?: string[];
  provider?: string;
}

export interface GenerateIdeasResponse {
  success: boolean;
  jobId?: string;
  filesCreated?: number;
  errors?: string[];
}

export interface IdeaActionRequest {
  action: 'accept' | 'reject' | 'skip';
}

export interface BatchAssignRequest {
  ideaIds: string[];
}

export interface BatchControlRequest {
  action: 'start' | 'pause' | 'stop' | 'resume';
}

export interface BridgeStatusResponse {
  status: 'ok' | 'error';
  version: string;
  connectedClients: number;
  activeBatches: number;
  timestamp: string;
}

// Client tracking for SSE
export interface BridgeClient {
  id: string;
  projectId: string;
  connectedAt: Date;
  lastPing: Date;
  controller: ReadableStreamDefaultController<Uint8Array>;
}

// Batch status for bridge
export type BridgeBatchStatus = 'idle' | 'running' | 'paused' | 'completed';

export interface BridgeBatch {
  id: string;
  name: string;
  status: BridgeBatchStatus;
  taskCount: number;
  completedCount: number;
  failedCount: number;
}
