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

export type PersonaEventType =
  | 'webhook_received'
  | 'execution_completed'
  | 'persona_action'
  | 'credential_event'
  | 'task_created'
  | 'custom';

export type PersonaEventSourceType =
  | 'webhook'
  | 'execution'
  | 'persona'
  | 'trigger'
  | 'system';

export type PersonaEventStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'skipped';

// ============================================================================
// Model & Provider Configuration
// ============================================================================

export type ModelProvider = 'anthropic' | 'ollama' | 'litellm' | 'custom';

export interface ModelProfile {
  model?: string;         // e.g., 'haiku', 'sonnet', 'opus', or custom model ID
  provider?: ModelProvider;
  base_url?: string;      // e.g., 'http://localhost:11434' for Ollama
  auth_token?: string;    // e.g., 'ollama' for Ollama provider
}

// ============================================================================
// Design Context (data sources for design engine)
// ============================================================================

export type DesignFileType = 'api-spec' | 'schema' | 'mcp-config' | 'other';

export interface DesignFile {
  name: string;
  content: string;
  type: DesignFileType;
}

export interface DesignContext {
  files: DesignFile[];
  references: string[];  // free-text URLs, credentials, notes
}

// ============================================================================
// Database Models
// ============================================================================

export interface DbPersona {
  id: string;
  project_id: string;
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
  model_profile: string | null;       // JSON: ModelProfile
  max_budget_usd: number | null;
  max_turns: number | null;
  design_context: string | null;       // JSON: DesignContext
  group_id: string | null;           // FK to persona_groups
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
  execution_flows: string | null;
  model_used: string | null;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
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
  project_id?: string;
  name: string;
  description?: string;
  system_prompt: string;
  structured_prompt?: string;
  icon?: string;
  color?: string;
  enabled?: boolean;
  max_concurrent?: number;
  timeout_ms?: number;
  model_profile?: string;
  max_budget_usd?: number;
  max_turns?: number;
  design_context?: string;
  group_id?: string | null;
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
  model_profile?: string | null;
  max_budget_usd?: number | null;
  max_turns?: number | null;
  design_context?: string | null;
  group_id?: string | null;
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

// ============================================================================
// Event Bus Models
// ============================================================================

export interface DbPersonaEvent {
  id: string;
  project_id: string;
  event_type: PersonaEventType;
  source_type: PersonaEventSourceType;
  source_id: string | null;
  target_persona_id: string | null;
  payload: string | null;
  status: PersonaEventStatus;
  error_message: string | null;
  processed_at: string | null;
  created_at: string;
}

export interface DbPersonaEventSubscription {
  id: string;
  persona_id: string;
  event_type: string;
  source_filter: string | null;
  enabled: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePersonaEventInput {
  id?: string;
  project_id?: string;
  event_type: PersonaEventType;
  source_type: PersonaEventSourceType;
  source_id?: string;
  target_persona_id?: string;
  payload?: object;
}

export interface CreateEventSubscriptionInput {
  id?: string;
  persona_id: string;
  event_type: string;
  source_filter?: object;
  enabled?: boolean;
}

export interface UpdateEventSubscriptionInput {
  event_type?: string;
  source_filter?: object;
  enabled?: boolean;
}

// ============================================================================
// Observability Models
// ============================================================================

export interface DbPersonaMetricsSnapshot {
  id: string;
  persona_id: string;
  snapshot_date: string;
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  total_cost_usd: number;
  total_input_tokens: number;
  total_output_tokens: number;
  avg_duration_ms: number;
  tools_used: string | null; // JSON: string[]
  events_emitted: number;
  events_consumed: number;
  messages_sent: number;
  created_at: string;
}

export interface DbPersonaPromptVersion {
  id: string;
  persona_id: string;
  version_number: number;
  structured_prompt: string | null;
  system_prompt: string | null;
  change_summary: string | null;
  created_at: string;
}

// ============================================================================
// Team Canvas Models
// ============================================================================

export type TeamRole = 'orchestrator' | 'worker' | 'reviewer' | 'router';
export type ConnectionType = 'sequential' | 'conditional' | 'parallel' | 'feedback';

export interface DbPersonaTeam {
  id: string;
  project_id: string | null;
  name: string;
  description: string | null;
  canvas_data: string | null;      // JSON: React Flow nodes + edges
  team_config: string | null;      // JSON: execution settings
  icon: string | null;
  color: string;
  enabled: number;
  created_at: string;
  updated_at: string;
}

export interface DbPersonaTeamMember {
  id: string;
  team_id: string;
  persona_id: string;
  role: TeamRole;
  position_x: number;
  position_y: number;
  config: string | null;           // JSON: node-specific overrides
  created_at: string;
}

export interface DbPersonaTeamConnection {
  id: string;
  team_id: string;
  source_member_id: string;
  target_member_id: string;
  connection_type: ConnectionType;
  condition: string | null;        // JSON: condition config
  label: string | null;
  created_at: string;
}

export interface CreateTeamInput {
  id?: string;
  project_id?: string;
  name: string;
  description?: string;
  canvas_data?: string;
  team_config?: string;
  icon?: string;
  color?: string;
  enabled?: boolean;
}

export interface UpdateTeamInput {
  name?: string;
  description?: string | null;
  canvas_data?: string | null;
  team_config?: string | null;
  icon?: string | null;
  color?: string | null;
  enabled?: boolean;
}

// ============================================================================
// Healing Mechanism Models
// ============================================================================

export type HealingIssueSeverity = 'low' | 'medium' | 'high' | 'critical';
export type HealingIssueCategory = 'prompt' | 'tool' | 'config' | 'external';
export type HealingIssueStatus = 'open' | 'resolved';

export interface DbPersonaHealingIssue {
  id: string;
  persona_id: string;
  execution_id: string | null;
  title: string;
  description: string;
  severity: HealingIssueSeverity;
  category: HealingIssueCategory;
  suggested_fix: string | null;
  auto_fixed: number;
  status: HealingIssueStatus;
  created_at: string;
  resolved_at: string | null;
}

// ============================================================================
// Persona Groups
// ============================================================================

export interface DbPersonaGroup {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  collapsed: number; // 0 or 1
  created_at: string;
  updated_at: string;
}

export interface CreatePersonaGroupInput {
  id?: string;
  name: string;
  color?: string;
  sort_order?: number;
}

export interface UpdatePersonaGroupInput {
  name?: string;
  color?: string;
  sort_order?: number;
  collapsed?: number;
}
