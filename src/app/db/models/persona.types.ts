/**
 * Persona Agent System - Database Type Definitions
 * Types for AI persona agents that replace traditional workflow automation
 */

// ============================================================================
// Enum Types
// ============================================================================

export type PersonaTriggerType = 'manual' | 'schedule' | 'polling' | 'webhook';
export type PersonaExecutionStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type CredentialServiceType = string;
export type ManualReviewSeverity = 'info' | 'warning' | 'critical';
export type ManualReviewStatus = 'pending' | 'approved' | 'rejected' | 'deferred';

// ============================================================================
// Database Models
// ============================================================================

export interface DbPersona {
  id: string;
  name: string;
  description: string | null;
  system_prompt: string;
  structured_prompt: string | null; // JSON StructuredPrompt
  icon: string | null;
  color: string | null;
  enabled: number; // 0 or 1
  max_concurrent: number;
  timeout_ms: number;
  notification_channels: string | null; // JSON: NotificationChannel[]
  last_design_result: string | null; // JSON: DesignAnalysisResult
  created_at: string;
  updated_at: string;
}

export interface DbPersonaToolDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  script_path: string;
  input_schema: string | null; // JSON
  output_schema: string | null; // JSON
  requires_credential_type: CredentialServiceType | null;
  is_builtin: number; // 0 or 1
  created_at: string;
  updated_at: string;
}

export interface DbPersonaTool {
  id: string;
  persona_id: string;
  tool_id: string;
  tool_config: string | null; // JSON
  created_at: string;
}

export interface DbPersonaTrigger {
  id: string;
  persona_id: string;
  trigger_type: PersonaTriggerType;
  config: string | null; // JSON - interval, cron, webhook path, etc.
  enabled: number; // 0 or 1
  last_triggered_at: string | null;
  next_trigger_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbPersonaExecution {
  id: string;
  persona_id: string;
  trigger_id: string | null;
  status: PersonaExecutionStatus;
  input_data: string | null; // JSON
  output_data: string | null; // JSON
  claude_session_id: string | null;
  log_file_path: string | null;
  error_message: string | null;
  duration_ms: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface DbPersonaCredential {
  id: string;
  name: string;
  service_type: CredentialServiceType;
  encrypted_data: string;
  iv: string;
  metadata: string | null; // JSON
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Input Types (for create/update operations)
// ============================================================================

export interface CreatePersonaInput {
  id?: string;
  name: string;
  description?: string;
  system_prompt: string;
  structured_prompt?: string;
  icon?: string;
  color?: string;
  enabled?: boolean;
  max_concurrent?: number;
  timeout_ms?: number;
}

export interface UpdatePersonaInput {
  name?: string;
  description?: string | null;
  system_prompt?: string;
  structured_prompt?: string | null;
  icon?: string | null;
  color?: string | null;
  enabled?: boolean;
  max_concurrent?: number;
  timeout_ms?: number;
  notification_channels?: string;
  last_design_result?: string | null;
}

export interface CreateToolDefinitionInput {
  id?: string;
  name: string;
  category: string;
  description: string;
  script_path: string;
  input_schema?: object;
  output_schema?: object;
  requires_credential_type?: CredentialServiceType;
  is_builtin?: boolean;
}

export interface CreateTriggerInput {
  id?: string;
  persona_id: string;
  trigger_type: PersonaTriggerType;
  config?: object;
  enabled?: boolean;
}

export interface UpdateTriggerInput {
  trigger_type?: PersonaTriggerType;
  config?: object;
  enabled?: boolean;
  next_trigger_at?: string | null;
}

export interface CreateCredentialInput {
  id?: string;
  name: string;
  service_type: CredentialServiceType;
  encrypted_data: string;
  iv: string;
  metadata?: object;
}

// ============================================================================
// Credential Events
// ============================================================================

export interface DbCredentialEvent {
  id: string;
  credential_id: string;
  event_template_id: string;
  name: string;
  config: string | null; // JSON
  enabled: number; // 0 or 1
  last_polled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCredentialEventInput {
  id?: string;
  credential_id: string;
  event_template_id: string;
  name: string;
  config?: object;
  enabled?: boolean;
}

export interface UpdateCredentialEventInput {
  name?: string;
  config?: object;
  enabled?: boolean;
  last_polled_at?: string;
}

// ============================================================================
// Manual Reviews
// ============================================================================

export interface DbPersonaManualReview {
  id: string;
  execution_id: string;
  persona_id: string;
  title: string;
  description: string | null;
  severity: ManualReviewSeverity;
  context_data: string | null; // JSON
  suggested_actions: string | null; // JSON
  status: ManualReviewStatus;
  reviewer_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateManualReviewInput {
  id?: string;
  execution_id: string;
  persona_id: string;
  title: string;
  description?: string;
  severity?: ManualReviewSeverity;
  context_data?: object;
  suggested_actions?: string[];
}

export interface UpdateManualReviewInput {
  status?: ManualReviewStatus;
  reviewer_notes?: string;
  resolved_at?: string;
}

// ============================================================================
// Connector Definitions
// ============================================================================

export interface DbConnectorDefinition {
  id: string;
  name: string;
  label: string;
  icon_url: string | null;
  color: string;
  category: string;
  fields: string;            // JSON
  healthcheck_config: string | null; // JSON
  services: string;          // JSON
  events: string;            // JSON
  metadata: string | null;
  is_builtin: number;        // 0 or 1
  created_at: string;
  updated_at: string;
}

export interface CreateConnectorDefinitionInput {
  id?: string;
  name: string;
  label: string;
  icon_url?: string | null;
  color?: string;
  category?: string;
  fields: object[];
  healthcheck_config?: object | null;
  services?: object[];
  events?: object[];
  metadata?: object | null;
  is_builtin?: boolean;
}

export interface UpdateConnectorDefinitionInput {
  name?: string;
  label?: string;
  icon_url?: string | null;
  color?: string;
  category?: string;
  fields?: object[];
  healthcheck_config?: object | null;
  services?: object[];
  events?: object[];
  metadata?: object | null;
}

// ============================================================================
// Notification Channels & Messages
// ============================================================================

export type NotificationChannelType = 'in_app' | 'slack' | 'telegram' | 'email';
export type MessagePriority = 'low' | 'normal' | 'high';
export type DeliveryStatus = 'pending' | 'delivered' | 'failed';

export interface NotificationChannel {
  id: string;
  type: NotificationChannelType;
  credential_id?: string;
  config: Record<string, string>;
  enabled: boolean;
}

export interface DbPersonaMessage {
  id: string;
  persona_id: string;
  execution_id: string | null;
  title: string | null;
  content: string;
  content_type: string;
  priority: string;
  is_read: number;
  metadata: string | null;
  created_at: string;
  read_at: string | null;
}

export interface DbPersonaMessageDelivery {
  id: string;
  message_id: string;
  channel_type: string;
  status: string;
  error_message: string | null;
  external_id: string | null;
  delivered_at: string | null;
  created_at: string;
}

export interface CreateMessageInput {
  persona_id: string;
  execution_id?: string;
  title?: string;
  content: string;
  content_type?: string;
  priority?: string;
  metadata?: object;
}
