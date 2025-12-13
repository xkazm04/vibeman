/**
 * Centralized Prompt Registry
 *
 * This module provides a unified interface for all AI prompts in the application.
 * Features:
 * - Type-safe prompt registration and retrieval
 * - Prompt composition with base templates + agent additions
 * - Version tracking and metadata
 * - Variable substitution with validation
 */

// Core types
export * from './types';

// Registry class
export { PromptRegistry, PromptRegistryClass } from './PromptRegistry';

// Base templates
export { BASE_TEMPLATES, IDEA_GENERATION_BASE, CONTEXT_ANALYSIS_BASE, ASSISTANT_BASE, REQUIREMENT_BASE } from './base-templates';

// Agent prompts
export { ALL_AGENT_PROMPTS } from './agents';
export * from './agents';

// Initialize the registry with all prompts
import { PromptRegistry } from './PromptRegistry';
import { BASE_TEMPLATES } from './base-templates';
import { ALL_AGENT_PROMPTS } from './agents';

/**
 * Initialize the prompt registry with all base templates and agent prompts
 */
export function initializePromptRegistry(): void {
  // Register base templates
  for (const template of BASE_TEMPLATES) {
    PromptRegistry.registerBaseTemplate(template);
  }

  // Register all agent prompts
  PromptRegistry.registerAll(ALL_AGENT_PROMPTS);
}

// Auto-initialize on import
initializePromptRegistry();

/**
 * Convenience function to build a prompt by ID
 */
export function buildPromptById(
  id: string,
  values: Record<string, string | number | boolean | undefined>
) {
  return PromptRegistry.build(id, { values });
}

/**
 * Convenience function to build a prompt by scan type
 */
export function buildPromptByScanType(
  scanType: import('./types').ScanType,
  values: Record<string, string | number | boolean | undefined>
) {
  return PromptRegistry.buildByScanType(scanType, { values });
}

/**
 * Get all registered prompt IDs
 */
export function getRegisteredPromptIds(): string[] {
  return PromptRegistry.listIds();
}

/**
 * Get prompt statistics
 */
export function getPromptStats() {
  return PromptRegistry.getStats();
}
