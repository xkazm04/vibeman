/**
 * Prompt Builder Facade
 * Re-exports prompt builders from individual files for backward compatibility
 * 
 * @deprecated Import from '../prompts/index' instead
 */

import { buildPrompt, PromptOptions, PROMPT_BUILDERS } from '../prompts';
import { ScanType } from '@/app/features/Ideas/sub_IdeasSetup/lib/ScanTypeConfig';

// Re-export for backward compatibility
export type { PromptOptions };
export { buildPrompt, PROMPT_BUILDERS };

/**
 * Main prompt builder interface
 * Delegates to specific prompt builders based on scan type
 */
export const IDEA_GENERATION_PROMPTS = {
  /**
   * Build the main prompt for a given scan type
   * @param scanType - The type of scan to perform
   * @param options - Prompt configuration options
   * @returns The complete prompt string
   */
  buildMainPrompt(scanType: ScanType, options: PromptOptions): string {
    return buildPrompt(scanType, options);
  },
};
