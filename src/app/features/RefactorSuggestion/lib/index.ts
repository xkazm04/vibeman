/**
 * Refactor Suggestion Engine
 * Exports for the AI-powered refactor suggestion module
 *
 * NOTE: ideaGenerator is NOT exported here because it uses server-only
 * imports (database). Import directly from './ideaGenerator' in
 * server-side code (API routes) only.
 */

export {
  analyzeForRefactorSuggestions,
  convertToOpportunities,
  type RefactorSuggestion,
  type SuggestionEngineResult,
  type SuggestionEngineConfig,
} from './refactorSuggestionEngine';
