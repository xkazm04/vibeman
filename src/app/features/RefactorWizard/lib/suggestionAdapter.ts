/**
 * Suggestion Adapter
 *
 * Transforms RefactorSuggestion data from the RefactorSuggestion module
 * into RefactorOpportunity format for use in RefactorWizard.
 *
 * This adapter enables loose coupling between the two modules while
 * allowing suggestions to be merged with scan results.
 */

import type { RefactorOpportunity } from '@/stores/refactorStore';
import type { RefactorSuggestion } from '@/app/features/RefactorSuggestion';

/**
 * Category mapping from RefactorSuggestion categories to RefactorOpportunity categories
 */
const CATEGORY_MAP: Record<RefactorSuggestion['category'], RefactorOpportunity['category']> = {
  'anti-pattern': 'code-quality',
  'duplication': 'duplication',
  'coupling': 'architecture',
  'complexity': 'maintainability',
  'clean-code': 'code-quality',
};

/**
 * Estimate time based on effort level
 */
function estimateTime(effort: RefactorSuggestion['effort']): string {
  const times: Record<RefactorSuggestion['effort'], string> = {
    low: '15-30 min',
    medium: '1-2 hours',
    high: '2-4 hours',
  };
  return times[effort] || '1 hour';
}

/**
 * Convert a RefactorSuggestion to RefactorOpportunity format.
 *
 * Preserves id, title, description, severity, and files fields exactly.
 * Transforms category using the mapping and generates impact string
 * that includes the clean architecture principle.
 *
 * @param suggestion - The RefactorSuggestion to convert
 * @returns A RefactorOpportunity with equivalent data
 */
export function convertSuggestionToOpportunity(
  suggestion: RefactorSuggestion
): RefactorOpportunity {
  return {
    // Direct mappings - preserved exactly
    id: suggestion.id,
    title: suggestion.title,
    description: suggestion.description,
    severity: suggestion.severity,
    files: suggestion.files,
    lineNumbers: suggestion.lineNumbers,
    suggestedFix: suggestion.suggestedFix,
    autoFixAvailable: suggestion.autoFixAvailable,

    // Transformed mappings
    category: CATEGORY_MAP[suggestion.category] || 'code-quality',
    effort: suggestion.effort,
    impact: suggestion.cleanArchitecturePrinciple
      ? `${suggestion.impact} - ${suggestion.cleanArchitecturePrinciple}`
      : suggestion.impact,
    estimatedTime: estimateTime(suggestion.effort),
  };
}

/**
 * Merge suggestions with existing opportunities, removing duplicates.
 *
 * Deduplication is based on the opportunity ID. If an opportunity with
 * the same ID exists in both arrays, the existing opportunity takes precedence.
 *
 * @param suggestions - Converted suggestions as RefactorOpportunity[]
 * @param opportunities - Existing opportunities from scan results
 * @returns Merged array with all unique opportunities
 */
export function mergeSuggestionsWithOpportunities(
  suggestions: RefactorOpportunity[],
  opportunities: RefactorOpportunity[]
): RefactorOpportunity[] {
  // Create a Set of existing opportunity IDs for O(1) lookup
  const existingIds = new Set(opportunities.map(o => o.id));

  // Filter out suggestions that already exist in opportunities
  const uniqueSuggestions = suggestions.filter(s => !existingIds.has(s.id));

  // Return merged array: existing opportunities first, then unique suggestions
  return [...opportunities, ...uniqueSuggestions];
}

/**
 * Extract clean architecture metadata from a suggestion for requirement generation.
 *
 * @param suggestion - The RefactorSuggestion to extract metadata from
 * @returns Object containing the principle and refactor steps
 */
export function extractCleanArchitectureMetadata(
  suggestion: RefactorSuggestion
): { principle: string; steps: string[] } {
  return {
    principle: suggestion.cleanArchitecturePrinciple || '',
    steps: suggestion.refactorSteps || [],
  };
}

/**
 * Convert multiple suggestions to opportunities in batch.
 *
 * @param suggestions - Array of RefactorSuggestion to convert
 * @returns Array of RefactorOpportunity
 */
export function convertSuggestionsToOpportunities(
  suggestions: RefactorSuggestion[]
): RefactorOpportunity[] {
  return suggestions.map(convertSuggestionToOpportunity);
}
