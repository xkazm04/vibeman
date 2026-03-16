/**
 * Centralized API Type Definitions
 *
 * Canonical request/response types shared between API routes and frontend consumers.
 * Import from '@/types/api' for all API-related type needs.
 *
 * The codebase has multiple response builders (responseFormatter, api-errors, apiResponse).
 * These types define the *client-facing shapes* that frontend code should depend on.
 */

// Re-export error infrastructure so consumers have a single import point
export { ApiErrorCode } from '@/lib/api-errors';
export type { ApiError } from '@/lib/api-errors';

// ---------------------------------------------------------------------------
// Standard API Response Envelope
// ---------------------------------------------------------------------------

/**
 * Successful API response shape.
 * All API routes return this for 2xx responses.
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  /** Present when using responseFormatter */
  timestamp?: string;
  /** Optional success message */
  message?: string;
  /** Optional metadata (caching, versioning, etc.) */
  meta?: Record<string, unknown>;
}

/**
 * Error API response shape.
 * All API routes return this for 4xx/5xx responses.
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  /** Machine-readable error code (from ApiErrorCode enum) */
  code?: string;
  /** Present when using responseFormatter */
  timestamp?: string;
  /** Field-level validation errors */
  fieldErrors?: Record<string, string>;
  /** Additional error context */
  details?: string | Record<string, unknown>;
  /** User-friendly error description */
  userMessage?: string;
  /** Suggested recovery steps */
  recoveryActions?: Array<{ label: string; action: string }>;
}

/**
 * Union type for any API response.
 * Use to type `fetch().json()` results before narrowing on `success`.
 *
 * @example
 * const res = await fetch('/api/goals');
 * const json: ApiResponse<GoalsListData> = await res.json();
 * if (json.success) {
 *   // json.data is GoalsListData
 * } else {
 *   // json.error is string
 * }
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

/** Standard pagination parameters for GET requests */
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

/** Pagination metadata included in list responses */
export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/** A paginated list response */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

// ---------------------------------------------------------------------------
// Common Request Shapes
// ---------------------------------------------------------------------------

/** Query params for project-scoped endpoints */
export interface ProjectScopedParams {
  projectId: string;
}

/** Query params for context-scoped endpoints */
export interface ContextScopedParams extends ProjectScopedParams {
  contextId?: string;
}

/** Standard ID param for single-resource endpoints */
export interface ResourceIdParams {
  id: string;
}

/** Batch operation request body */
export interface BatchOperationRequest<T = string> {
  ids: T[];
}

// ---------------------------------------------------------------------------
// Common Response Data Shapes
// ---------------------------------------------------------------------------

/** Response for batch/bulk operations */
export interface BatchOperationResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors?: Array<{ id: string; error: string }>;
}

/** Response for delete operations */
export interface DeleteResult {
  deleted: boolean;
}

/** Response for operations that return a count */
export interface CountResult {
  count: number;
}

// ---------------------------------------------------------------------------
// Domain-Specific API Data Types
// ---------------------------------------------------------------------------

// Re-export domain-specific API types for convenience
export type { GoalResponse, GoalsListResponse, GoalMutationResponse, GoalDeleteResponse } from '@/lib/api-types/goals';

// -- Ideas ------------------------------------------------------------------

/** POST /api/ideas (create) request body */
export interface CreateIdeaRequest {
  projectId: string;
  contextId?: string;
  scanType: string;
  category: string;
  title: string;
  description?: string;
  reasoning?: string;
  effort?: number;
  impact?: number;
  risk?: number;
}

/** PATCH /api/ideas (update) request body */
export interface UpdateIdeaRequest {
  id: string;
  status?: 'pending' | 'accepted' | 'rejected' | 'implemented';
  category?: string;
  title?: string;
  description?: string;
  effort?: number;
  impact?: number;
  risk?: number;
  userFeedback?: string;
  goalId?: string | null;
}

// -- Projects ---------------------------------------------------------------

/** POST /api/projects request body */
export interface CreateProjectRequest {
  name: string;
  path: string;
  port?: number;
  description?: string;
  type?: string;
  runScript?: string;
  workspaceId?: string;
}

/** PUT /api/projects request body */
export interface UpdateProjectRequest extends Partial<CreateProjectRequest> {
  id: string;
}

// -- Implementation Logs ----------------------------------------------------

/** Enriched implementation log returned by /api/implementation-logs/untested */
export interface EnrichedImplementationLogData {
  id: string;
  project_id: string;
  context_id: string | null;
  requirement_name: string;
  title: string;
  overview: string;
  overview_bullets: string | null;
  tested: number;
  screenshot: string | null;
  provider: string | null;
  model: string | null;
  created_at: string;
  project_name?: string;
  context_name?: string;
  context_group_id?: string;
  context_group_name?: string;
  context_group_color?: string;
}

// -- Conductor --------------------------------------------------------------

/** POST /api/conductor/run request body */
export interface ConductorRunRequest {
  projectId: string;
  goalId: string;
  mode?: 'full' | 'plan_only' | 'dispatch_only';
}

/** GET /api/conductor/status response data */
export interface ConductorStatusData {
  status: 'idle' | 'running' | 'completed' | 'failed';
  currentPhase?: string;
  runId?: string;
  progress?: number;
  error?: string;
}

// -- Scans ------------------------------------------------------------------

/** POST /api/scans/queue request body */
export interface QueueScanRequest {
  projectId: string;
  scanType: string;
  contextId?: string;
  priority?: number;
}

// -- Context ----------------------------------------------------------------

/** POST /api/contexts request body */
export interface CreateContextRequest {
  projectId: string;
  name: string;
  description?: string;
  filePaths: string[];
  groupId?: string;
}

/** PUT /api/contexts request body */
export interface UpdateContextRequest extends Partial<CreateContextRequest> {
  id: string;
}
