/**
 * Claude Code Session Management Types
 * Types for managing Claude Code sessions with --resume flag support
 */

// ============================================================================
// STATUS TYPES
// ============================================================================

// Note: Prefixed with ClaudeCode to avoid conflict with red-team.types.ts SessionStatus
export type ClaudeCodeSessionStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed';
export type ClaudeCodeSessionTaskStatus = 'pending' | 'running' | 'completed' | 'failed';

// ============================================================================
// DATABASE TYPES (snake_case, map directly to columns)
// ============================================================================

export interface DbClaudeCodeSession {
  id: string;                        // Internal session ID (UUID)
  project_id: string;
  name: string;                      // User-friendly session name
  claude_session_id: string | null;  // Claude CLI session ID (captured after first execution)
  task_ids: string;                  // JSON array of task IDs
  status: ClaudeCodeSessionStatus;
  context_tokens: number;            // Estimated token count for the session
  created_at: string;
  updated_at: string;
}

export interface DbSessionTask {
  id: string;
  session_id: string;                // FK to claude_code_sessions
  task_id: string;                   // Reference to requirement (projectId:requirementName)
  requirement_name: string;          // Human-readable name
  order_index: number;               // Execution order within session
  status: ClaudeCodeSessionTaskStatus;
  claude_session_id: string | null;  // Captured from this task's execution
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
}

// ============================================================================
// API RESPONSE TYPES (camelCase, for frontend)
// ============================================================================

export interface SessionResponse {
  id: string;
  projectId: string;
  name: string;
  claudeSessionId: string | null;
  taskIds: string[];
  status: ClaudeCodeSessionStatus;
  contextTokens: number;
  createdAt: string;
  updatedAt: string;
}

export interface SessionTaskResponse {
  id: string;
  sessionId: string;
  taskId: string;
  requirementName: string;
  orderIndex: number;
  status: ClaudeCodeSessionTaskStatus;
  claudeSessionId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

// ============================================================================
// API REQUEST TYPES
// ============================================================================

export interface CreateSessionRequest {
  projectId: string;
  name: string;
  taskId: string;
  requirementName: string;
}

export interface CreateSessionResponse {
  id: string;
  internalSessionId: string;
}

export interface AddTaskToSessionRequest {
  sessionId: string;
  taskId: string;
  requirementName: string;
}

export interface UpdateSessionClaudeIdRequest {
  sessionId: string;
  claudeSessionId: string;
}

export interface UpdateSessionStatusRequest {
  sessionId: string;
  status: ClaudeCodeSessionStatus;
}

export interface UpdateSessionTaskStatusRequest {
  taskId: string;
  status: ClaudeCodeSessionTaskStatus;
  claudeSessionId?: string;
  errorMessage?: string;
}

export interface CompactSessionRequest {
  sessionId: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert database row to API response format
 */
export function toSessionResponse(row: DbClaudeCodeSession): SessionResponse {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    claudeSessionId: row.claude_session_id,
    taskIds: JSON.parse(row.task_ids || '[]'),
    status: row.status,
    contextTokens: row.context_tokens,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toSessionTaskResponse(row: DbSessionTask): SessionTaskResponse {
  return {
    id: row.id,
    sessionId: row.session_id,
    taskId: row.task_id,
    requirementName: row.requirement_name,
    orderIndex: row.order_index,
    status: row.status,
    claudeSessionId: row.claude_session_id,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    errorMessage: row.error_message,
    createdAt: row.created_at,
  };
}
