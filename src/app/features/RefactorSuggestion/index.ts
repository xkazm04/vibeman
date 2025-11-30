/**
 * AI-Powered Refactor Suggestion Engine
 *
 * This module provides automatic code analysis and refactoring suggestions.
 * When developers add new features or ideas, the engine scans the codebase
 * for anti-patterns, duplicated logic, or overly coupled components.
 *
 * Key Features:
 * - Anti-pattern detection (god functions, any types, console statements)
 * - Code duplication analysis (within and across files)
 * - Coupling analysis (excessive imports, unused imports)
 * - Complexity analysis (cyclomatic complexity, deep nesting)
 * - Clean code checks (magic numbers, oversized files)
 *
 * Integration with Vibeman:
 * - Automatically triggers after idea implementations
 * - Generates new refactoring ideas for the automation queue
 * - Ensures each module adheres to clean architecture principles
 *
 * NOTE: ideaGenerator functions are NOT exported here because they use
 * server-only imports (database). Import them directly from
 * './lib/ideaGenerator' in server-side code (API routes) only.
 */

// Core library exports (client-safe)
export {
  analyzeForRefactorSuggestions,
  convertToOpportunities,
  type RefactorSuggestion,
  type SuggestionEngineResult,
  type SuggestionEngineConfig,
} from './lib/refactorSuggestionEngine';

// Component exports
export {
  RefactorSuggestionPanel,
  RefactorSuggestionWidget,
  SuggestionDetailModal,
} from './components';
