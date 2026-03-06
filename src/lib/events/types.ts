/**
 * Unified Event Types
 *
 * Discriminated union of all event types in the system.
 * Every emitter feeds into EventBus using these types;
 * every subscriber filters by the `kind` discriminant.
 */

import type { McpProgressData } from '@/app/Claude/lib/taskChangeEmitter';
import type { AgentEventType } from '@/lib/annette/agentNotificationBridge';

// ── Base ─────────────────────────────────────────────────────────────────────

interface BaseEvent {
  /** Unique event ID */
  id: string;
  /** ISO-8601 timestamp */
  timestamp: string;
  /** Originating project (null for global events) */
  projectId: string | null;
}

// ── Task Events ──────────────────────────────────────────────────────────────

export interface TaskChangeEvent extends BaseEvent {
  kind: 'task:change';
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'session-limit';
  progressCount: number;
  mcpProgress?: McpProgressData;
}

export interface TaskNotificationEvent extends BaseEvent {
  kind: 'task:notification';
  taskId: string;
  taskName: string;
  status: 'started' | 'completed' | 'failed' | 'session-limit';
  filesChanged?: number;
  duration?: number;
  errorMessage?: string;
}

// ── Agent Events ─────────────────────────────────────────────────────────────

export interface AgentEvent extends BaseEvent {
  kind: 'agent:lifecycle';
  goalId: string;
  eventType: AgentEventType;
  message: string;
}

// ── Conductor Events ─────────────────────────────────────────────────────────

export interface ConductorEvent extends BaseEvent {
  kind: 'conductor:status';
  runId: string;
  stage: string;
  status: string;
  message?: string;
}

// ── Reflection Events ────────────────────────────────────────────────────────

export interface ReflectionStartedEvent extends BaseEvent {
  kind: 'reflection:started';
  reflectionId: string;
  scope: 'project' | 'global';
  triggerType: string;
}

export interface ReflectionProgressEvent extends BaseEvent {
  kind: 'reflection:progress';
  reflectionId: string;
  scope: 'project' | 'global';
  stage: string;
  message?: string;
}

export interface ReflectionCompletedEvent extends BaseEvent {
  kind: 'reflection:completed';
  reflectionId: string;
  scope: 'project' | 'global';
  insightCount?: number;
}

export interface ReflectionFailedEvent extends BaseEvent {
  kind: 'reflection:failed';
  reflectionId: string;
  scope: 'project' | 'global';
  error?: string;
}

// ── Brain Events ────────────────────────────────────────────────────────────

export interface BrainSignalRecordedEvent extends BaseEvent {
  kind: 'brain:signal_recorded';
  signalType: string;
}

export interface BrainSignalDeletedEvent extends BaseEvent {
  kind: 'brain:signal_deleted';
}

export interface BrainSignalDecayedEvent extends BaseEvent {
  kind: 'brain:signal_decayed';
  decayed: number;
  deleted: number;
}

export interface BrainInsightPrunedEvent extends BaseEvent {
  kind: 'brain:insight_pruned';
  prunedCount: number;
}

export interface BrainDirectionChangedEvent extends BaseEvent {
  kind: 'brain:direction_changed';
  directionId: string;
  action: 'accepted' | 'rejected' | 'deleted' | 'reverted';
}

// ── Notification Events ──────────────────────────────────────────────────────

export interface NotificationEvent extends BaseEvent {
  kind: 'notification:push';
  type: 'insight' | 'outcome' | 'warning' | 'suggestion' | 'status' | 'task_execution' | 'autonomous_agent';
  priority: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  actionable: boolean;
  suggestedAction?: { tool: string; description: string };
}

// ── Project Events ───────────────────────────────────────────────────────────

export interface ProjectEvent extends BaseEvent {
  kind: 'project:update';
  action: 'created' | 'updated' | 'deleted' | 'selected';
}

// ── System Events ────────────────────────────────────────────────────────────

export interface SystemEvent extends BaseEvent {
  kind: 'system:heartbeat' | 'system:error';
  message?: string;
}

// ── Discriminated Union ──────────────────────────────────────────────────────

export type BusEvent =
  | TaskChangeEvent
  | TaskNotificationEvent
  | AgentEvent
  | ConductorEvent
  | ReflectionStartedEvent
  | ReflectionProgressEvent
  | ReflectionCompletedEvent
  | ReflectionFailedEvent
  | BrainSignalRecordedEvent
  | BrainSignalDeletedEvent
  | BrainSignalDecayedEvent
  | BrainInsightPrunedEvent
  | BrainDirectionChangedEvent
  | NotificationEvent
  | ProjectEvent
  | SystemEvent;

/** Extract the `kind` literal from a BusEvent */
export type EventKind = BusEvent['kind'];

/** Extract event type by kind */
export type EventByKind<K extends EventKind> = Extract<BusEvent, { kind: K }>;

/** Wildcard pattern: match all events in a namespace (e.g., 'task:*') */
export type EventNamespace = 'task' | 'agent' | 'conductor' | 'reflection' | 'brain' | 'notification' | 'project' | 'system';

/** Subscriber callback */
export type EventHandler<E extends BusEvent = BusEvent> = (event: E) => void;
