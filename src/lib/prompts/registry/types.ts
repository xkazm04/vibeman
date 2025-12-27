/**
 * Centralized Prompt Registry Types
 *
 * Core type definitions for the prompt management system.
 * Supports composition, versioning, and type-safe variable substitution.
 */

// Re-export ScanType for convenience, but allow string for broader compatibility
export type ScanType =
  | 'zen_architect'
  | 'bug_hunter'
  | 'perf_optimizer'
  | 'security_protector'
  | 'insight_synth'
  | 'ambiguity_guardian'
  | 'business_visionary'
  | 'ui_perfectionist'
  | 'feature_scout'
  | 'onboarding_optimizer'
  | 'ai_integration_scout'
  | 'delight_designer'
  | 'refactor_analysis'
  | 'code_refactor'
  | 'user_empathy_champion'
  | 'paradigm_shifter'
  | 'moonshot_architect'
  | 'dev_experience_engineer'
  | 'data_flow_optimizer'
  | 'pragmatic_integrator'
  | 'accessibility_advocate';

/**
 * Prompt category for organization
 */
export type PromptCategory =
  | 'agent'           // AI agent personas (bug_hunter, zen_architect, etc.)
  | 'scan'            // Scan-specific prompts
  | 'context'         // Context/feature documentation
  | 'analysis'        // Project analysis prompts
  | 'assistant'       // Voice/chat assistant prompts
  | 'blueprint'       // Blueprint/onboarding prompts
  | 'requirement'     // Claude Code requirement generation
  | 'general';        // General-purpose prompts

/**
 * Prompt output format specification
 */
export interface PromptOutputFormat {
  type: 'json' | 'markdown' | 'text';
  schema?: Record<string, unknown>;
  example?: string;
  description?: string;  // Human-readable description of the output format
}

/**
 * LLM configuration for a prompt
 */
export interface PromptLLMConfig {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

/**
 * Variable definition with metadata
 */
export interface PromptVariable {
  name: string;
  description: string;
  required: boolean;
  defaultValue?: string;
  example?: string;
}

/**
 * Version metadata for tracking prompt evolution
 */
export interface PromptVersion {
  version: string;        // Semantic version: "1.0.0"
  createdAt: string;      // ISO date string
  updatedAt: string;      // ISO date string
  changelog?: string;     // Description of changes
  author?: string;        // Who made the change
}

/**
 * Base template that can be extended by agent-specific prompts
 */
export interface BaseTemplate {
  id: string;
  name: string;
  description: string;
  systemPrompt?: string;
  userPromptTemplate: string;
  variables: PromptVariable[];
  outputFormat: PromptOutputFormat;
  llmConfig: PromptLLMConfig;
}

/**
 * Agent-specific additions to a base template
 */
export interface AgentAdditions {
  agentId: string;
  agentName: string;
  emoji: string;
  roleDescription: string;
  expertiseAreas: string[];
  focusAreas: string[];
  analysisGuidelines: string[];
  qualityStandards: string[];
  doInstructions: string[];
  dontInstructions: string[];
  contextSpecificInstructions?: string;
  expectedOutputDescription: string;
  categories: string[];
}

/**
 * Complete prompt definition with composition support
 */
export interface PromptDefinition {
  // Identification
  id: string;
  name: string;
  description: string;
  category: PromptCategory;

  // Version tracking
  version: PromptVersion;

  // Content - userPromptTemplate is optional when using baseTemplateId + agentAdditions
  systemPrompt?: string;
  userPromptTemplate?: string;

  // Composition
  baseTemplateId?: string;      // ID of base template to extend
  agentAdditions?: AgentAdditions;

  // Configuration
  variables: PromptVariable[];
  outputFormat: PromptOutputFormat;
  llmConfig: PromptLLMConfig;

  // Metadata
  tags?: string[];
  relatedPrompts?: string[];
  scanType?: ScanType;          // For agent prompts linked to scan types
}

/**
 * Registered prompt entry with runtime metadata
 */
export interface RegisteredPrompt extends PromptDefinition {
  registeredAt: Date;
  usageCount: number;
  lastUsed?: Date;
}

/**
 * Result of building a prompt from a definition
 */
export interface BuiltPrompt {
  id: string;
  systemPrompt?: string;
  userPrompt: string;
  fullPrompt: string;
  outputFormat: PromptOutputFormat;
  llmConfig: PromptLLMConfig;
  version: string;
  builtAt: Date;
}

/**
 * Options for building a prompt
 */
export interface PromptBuildOptions {
  values: Record<string, string | number | boolean | undefined>;
  includeVersion?: boolean;
  formatOutput?: boolean;
}

/**
 * Query options for finding prompts
 */
export interface PromptQueryOptions {
  category?: PromptCategory;
  scanType?: ScanType;
  tags?: string[];
  search?: string;
}

/**
 * Prompt statistics
 */
export interface PromptStats {
  totalPrompts: number;
  byCategory: Record<PromptCategory, number>;
  byScanType: Record<string, number>;
  mostUsed: { id: string; count: number }[];
  recentlyUpdated: { id: string; updatedAt: string }[];
}
