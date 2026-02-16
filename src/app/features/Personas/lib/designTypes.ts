/**
 * Types for the Persona Design Analysis system.
 * Used by the Design tab to drive LLM-based prompt generation.
 */

import type { StructuredPromptSection } from '@/lib/personas/promptMigration';

/** A question from the design engine asking for user clarification */
export interface DesignQuestion {
  question: string;
  options?: string[];
  context?: string;
}

/** A structured highlight category from design analysis */
export interface DesignHighlight {
  category: string;       // "Connectors & Permissions", "Events & Triggers", etc.
  icon: string;           // Lucide icon name: 'Plug', 'Zap', 'Shield', 'Clock', 'Code', 'Brain'
  color: string;          // Tailwind color class: 'text-blue-400', 'text-amber-400', etc.
  items: string[];        // Bullet points
  /** Maps this highlight to a structured_prompt section for per-tab rendering */
  section?: 'identity' | 'instructions' | 'toolGuidance' | 'examples' | 'errorHandling' | string;
}

/** Enriched connector suggestion from design analysis */
export interface SuggestedConnector {
  name: string;
  setup_url?: string;
  setup_instructions?: string;
  /** When set (e.g. 'google'), the credential modal shows an OAuth authorize flow instead of manual fields */
  oauth_type?: string;
  credential_fields?: Array<{
    key: string;
    label: string;
    type: 'text' | 'password' | 'url';
    placeholder?: string;
    helpText?: string;
    required?: boolean;
  }>;
  related_tools?: string[];
  related_triggers?: number[];
}

/** The JSON output schema from Claude design analysis */
export interface DesignAnalysisResult {
  structured_prompt: {
    identity: string;
    instructions: string;
    toolGuidance: string;
    examples: string;
    errorHandling: string;
    customSections: StructuredPromptSection[];
  };
  suggested_tools: string[];
  suggested_triggers: SuggestedTrigger[];
  full_prompt_markdown: string;
  summary: string;
  design_highlights?: DesignHighlight[];
  suggested_connectors?: SuggestedConnector[];
  suggested_notification_channels?: SuggestedNotificationChannel[];
  /** Inline feasibility assessment produced during design analysis */
  feasibility?: DesignTestResult;
  suggested_event_subscriptions?: SuggestedEventSubscription[];
}

/** A notification channel suggestion from design analysis */
export interface SuggestedNotificationChannel {
  type: 'slack' | 'telegram' | 'email';
  description: string;
  required_connector: string;
  config_hints: Record<string, string>;
}

/** A trigger suggestion from design analysis */
export interface SuggestedTrigger {
  trigger_type: 'manual' | 'schedule' | 'polling' | 'webhook';
  config: Record<string, unknown>;
  description: string;
}

/** Phase of the design analysis lifecycle */
export type DesignPhase = 'idle' | 'analyzing' | 'preview' | 'applying' | 'applied' | 'refining' | 'awaiting-input';

/** Result of a design feasibility test */
export interface DesignTestResult {
  confirmed_capabilities: string[];
  issues: string[];
  overall_feasibility: 'ready' | 'partial' | 'blocked';
}

/** An event subscription suggestion from design analysis */
export interface SuggestedEventSubscription {
  event_type: string;
  source_filter?: Record<string, unknown>;
  description: string;
}

/** Status of a running design analysis */
export interface DesignStatus {
  done: boolean;
  result: DesignAnalysisResult | null;
  error: string | null;
  question?: DesignQuestion | null;
}
