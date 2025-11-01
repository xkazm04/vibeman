/**
 * Centralized Prompt Template Types
 *
 * This file defines the type system for standardized AI prompts across the application.
 * All AI prompt configurations should use these types for consistency.
 */

/**
 * Supported task types for AI generation
 */
export type PromptTaskType =
  | 'high_level_docs'
  | 'strategic_goals'
  | 'idea_generation'
  | 'requirement_generation'
  | 'context_description'
  | 'context_documentation'
  | 'build_error_fix'
  | 'file_analysis'
  | 'advisor_ux'
  | 'advisor_security'
  | 'advisor_architect'
  | 'advisor_visionary'
  | 'advisor_chum';

/**
 * Prompt mode determines which template variant to use
 * @deprecated Use ScanType from @/app/features/Ideas/lib/scanTypes instead
 */
export type PromptMode = import('@/app/features/Ideas/lib/scanTypes').ScanType;

/**
 * LLM provider configuration
 */
export interface LLMConfig {
  /** Target temperature for response randomness (0.0 - 1.0) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Top-p nucleus sampling */
  topP?: number;
  /** Frequency penalty */
  frequencyPenalty?: number;
  /** Presence penalty */
  presencePenalty?: number;
}

/**
 * Placeholder for template string interpolation
 */
export interface PromptPlaceholder {
  /** Placeholder key (e.g., 'PROJECT_NAME') */
  key: string;
  /** Default value if not provided */
  defaultValue?: string;
  /** Whether this placeholder is required */
  required?: boolean;
}

/**
 * Output format specification
 */
export interface OutputFormat {
  /** Expected format type */
  type: 'json' | 'markdown' | 'text';
  /** JSON schema if type is 'json' */
  schema?: Record<string, any>;
  /** Format description for the LLM */
  description?: string;
  /** Example output */
  example?: string;
}

/**
 * Base prompt template configuration
 */
export interface PromptTemplate {
  /** Unique identifier for this template */
  id: string;
  /** Human-readable name */
  name: string;
  /** Task type this template is used for */
  taskType: PromptTaskType;
  /** Prompt mode (if applicable) */
  mode?: PromptMode;
  /** System prompt (for chat-based models) */
  systemPrompt?: string;
  /** User prompt template */
  userPrompt: string;
  /** Available placeholders in the template */
  placeholders: PromptPlaceholder[];
  /** Expected output format */
  outputFormat: OutputFormat;
  /** LLM configuration defaults */
  llmConfig: LLMConfig;
  /** Additional instructions or notes */
  instructions?: string[];
  /** Example usage */
  example?: {
    input: Record<string, any>;
    output: string;
  };
}

/**
 * Section builder function type
 * Takes input data and returns formatted section string
 */
export type SectionBuilder<T = any> = (data: T) => string;

/**
 * Prompt section definition
 */
export interface PromptSection {
  /** Section identifier */
  id: string;
  /** Section header/title */
  title?: string;
  /** Builder function to generate section content */
  builder: SectionBuilder;
  /** Whether this section is required */
  required?: boolean;
  /** Conditional rendering function */
  condition?: (context: any) => boolean;
}

/**
 * Complete prompt configuration with sections
 */
export interface PromptConfig extends PromptTemplate {
  /** Reusable sections for building the prompt */
  sections?: PromptSection[];
  /** Validation function for input data */
  validate?: (data: any) => { valid: boolean; errors?: string[] };
}

/**
 * Prompt registry entry
 */
export interface PromptRegistryEntry {
  /** Template configuration */
  template: PromptConfig;
  /** Version for tracking changes */
  version: string;
  /** Last updated timestamp */
  updatedAt: Date;
  /** Description of changes in this version */
  changelog?: string;
}

/**
 * Input data for building a prompt
 */
export interface PromptBuildInput {
  /** Values for placeholders */
  values: Record<string, any>;
  /** Optional section overrides */
  sectionData?: Record<string, any>;
  /** Additional context */
  context?: Record<string, any>;
}

/**
 * Result of building a prompt
 */
export interface PromptBuildResult {
  /** Compiled system prompt */
  systemPrompt?: string;
  /** Compiled user prompt */
  userPrompt: string;
  /** Full prompt (combined if needed) */
  fullPrompt: string;
  /** LLM configuration */
  llmConfig: LLMConfig;
  /** Output format specification */
  outputFormat: OutputFormat;
  /** Task type */
  taskType: PromptTaskType;
}

/**
 * Effort scale (1-3)
 */
export type EffortLevel = 1 | 2 | 3;

/**
 * Impact scale (1-3)
 */
export type ImpactLevel = 1 | 2 | 3;

/**
 * Idea category
 */
export type IdeaCategory =
  | 'ux_design'
  | 'code_quality'
  | 'performance'
  | 'security'
  | 'feature'
  | 'architecture'
  | 'accessibility'
  | 'testing'
  | 'documentation'
  | 'user_value';

/**
 * Goal type
 */
export type GoalType = 'Business' | 'Technical';

/**
 * Standard idea output format
 */
export interface IdeaOutput {
  category: IdeaCategory;
  title: string;
  description: string;
  reasoning: string;
  effort: EffortLevel;
  impact: ImpactLevel;
}

/**
 * Standard goal output format
 */
export interface GoalOutput {
  title: string;
  description: string[];
  type: GoalType;
  reason: string;
}

/**
 * Context description output format
 */
export interface ContextDescriptionOutput {
  description: string;
  fileStructure?: string;
}

/**
 * Advisor response format
 */
export interface AdvisorOutput {
  summary?: string;
  recommendations?: Array<{
    title: string;
    description: string;
    priority?: 'high' | 'medium' | 'low';
  }>;
  moonshot?: string;
  riskAssessment?: string;
  vulnerabilities?: Array<{
    type: string;
    severity: string;
    recommendation: string;
  }>;
  performanceOptimization?: string;
}
