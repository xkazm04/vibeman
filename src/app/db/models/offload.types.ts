/**
 * Cross-Device Offload System Types
 * Types for device pairing and task offloading between Vibeman instances
 */

// ============================================================================
// STATUS TYPES
// ============================================================================

export type DeviceRole = 'active' | 'passive';
export type PairingStatus = 'pending' | 'paired' | 'disconnected';
export type OffloadTaskStatus = 'pending' | 'synced' | 'running' | 'completed' | 'failed';

// ============================================================================
// DATABASE TYPES (snake_case, map directly to columns)
// ============================================================================

export interface DbDevicePair {
  id: string;
  project_id: string;
  device_name: string;
  device_role: DeviceRole;
  pairing_code: string | null;
  partner_url: string | null;
  partner_device_name: string | null;
  status: PairingStatus;
  last_heartbeat_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbOffloadTask {
  id: string;
  device_pair_id: string;
  project_id: string;
  requirement_name: string;
  requirement_content: string;
  context_path: string | null;
  status: OffloadTaskStatus;
  priority: number;
  synced_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  result_summary: string | null;
  error_message: string | null;
  created_at: string;
}

// ============================================================================
// API RESPONSE TYPES (camelCase, for frontend)
// ============================================================================

export interface DevicePairResponse {
  id: string;
  projectId: string;
  deviceName: string;
  deviceRole: DeviceRole;
  pairingCode: string | null;
  partnerUrl: string | null;
  partnerDeviceName: string | null;
  status: PairingStatus;
  lastHeartbeatAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OffloadTaskResponse {
  id: string;
  devicePairId: string;
  projectId: string;
  requirementName: string;
  requirementContent: string;
  contextPath: string | null;
  status: OffloadTaskStatus;
  priority: number;
  syncedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  resultSummary: string | null;
  errorMessage: string | null;
  createdAt: string;
}

// ============================================================================
// API REQUEST TYPES
// ============================================================================

export interface CreatePairingRequest {
  projectId: string;
  deviceName: string;
}

export interface CreatePairingResponse {
  pairingCode: string;
  expiresAt: string;
  devicePairId: string;
}

export interface AcceptPairingRequest {
  pairingCode: string;
  projectPath: string;
  deviceName: string;
  callbackUrl: string;
}

export interface AcceptPairingResponse {
  success: boolean;
  devicePairId: string;
  projectId: string;
  partnerDeviceName: string;
}

export interface PushTasksRequest {
  devicePairId: string;
  tasks: Array<{
    requirementName: string;
    requirementContent: string;
    priority?: number;
  }>;
}

export interface PushTasksResponse {
  queued: number;
  taskIds: string[];
}

export interface PullTasksResponse {
  tasks: Array<{
    id: string;
    requirementName: string;
    requirementContent: string;
    priority: number;
  }>;
}

export interface UpdateTaskStatusRequest {
  taskId: string;
  status: OffloadTaskStatus;
  resultSummary?: string;
  errorMessage?: string;
}

export interface TaskStatusResponse {
  tasks: Array<{
    id: string;
    requirementName: string;
    status: OffloadTaskStatus;
    startedAt: string | null;
    completedAt: string | null;
    resultSummary: string | null;
    errorMessage: string | null;
  }>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert database row to API response format
 */
export function toDevicePairResponse(row: DbDevicePair): DevicePairResponse {
  return {
    id: row.id,
    projectId: row.project_id,
    deviceName: row.device_name,
    deviceRole: row.device_role,
    pairingCode: row.pairing_code,
    partnerUrl: row.partner_url,
    partnerDeviceName: row.partner_device_name,
    status: row.status,
    lastHeartbeatAt: row.last_heartbeat_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toOffloadTaskResponse(row: DbOffloadTask): OffloadTaskResponse {
  return {
    id: row.id,
    devicePairId: row.device_pair_id,
    projectId: row.project_id,
    requirementName: row.requirement_name,
    requirementContent: row.requirement_content,
    contextPath: row.context_path,
    status: row.status,
    priority: row.priority,
    syncedAt: row.synced_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    resultSummary: row.result_summary,
    errorMessage: row.error_message,
    createdAt: row.created_at,
  };
}
