/**
 * Remote Message Broker Types
 * Types for Supabase-based event publishing and command processing
 */

// ============================================================================
// Event Types (outbound from Vibeman)
// ============================================================================

export type RemoteEventType =
  | 'idea_generated'
  | 'idea_updated'
  | 'idea_accepted'
  | 'idea_rejected'
  | 'goal_created'
  | 'goal_updated'
  | 'goal_completed'
  | 'goal_deleted'
  | 'task_started'
  | 'task_completed'
  | 'task_failed'
  | 'batch_progress'
  | 'scan_completed'
  | 'implementation_completed'
  | 'healthcheck';

export interface RemoteEvent<T = Record<string, unknown>> {
  id?: string;
  project_id: string;
  event_type: RemoteEventType;
  payload: T;
  source?: string;
  created_at?: string;
}

// ============================================================================
// Command Types (inbound to Vibeman)
// ============================================================================

export type RemoteCommandType =
  | 'create_goal'
  | 'update_goal'
  | 'delete_goal'
  | 'accept_idea'
  | 'reject_idea'
  | 'skip_idea'
  | 'start_batch'
  | 'pause_batch'
  | 'resume_batch'
  | 'stop_batch'
  | 'trigger_scan';

export type CommandStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface RemoteCommand<T = Record<string, unknown>> {
  id?: string;
  client_id?: string;
  project_id: string;
  command_type: RemoteCommandType;
  payload: T;
  status?: CommandStatus;
  error_message?: string;
  result?: Record<string, unknown>;
  processed_at?: string;
  created_at?: string;
}

// ============================================================================
// Client Types (API key management)
// ============================================================================

export type ClientPermission = 'read_events' | 'write_commands' | 'admin';

export interface RemoteClient {
  id?: string;
  api_key: string;
  name: string;
  description?: string;
  permissions: ClientPermission[];
  is_active: boolean;
  last_seen_at?: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface RemoteConfig {
  id?: string;
  supabase_url: string;
  supabase_anon_key: string;
  supabase_service_role_key: string;
  is_configured: boolean;
  last_validated_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RemoteConnectionStatus {
  is_configured: boolean;
  is_connected: boolean;
  last_validated_at?: string;
  event_count?: number;
  pending_commands?: number;
  error?: string;
}

// ============================================================================
// Event Payloads
// ============================================================================

export interface IdeaEventPayload {
  ideaId: string;
  title: string;
  scanType?: string;
  contextId?: string;
}

export interface GoalEventPayload {
  goalId: string;
  name: string;
  description?: string;
}

export interface TaskEventPayload {
  taskId: string;
  batchId: string;
  title: string;
  error?: string;
}

export interface BatchProgressPayload {
  batchId: string;
  completed: number;
  total: number;
  currentTaskId?: string;
}

export interface ScanEventPayload {
  scanId: string;
  scanType: string;
  contextId?: string;
  ideasGenerated?: number;
}

// ============================================================================
// Healthcheck Payload
// ============================================================================

export interface HealthcheckPayload {
  zen_mode: boolean;
  active_sessions: number;  // 0-4
  available_slots: number;  // 4 - active_sessions
  timestamp: string;        // ISO string
}

// ============================================================================
// Command Payloads
// ============================================================================

export interface CreateGoalPayload {
  name: string;
  projectId: string;
  description?: string;
  contextId?: string;
}

export interface UpdateGoalPayload {
  goalId: string;
  name?: string;
  description?: string;
  status?: string;
}

export interface IdeaActionPayload {
  ideaId: string;
}

export interface BatchControlPayload {
  batchId: string;
}

export interface TriggerScanPayload {
  projectId: string;
  scanTypes: string[];
  contextIds?: string[];
}

// ============================================================================
// API Response Types
// ============================================================================

export interface RemoteApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface EventsQueryParams {
  project_id?: string;
  event_type?: RemoteEventType;
  since?: string;
  until?: string;
  limit?: number;
  offset?: number;
}

export interface EventsResponse {
  events: RemoteEvent[];
  total: number;
  has_more: boolean;
}

export interface CommandsQueryParams {
  project_id?: string;
  status?: CommandStatus;
  limit?: number;
  offset?: number;
}

export interface SubmitCommandRequest {
  project_id: string;
  command_type: RemoteCommandType;
  payload: Record<string, unknown>;
  api_key: string;
}

export interface CreateClientRequest {
  name: string;
  description?: string;
  permissions?: ClientPermission[];
}

export interface CreateClientResponse {
  id: string;
  api_key: string;
  name: string;
  permissions: ClientPermission[];
}

// ============================================================================
// Command Handler Types
// ============================================================================

export interface CommandHandlerResult {
  success: boolean;
  result?: Record<string, unknown>;
  error?: string;
}

export type CommandHandler = (
  command: RemoteCommand
) => Promise<CommandHandlerResult>;
