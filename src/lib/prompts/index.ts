/**
 * Centralized Prompt System
 *
 * This module provides a unified interface for all AI prompts in the application.
 * Import from this file to use standardized prompts.
 *
 * NEW: The PromptRegistry provides:
 * - Type-safe prompt registration and retrieval
 * - Prompt composition with base templates + agent additions
 * - Version tracking and metadata
 * - Variable substitution with validation
 */

// Types
export * from './types';

// Templates (legacy - use registry for new code)
export * from './templates';

// Builder utilities (legacy - use registry for new code)
export * from './builder';

// Re-export main functions for convenience (legacy)
export { buildPrompt, buildSections, SectionBuilders, promptTemplate } from './builder';
export { getPromptTemplate, listPromptTemplates } from './templates';

// NEW: Centralized Prompt Registry
export * from './registry';
export {
  PromptRegistry,
  buildPromptById,
  buildPromptByScanType,
  getRegisteredPromptIds,
  getPromptStats,
  initializePromptRegistry,
} from './registry';

// Named prompt constants for type safety
export {
  // Agent prompts
  BUG_HUNTER_PROMPT,
  ZEN_ARCHITECT_PROMPT,
  PERF_OPTIMIZER_PROMPT,
  SECURITY_PROTECTOR_PROMPT,
  INSIGHT_SYNTH_PROMPT,
  AMBIGUITY_GUARDIAN_PROMPT,
  BUSINESS_VISIONARY_PROMPT,
  UI_PERFECTIONIST_PROMPT,
  FEATURE_SCOUT_PROMPT,
  TECH_INNOVATOR_PROMPT,
  AI_INTEGRATION_SCOUT_PROMPT,
  DELIGHT_DESIGNER_PROMPT,
  USER_EMPATHY_CHAMPION_PROMPT,
  PARADIGM_SHIFTER_PROMPT,
  MOONSHOT_ARCHITECT_PROMPT,
  DEV_EXPERIENCE_ENGINEER_PROMPT,
  DATA_FLOW_OPTIMIZER_PROMPT,
  CODE_REFACTOR_PROMPT,
  PRAGMATIC_INTEGRATOR_PROMPT,
  ALL_AGENT_PROMPTS,
  // Base templates
  IDEA_GENERATION_BASE,
  CONTEXT_ANALYSIS_BASE,
  ASSISTANT_BASE,
  REQUIREMENT_BASE,
  BASE_TEMPLATES,
} from './registry';
