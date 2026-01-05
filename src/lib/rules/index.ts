/**
 * Modular Rules System
 * Provides execution rules for Claude Code prompts
 */

// Export types
export * from './types';

// Export loader
export { rulesLoader, RulesLoader } from './loader';

// Import all rule definitions
import { coreGuidelinesRule } from './definitions/core-guidelines';
import { fileStructureRule } from './definitions/file-structure';
import { testSelectorsRule } from './definitions/test-selectors';
import { themingRule } from './definitions/theming';
import { documentationPolicyRule } from './definitions/documentation-policy';
import { implementationLoggingRule } from './definitions/implementation-logging';
import { screenshotCaptureRule } from './definitions/screenshot-capture';
import { gitOperationsRule } from './definitions/git-operations';
import { finalChecklistRule, buildFinalChecklistContent } from './definitions/final-checklist';

// Export individual rules for direct access
export {
  coreGuidelinesRule,
  fileStructureRule,
  testSelectorsRule,
  themingRule,
  documentationPolicyRule,
  implementationLoggingRule,
  screenshotCaptureRule,
  gitOperationsRule,
  finalChecklistRule,
  buildFinalChecklistContent,
};

// Import the loader for registration
import { rulesLoader } from './loader';

/**
 * All default rules in order
 */
export const defaultRules = [
  coreGuidelinesRule,
  fileStructureRule,
  testSelectorsRule,
  themingRule,
  documentationPolicyRule,
  implementationLoggingRule,
  screenshotCaptureRule,
  gitOperationsRule,
  finalChecklistRule,
];

/**
 * Register all default rules
 * This is called automatically when the module is imported
 */
function registerDefaultRules(): void {
  rulesLoader.registerAll(defaultRules);
}

// Auto-register default rules on module load
registerDefaultRules();
