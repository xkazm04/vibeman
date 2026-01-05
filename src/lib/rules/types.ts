/**
 * Rule System Types
 * Defines the structure for modular execution rules
 */

import type { ExecutionWrapperConfig } from '@/lib/prompts/requirement_file';

/**
 * Rule categories for organization
 */
export type RuleCategory =
  | 'implementation'  // Core implementation guidelines
  | 'structure'       // File/folder structure
  | 'testing'         // Test selectors, scenarios
  | 'styling'         // Theming, UI consistency
  | 'documentation'   // Doc policy, logging
  | 'operations'      // Git, screenshots, deploy
  | 'checklist';      // Final verification

/**
 * Rule priority levels
 */
export type RulePriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Variable definition for template substitution
 */
export interface RuleVariable {
  /** Variable name for reference */
  name: string;
  /** Placeholder in content (e.g., {{projectId}}) */
  placeholder: string;
  /** Key to extract value from ExecutionWrapperConfig */
  configKey: keyof ExecutionWrapperConfig | string;
  /** Default value if config key is not present */
  defaultValue?: string;
}

/**
 * Rule definition interface
 * Each rule represents a section of the execution prompt
 */
export interface RuleDefinition {
  /** Unique identifier (e.g., 'core-guidelines', 'git-operations') */
  id: string;
  /** Display name */
  name: string;
  /** Brief description of what this rule covers */
  description: string;
  /** Category for organization */
  category: RuleCategory;
  /** Priority level */
  priority: RulePriority;
  /** Markdown content template (may contain {{variable}} placeholders) */
  content: string;
  /** If true, rule is always included regardless of config */
  alwaysInclude: boolean;
  /** Condition function - rule included only if this returns true */
  condition?: (config: ExecutionWrapperConfig) => boolean;
  /** Variables for template substitution */
  variables?: RuleVariable[];
  /** Order in the final prompt (lower = earlier) */
  order: number;
}

/**
 * Result of building rules for a specific config
 */
export interface BuiltRules {
  /** Rendered rule sections (variable-substituted) */
  sections: string[];
  /** Full content joined with newlines */
  fullContent: string;
  /** IDs of rules that were included */
  includedRuleIds: string[];
  /** IDs of rules that were excluded (condition failed) */
  excludedRuleIds: string[];
}

/**
 * Re-export ExecutionWrapperConfig for convenience
 */
export type { ExecutionWrapperConfig };
