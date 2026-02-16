/**
 * Frontend types for the Persona Agent System
 */

import type {
  DbPersona,
  DbPersonaToolDefinition,
  DbPersonaTool,
  DbPersonaTrigger,
  DbPersonaExecution,
  DbPersonaCredential,
  DbCredentialEvent,
  DbPersonaManualReview,
  DbPersonaMessage,
  DbPersonaMessageDelivery,
  NotificationChannel,
  NotificationChannelType,
  PersonaTriggerType,
  PersonaExecutionStatus,
  CredentialServiceType,
  ManualReviewSeverity,
  ManualReviewStatus,
  DbPersonaEvent,
  DbPersonaEventSubscription,
  PersonaEventType,
  PersonaEventSourceType,
  PersonaEventStatus,
  DbPersonaMetricsSnapshot,
  DbPersonaPromptVersion,
} from '@/app/db/models/persona.types';

// Re-export DB types for convenience
export type {
  DbPersona,
  DbPersonaToolDefinition,
  DbPersonaTool,
  DbPersonaTrigger,
  DbPersonaExecution,
  DbPersonaCredential,
  DbCredentialEvent,
  DbPersonaManualReview,
  DbPersonaMessage,
  DbPersonaMessageDelivery,
  NotificationChannel,
  NotificationChannelType,
  PersonaTriggerType,
  PersonaExecutionStatus,
  CredentialServiceType,
  ManualReviewSeverity,
  ManualReviewStatus,
  DbPersonaEvent,
  DbPersonaEventSubscription,
  PersonaEventType,
  PersonaEventSourceType,
  PersonaEventStatus,
  DbPersonaMetricsSnapshot,
  DbPersonaPromptVersion,
};

/** Persona with associated tools, triggers, and event subscriptions */
export interface PersonaWithDetails extends DbPersona {
  tools: DbPersonaToolDefinition[];
  triggers: DbPersonaTrigger[];
  subscriptions?: DbPersonaEventSubscription[];
}

/** Input for creating a persona */
export interface CreatePersonaInput {
  name: string;
  description?: string;
  system_prompt: string;
  icon?: string;
  color?: string;
  enabled?: boolean;
  max_concurrent?: number;
  timeout_ms?: number;
}

/** Input for updating a persona */
export interface UpdatePersonaInput {
  name?: string;
  description?: string | null;
  system_prompt?: string;
  icon?: string | null;
  color?: string | null;
  enabled?: boolean;
  max_concurrent?: number;
  timeout_ms?: number;
}

/** Credential metadata (without encrypted data) */
export interface CredentialMetadata {
  id: string;
  name: string;
  service_type: CredentialServiceType;
  metadata: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Sidebar section types */
export type SidebarSection = 'overview' | 'personas' | 'events' | 'credentials' | 'design-reviews' | 'observability';

/** Editor tab types */
export type EditorTab = 'prompt' | 'executions' | 'settings';

/** Overview sub-tab types */
export type OverviewTab = 'executions' | 'manual-review' | 'messages' | 'usage' | 'events';

/** Tool usage summary row */
export interface ToolUsageSummary {
  tool_name: string;
  total_invocations: number;
  unique_executions: number;
  unique_personas: number;
}

/** Tool usage over time row */
export interface ToolUsageOverTime {
  date: string;
  tool_name: string;
  invocations: number;
}

/** Persona usage summary row */
export interface PersonaUsageSummary {
  persona_id: string;
  persona_name: string;
  persona_icon: string | null;
  persona_color: string | null;
  total_invocations: number;
  unique_tools: number;
}

/** Execution output line from SSE */
export interface ExecutionOutputLine {
  line?: string;
  done?: boolean;
  status?: string;
}

/** Manual review item with persona info (frontend) */
export interface ManualReviewItem extends DbPersonaManualReview {
  persona_name?: string;
  persona_icon?: string;
  persona_color?: string;
}

/** Global execution with persona info (frontend) */
export interface GlobalExecution extends DbPersonaExecution {
  persona_name?: string;
  persona_icon?: string;
  persona_color?: string;
}

/** Input for creating a persona - frontend version */
export interface CreatePersonaInput {
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

/** Input for updating a persona - frontend version */
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
  last_design_result?: string | null;
  model_profile?: string | null;
  max_budget_usd?: number | null;
  max_turns?: number | null;
  design_context?: string | null;
}

/** Parsed frontend connector definition (JSON fields pre-parsed) */
export interface ConnectorDefinition {
  id: string;
  name: string;
  label: string;
  icon_url: string | null;
  color: string;
  category: string;
  fields: import('@/lib/personas/credentialTemplates').CredentialTemplateField[];
  healthcheck_config: { description: string; endpoint?: string; method?: string } | null;
  services: { toolName: string; label: string }[];
  events: import('@/lib/personas/credentialTemplates').CredentialTemplateEvent[];
  is_builtin: boolean;
  created_at?: string;
  updated_at?: string;
}

/** Message with persona info (frontend) */
export interface PersonaMessage extends DbPersonaMessage {
  persona_name?: string;
  persona_icon?: string;
  persona_color?: string;
  deliveries?: DbPersonaMessageDelivery[];
}
