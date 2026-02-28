/**
 * Agent Definitions Index
 *
 * Exports all agent-specific prompt configurations.
 * Each agent extends the base idea generation template with
 * specialized focus areas, guidelines, and instructions.
 */

export * from './bug-hunter';
export * from './zen-architect';
export * from './perf-optimizer';
export * from './security-protector';
export * from './insight-synth';
export * from './ambiguity-guardian';
export * from './business-visionary';
export * from './ui-perfectionist';
export * from './feature-scout';
export * from './tech-innovator';
export * from './ai-integration-scout';
export * from './delight-designer';
export * from './user-empathy-champion';
export * from './accessibility-advocate';
export * from './paradigm-shifter';
export * from './moonshot-architect';
export * from './dev-experience-engineer';
export * from './data-flow-optimizer';
export * from './code-refactor';
export * from './pragmatic-integrator';

// Re-export all agent prompts as an array
import { BUG_HUNTER_PROMPT } from './bug-hunter';
import { ZEN_ARCHITECT_PROMPT } from './zen-architect';
import { PERF_OPTIMIZER_PROMPT } from './perf-optimizer';
import { SECURITY_PROTECTOR_PROMPT } from './security-protector';
import { INSIGHT_SYNTH_PROMPT } from './insight-synth';
import { AMBIGUITY_GUARDIAN_PROMPT } from './ambiguity-guardian';
import { BUSINESS_VISIONARY_PROMPT } from './business-visionary';
import { UI_PERFECTIONIST_PROMPT } from './ui-perfectionist';
import { FEATURE_SCOUT_PROMPT } from './feature-scout';
import { TECH_INNOVATOR_PROMPT } from './tech-innovator';
import { AI_INTEGRATION_SCOUT_PROMPT } from './ai-integration-scout';
import { DELIGHT_DESIGNER_PROMPT } from './delight-designer';
import { USER_EMPATHY_CHAMPION_PROMPT } from './user-empathy-champion';
import { ACCESSIBILITY_ADVOCATE_PROMPT } from './accessibility-advocate';
import { PARADIGM_SHIFTER_PROMPT } from './paradigm-shifter';
import { MOONSHOT_ARCHITECT_PROMPT } from './moonshot-architect';
import { DEV_EXPERIENCE_ENGINEER_PROMPT } from './dev-experience-engineer';
import { DATA_FLOW_OPTIMIZER_PROMPT } from './data-flow-optimizer';
import { CODE_REFACTOR_PROMPT } from './code-refactor';
import { PRAGMATIC_INTEGRATOR_PROMPT } from './pragmatic-integrator';

import { PromptDefinition } from '../types';

/**
 * All agent prompts for bulk registration
 */
export const ALL_AGENT_PROMPTS: PromptDefinition[] = [
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
  ACCESSIBILITY_ADVOCATE_PROMPT,
  PARADIGM_SHIFTER_PROMPT,
  MOONSHOT_ARCHITECT_PROMPT,
  DEV_EXPERIENCE_ENGINEER_PROMPT,
  DATA_FLOW_OPTIMIZER_PROMPT,
  CODE_REFACTOR_PROMPT,
  PRAGMATIC_INTEGRATOR_PROMPT,
];
