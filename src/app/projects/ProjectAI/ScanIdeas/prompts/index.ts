/**
 * Prompt Builder Index
 * Central export for all scan type prompts
 */

import { buildOverallPrompt } from './overallPrompt';
import { buildZenArchitectPrompt } from './zenArchitectPrompt';
import { buildBugHunterPrompt } from './bugHunterPrompt';
import { buildPerfOptimizerPrompt } from './perfOptimizerPrompt';
import { buildSecurityProtectorPrompt } from './securityProtectorPrompt';
import { buildInsightSynthPrompt } from './insightSynthPrompt';
import { buildAmbiguityGuardianPrompt } from './ambiguityGuardianPrompt';
import { buildBusinessVisionaryPrompt } from './businessVisionaryPrompt';
import { buildUiPerfectionistPrompt } from './uiPerfectionistPrompt';
import { buildFeatureScoutPrompt } from './featureScoutPrompt';
import { buildOnboardingOptimizerPrompt } from './onboardingOptimizerPrompt';
import { buildAiIntegrationScoutPrompt } from './aiIntegrationScoutPrompt';
import { buildDelightDesignerPrompt } from './delightDesignerPrompt';
// People's Choice - User First Approach
import { buildUserEmpathyChampionPrompt } from './userEmpathyChampionPrompt';
import { buildAccessibilityAdvocatePrompt } from './accessibilityAdvocatePrompt';
// Mastermind - Ambitious Opportunities
import { buildParadigmShifterPrompt } from './paradigmShifterPrompt';
import { buildMoonshotArchitectPrompt } from './moonshotArchitectPrompt';
// Gap Coverage
import { buildDevExperienceEngineerPrompt } from './devExperienceEngineerPrompt';
import { buildDataFlowOptimizerPrompt } from './dataFlowOptimizerPrompt';
// Code Cleanup
import { buildCodeRefactorPrompt } from './codeRefactorPrompt';
import { buildPragmaticIntegratorPrompt } from './pragmaticIntegratorPrompt';

import { ScanType } from '@/app/features/Ideas/lib/scanTypes';

export interface PromptOptions {
  projectName: string;
  aiDocsSection: string;
  contextSection: string;
  existingIdeasSection: string;
  codeSection: string;
  hasContext: boolean;
}

export type PromptBuilder = (options: PromptOptions) => string;

/**
 * Map of scan types to their prompt builders
 */
export const PROMPT_BUILDERS: Partial<Record<ScanType, PromptBuilder>> = {
  // Original scan types
  zen_architect: buildZenArchitectPrompt,
  bug_hunter: buildBugHunterPrompt,
  perf_optimizer: buildPerfOptimizerPrompt,
  security_protector: buildSecurityProtectorPrompt,
  insight_synth: buildInsightSynthPrompt,
  ambiguity_guardian: buildAmbiguityGuardianPrompt,
  business_visionary: buildBusinessVisionaryPrompt,
  ui_perfectionist: buildUiPerfectionistPrompt,
  feature_scout: buildFeatureScoutPrompt,
  onboarding_optimizer: buildOnboardingOptimizerPrompt,
  ai_integration_scout: buildAiIntegrationScoutPrompt,
  delight_designer: buildDelightDesignerPrompt,
  // People's Choice - User First Approach
  user_empathy_champion: buildUserEmpathyChampionPrompt,
  accessibility_advocate: buildAccessibilityAdvocatePrompt,
  // Mastermind - Ambitious Opportunities
  paradigm_shifter: buildParadigmShifterPrompt,
  moonshot_architect: buildMoonshotArchitectPrompt,
  // Gap Coverage
  dev_experience_engineer: buildDevExperienceEngineerPrompt,
  data_flow_optimizer: buildDataFlowOptimizerPrompt,
  // Code Cleanup
  code_refactor: buildCodeRefactorPrompt,
  pragmatic_integrator: buildPragmaticIntegratorPrompt,
};

/**
 * Get the appropriate prompt builder for a scan type
 */
export function getPromptBuilder(scanType: ScanType): PromptBuilder | undefined {
  return PROMPT_BUILDERS[scanType];
}

/**
 * Build a prompt for a given scan type
 * Falls back to zen_architect prompt if no specific builder exists
 */
export function buildPrompt(scanType: ScanType, options: PromptOptions): string {
  const builder = getPromptBuilder(scanType) ?? buildZenArchitectPrompt;
  return builder(options);
}

// Re-export individual builders
export {
  buildOverallPrompt,
  buildZenArchitectPrompt,
  buildBugHunterPrompt,
  buildPerfOptimizerPrompt,
  buildSecurityProtectorPrompt,
  buildInsightSynthPrompt,
  buildAmbiguityGuardianPrompt,
  buildBusinessVisionaryPrompt,
  buildUiPerfectionistPrompt,
  buildFeatureScoutPrompt,
  buildOnboardingOptimizerPrompt,
  buildAiIntegrationScoutPrompt,
  buildDelightDesignerPrompt,
  // People's Choice
  buildUserEmpathyChampionPrompt,
  buildAccessibilityAdvocatePrompt,
  // Mastermind
  buildParadigmShifterPrompt,
  buildMoonshotArchitectPrompt,
  // Gap Coverage
  buildDevExperienceEngineerPrompt,
  buildDataFlowOptimizerPrompt,
  // Code Cleanup
  buildCodeRefactorPrompt,
  buildPragmaticIntegratorPrompt,
};
