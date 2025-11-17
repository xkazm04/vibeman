/**
 * Prompts for Unused Code Scan
 *
 * This module exports prompt generators for different unused code scan actions.
 */

export { generateCleanupPrompt } from './unusedCleanup';
export { generateIntegrationPrompt } from './unusedIntegration';

export type { UnusedFile, CleanupPromptOptions } from './unusedCleanup';
export type { IntegrationPromptOptions } from './unusedIntegration';
