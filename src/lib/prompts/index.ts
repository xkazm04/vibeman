/**
 * Centralized Prompt System
 *
 * This module provides a unified interface for all AI prompts in the application.
 * Import from this file to use standardized prompts.
 */

// Types
export * from './types';

// Templates
export * from './templates';

// Builder utilities
export * from './builder';

// Re-export main functions for convenience
export { buildPrompt, buildSections, SectionBuilders } from './builder';
export { getPromptTemplate, listPromptTemplates } from './templates';
