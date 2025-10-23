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
import { ScanType } from '@/app/ideas/lib/ScanTypeConfig';

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
  overall: buildOverallPrompt,
  zen_architect: buildZenArchitectPrompt,
  bug_hunter: buildBugHunterPrompt,
  perf_optimizer: buildPerfOptimizerPrompt,
  security_protector: buildSecurityProtectorPrompt,
  insight_synth: buildInsightSynthPrompt,
  ambiguity_guardian: buildAmbiguityGuardianPrompt,
};

/**
 * Get the appropriate prompt builder for a scan type
 */
export function getPromptBuilder(scanType: ScanType): PromptBuilder {
  return PROMPT_BUILDERS[scanType] || PROMPT_BUILDERS.overall;
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
};
