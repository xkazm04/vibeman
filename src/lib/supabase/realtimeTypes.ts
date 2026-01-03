/**
 * Supabase Realtime Type Definitions
 * Types for cross-device Zen mode communication
 */

// ============================================================================
// Database Types (matching Supabase schema)
// ============================================================================

export interface DbDeviceSession {
  id: string;
  device_id: string;
  device_name: string;
  project_id: string;
  role: 'active' | 'passive' | 'observer';
  pairing_code: string | null;
  partner_device_id: string | null;
  is_online: boolean;
  last_seen_at: string;
  capabilities: DeviceCapabilities;
  created_at: string;
  updated_at: string;
}

export interface DbBridgeEvent {
  id: string;
  project_id: string;
  device_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  timestamp: string;
  created_at: string;
}

export interface DbOffloadTask {
  id: string;
  project_id: string;
  source_device_id: string;
  target_device_id: string | null;
  requirement_name: string;
  requirement_content: string;
  context_path: string | null;
  status: OffloadTaskStatus;
  priority: number;
  claimed_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  result_summary: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Application Types
// ============================================================================

export interface DeviceCapabilities {
  canExecute: boolean;
  hasClaudeCode: boolean;
}

export type OffloadTaskStatus =
  | 'pending'
  | 'claimed'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type DeviceRole = 'active' | 'passive' | 'observer';

// ============================================================================
// Realtime Channel Types
// ============================================================================

export interface PresenceState {
  deviceId: string;
  deviceName: string;
  projectId: string;
  role: DeviceRole;
  capabilities: DeviceCapabilities;
  onlineAt: string;
}

export interface TaskBroadcast {
  type: 'task:new' | 'task:claimed' | 'task:status' | 'task:cancelled';
  taskId: string;
  deviceId?: string;
  status?: OffloadTaskStatus;
  result?: string;
  error?: string;
}

export interface EventBroadcast {
  type: string; // BridgeEventType
  payload: Record<string, unknown>;
  timestamp: string;
  sourceDeviceId: string;
}

// ============================================================================
// Pairing Types
// ============================================================================

export interface PairingState {
  status: 'unpaired' | 'waiting' | 'paired';
  pairingCode: string | null;
  partnerId: string | null;
  partnerName: string | null;
}

// ============================================================================
// Connection State
// ============================================================================

export interface RealtimeConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastConnectedAt: Date | null;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface ConnectRequest {
  deviceId: string;
  deviceName: string;
  projectId: string;
  role: DeviceRole;
  capabilities?: DeviceCapabilities;
}

export interface ConnectResponse {
  success: boolean;
  sessionId: string;
  pairingCode?: string;
}

export interface PairRequest {
  deviceId: string;
  pairingCode: string;
}

export interface PairResponse {
  success: boolean;
  partnerId?: string;
  partnerName?: string;
  error?: string;
}

export interface CreateTaskRequest {
  projectId: string;
  requirementName: string;
  requirementContent: string;
  contextPath?: string;
  targetDeviceId?: string;
  priority?: number;
}

export interface CreateTaskResponse {
  success: boolean;
  taskId?: string;
  error?: string;
}

export interface ClaimTaskRequest {
  taskId: string;
  deviceId: string;
}

export interface UpdateTaskStatusRequest {
  taskId: string;
  status: OffloadTaskStatus;
  resultSummary?: string;
  errorMessage?: string;
}

// ============================================================================
// Event Query Types
// ============================================================================

export interface EventQueryParams {
  projectId: string;
  since?: string; // ISO timestamp
  until?: string; // ISO timestamp
  type?: string;
  deviceId?: string;
  limit?: number;
  offset?: number;
}

export interface EventQueryResponse {
  events: DbBridgeEvent[];
  total: number;
  hasMore: boolean;
}
