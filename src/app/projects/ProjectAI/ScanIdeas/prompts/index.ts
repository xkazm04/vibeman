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
export const PROMPT_BUILDERS: Record<ScanType, PromptBuilder> = {
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
};

/**
 * Get the appropriate prompt builder for a scan type
 */
export function getPromptBuilder(scanType: ScanType): PromptBuilder {
  return PROMPT_BUILDERS[scanType];
}

/**
 * Build a prompt for a given scan type
 */
export function buildPrompt(scanType: ScanType, options: PromptOptions): string {
  const builder = getPromptBuilder(scanType);
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
};
