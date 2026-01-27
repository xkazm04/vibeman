/**
 * Integration Framework Types
 * Defines types for external service integrations and connectors
 */

// Integration provider types
export type IntegrationProvider =
  | 'github'
  | 'gitlab'
  | 'slack'
  | 'discord'
  | 'webhook'
  | 'jira'
  | 'linear'
  | 'notion'
  | 'supabase'
  | 'postgres';

// Integration status
export type IntegrationStatus = 'active' | 'inactive' | 'error' | 'pending';

// Event types that can trigger integrations
export type IntegrationEventType =
  | 'goal.created'
  | 'goal.updated'
  | 'goal.completed'
  | 'idea.generated'
  | 'idea.accepted'
  | 'idea.rejected'
  | 'idea.implemented'
  | 'scan.completed'
  | 'implementation.completed'
  | 'context.updated'
  | 'standup.generated'
  | 'automation.started'
  | 'automation.completed'
  | 'automation.failed';

/**
 * Database model for integration configurations
 */
export interface DbIntegration {
  id: string;
  project_id: string;
  provider: IntegrationProvider;
  name: string; // User-friendly name
  description: string | null;
  status: IntegrationStatus;
  config: string; // JSON string with provider-specific configuration
  credentials: string | null; // JSON string with encrypted credentials
  enabled_events: string; // JSON array of IntegrationEventType
  last_sync_at: string | null;
  last_error: string | null;
  error_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Database model for integration event logs
 */
export interface DbIntegrationEvent {
  id: string;
  integration_id: string;
  project_id: string;
  event_type: IntegrationEventType;
  payload: string; // JSON string of event data
  status: 'pending' | 'sent' | 'failed' | 'skipped';
  response: string | null; // JSON string of provider response
  error_message: string | null;
  retry_count: number;
  processed_at: string | null;
  created_at: string;
}

/**
 * Database model for webhook endpoints
 */
export interface DbWebhook {
  id: string;
  integration_id: string;
  project_id: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH';
  headers: string | null; // JSON object of custom headers
  secret: string | null; // Secret for signing payloads
  retry_on_failure: number; // Boolean flag (0 or 1)
  max_retries: number;
  timeout_ms: number;
  created_at: string;
  updated_at: string;
}

// Provider-specific configuration types

/**
 * GitHub integration configuration
 */
export interface GitHubConfig {
  owner: string;
  repo: string;
  defaultBranch?: string;
  syncIssues?: boolean;
  syncPRs?: boolean;
  labelMapping?: Record<string, string>; // Map Vibeman categories to GitHub labels
  autoCreateIssues?: boolean;
  autoUpdateIssues?: boolean;
}

/**
 * GitHub credentials
 */
export interface GitHubCredentials {
  accessToken: string;
  tokenType?: 'personal' | 'oauth' | 'app';
}

/**
 * Slack integration configuration
 */
export interface SlackConfig {
  channel: string; // Channel ID or name
  username?: string;
  iconEmoji?: string;
  threadMode?: boolean; // Group related messages in threads
}

/**
 * Slack credentials
 */
export interface SlackCredentials {
  webhookUrl?: string;
  botToken?: string;
}

/**
 * Discord integration configuration
 */
export interface DiscordConfig {
  channelId: string;
  username?: string;
  avatarUrl?: string;
  embedMode?: boolean; // Use rich embeds
}

/**
 * Discord credentials
 */
export interface DiscordCredentials {
  webhookUrl: string;
}

/**
 * Generic webhook configuration
 */
export interface WebhookConfig {
  payloadFormat?: 'json' | 'form';
  includeMetadata?: boolean;
  customFields?: Record<string, string>;
}

/**
 * Supabase integration configuration
 * Maps Vibeman events to Supabase table inserts
 */
export interface SupabaseConfig {
  projectUrl: string; // Supabase project URL
  tableName: string; // Target table for events
  columnMapping?: Record<string, string>; // Map event fields to table columns
  includeMetadata?: boolean; // Include event metadata in insert
}

/**
 * Supabase credentials
 */
export interface SupabaseCredentials {
  anonKey: string; // Public anon key
  serviceRoleKey?: string; // Optional service role key for elevated access
}

/**
 * PostgreSQL direct integration configuration
 * For direct database connections
 */
export interface PostgresConfig {
  host: string;
  port: number;
  database: string;
  schema?: string; // Default: public
  tableName: string;
  columnMapping?: Record<string, string>; // Map event fields to table columns
  sslMode?: 'disable' | 'require' | 'verify-ca' | 'verify-full';
  includeMetadata?: boolean;
}

/**
 * PostgreSQL credentials
 */
export interface PostgresCredentials {
  username: string;
  password: string;
}

/**
 * Event payload structure sent to integrations
 */
export interface IntegrationEventPayload {
  eventType: IntegrationEventType;
  projectId: string;
  projectName?: string;
  timestamp: string;
  data: Record<string, unknown>;
  metadata?: {
    source: string;
    version: string;
    triggeredBy?: string;
  };
}

/**
 * Integration connector interface (for runtime use)
 */
export interface IntegrationConnector {
  provider: IntegrationProvider;
  validate(config: Record<string, unknown>, credentials: Record<string, unknown>): Promise<{ valid: boolean; error?: string }>;
  testConnection(config: Record<string, unknown>, credentials: Record<string, unknown>): Promise<{ success: boolean; message: string; schemaRequired?: boolean }>;
  sendEvent(
    event: IntegrationEventPayload,
    config: Record<string, unknown>,
    credentials: Record<string, unknown>
  ): Promise<{ success: boolean; response?: unknown; error?: string }>;
}

/**
 * Integration registry entry
 */
export interface IntegrationRegistryEntry {
  provider: IntegrationProvider;
  name: string;
  description: string;
  icon: string;
  configSchema: Record<string, unknown>;
  credentialsSchema: Record<string, unknown>;
  supportedEvents: IntegrationEventType[];
  documentationUrl?: string;
}
