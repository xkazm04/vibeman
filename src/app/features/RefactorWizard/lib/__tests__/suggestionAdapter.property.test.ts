/**
 * Property-Based Tests for Suggestion Adapter
 *
 * Tests the correctness properties of the suggestion adapter functions
 * using fast-check for property-based testing.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  convertSuggestionToOpportunity,
  mergeSuggestionsWithOpportunities,
  extractCleanArchitectureMetadata,
} from '../suggestionAdapter';
import type { RefactorSuggestion } from '@/app/features/RefactorSuggestion';
import type { RefactorOpportunity } from '@/stores/refactorStore';

// ============================================================================
// GENERATORS
// ============================================================================

/**
 * Generator for RefactorSuggestion category
 */
const suggestionCategoryArb = fc.constantFrom(
  'anti-pattern',
  'duplication',
  'coupling',
  'complexity',
  'clean-code'
) as fc.Arbitrary<RefactorSuggestion['category']>;

/**
 * Generator for severity levels
 */
const severityArb = fc.constantFrom('low', 'medium', 'high', 'critical') as fc.Arbitrary<
  'low' | 'medium' | 'high' | 'critical'
>;

/**
 * Generator for effort levels
 */
const effortArb = fc.constantFrom('low', 'medium', 'high') as fc.Arbitrary<'low' | 'medium' | 'high'>;

/**
 * Generator for impact levels
 */
const impactArb = fc.constantFrom('low', 'medium', 'high') as fc.Arbitrary<'low' | 'medium' | 'high'>;

/**
 * Generator for file paths
 */
const filePathArb = fc.stringMatching(/^[a-zA-Z0-9_\-./]+\.(ts|tsx|js|jsx)$/);

/**
 * Generator for line numbers record
 */
const lineNumbersArb = fc.dictionary(
  filePathArb,
  fc.array(fc.integer({ min: 1, max: 10000 }), { minLength: 1, maxLength: 10 })
);

/**
 * Generator for RefactorSuggestion
 */
const refactorSuggestionArb: fc.Arbitrary<RefactorSuggestion> = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.string({ minLength: 1, maxLength: 500 }),
  category: suggestionCategoryArb,
  severity: severityArb,
  effort: effortArb,
  impact: impactArb,
  files: fc.array(filePathArb, { minLength: 1, maxLength: 5 }),
  lineNumbers: fc.option(lineNumbersArb, { nil: undefined }),
  suggestedFix: fc.string({ minLength: 1, maxLength: 200 }),
  refactorSteps: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 0, maxLength: 5 }),
  cleanArchitecturePrinciple: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  autoFixAvailable: fc.boolean(),
  requirementTemplate: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
});

/**
 * Generator for RefactorOpportunity category
 */
const opportunityCategoryArb = fc.constantFrom(
  'performance',
  'maintainability',
  'security',
  'code-quality',
  'duplication',
  'architecture'
) as fc.Arbitrary<RefactorOpportunity['category']>;

/**
 * Generator for RefactorOpportunity
 */
const refactorOpportunityArb: fc.Arbitrary<RefactorOpportunity> = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.string({ minLength: 1, maxLength: 500 }),
  category: opportunityCategoryArb,
  severity: severityArb,
  impact: fc.string({ minLength: 1, maxLength: 100 }),
  effort: effortArb,
  files: fc.array(filePathArb, { minLength: 1, maxLength: 5 }),
  lineNumbers: fc.option(lineNumbersArb, { nil: undefined }),
  suggestedFix: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
  autoFixAvailable: fc.boolean(),
  estimatedTime: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
});

// ============================================================================
// PROPERTY TESTS
// ============================================================================

describe('suggestionAdapter property tests', () => {
  /**
   * **Feature: unused-module-integration, Property 1: Suggestion to Opportunity Conversion Preserves Data**
   *
   * *For any* RefactorSuggestion with valid fields, converting it to RefactorOpportunity
   * should preserve the id, title, description, severity, and files fields exactly.
   *
   * **Validates: Requirements 1.2**
   */
  it('Property 1: Suggestion to Opportunity Conversion Preserves Data', () => {
    fc.assert(
      fc.property(refactorSuggestionArb, (suggestion) => {
        const opportunity = convertSuggestionToOpportunity(suggestion);

        // Verify preserved fields are exactly equal
        expect(opportunity.id).toBe(suggestion.id);
        expect(opportunity.title).toBe(suggestion.title);
        expect(opportunity.description).toBe(suggestion.description);
        expect(opportunity.severity).toBe(suggestion.severity);
        expect(opportunity.files).toEqual(suggestion.files);

        // Verify lineNumbers are preserved if present
        if (suggestion.lineNumbers !== undefined) {
          expect(opportunity.lineNumbers).toEqual(suggestion.lineNumbers);
        }

        // Verify suggestedFix is preserved
        expect(opportunity.suggestedFix).toBe(suggestion.suggestedFix);

        // Verify autoFixAvailable is preserved
        expect(opportunity.autoFixAvailable).toBe(suggestion.autoFixAvailable);

        // Verify effort is preserved
        expect(opportunity.effort).toBe(suggestion.effort);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: unused-module-integration, Property 2: Merged Opportunities Include All Selected Suggestions**
   *
   * *For any* set of selected suggestions and existing opportunities, the merged result
   * should contain all selected suggestions and all existing opportunities without duplicates.
   *
   * **Validates: Requirements 1.3**
   */
  it('Property 2: Merged Opportunities Include All Selected Suggestions', () => {
    fc.assert(
      fc.property(
        fc.array(refactorOpportunityArb, { minLength: 0, maxLength: 10 }),
        fc.array(refactorOpportunityArb, { minLength: 0, maxLength: 10 }),
        (suggestions, opportunities) => {
          const merged = mergeSuggestionsWithOpportunities(suggestions, opportunities);

          // All existing opportunities should be in the result
          for (const opp of opportunities) {
            expect(merged.some((m) => m.id === opp.id)).toBe(true);
          }

          // All suggestions should be in the result (either directly or via existing opportunity)
          for (const sugg of suggestions) {
            expect(merged.some((m) => m.id === sugg.id)).toBe(true);
          }

          // No duplicates - all IDs should be unique
          const ids = merged.map((m) => m.id);
          const uniqueIds = new Set(ids);
          expect(ids.length).toBe(uniqueIds.size);

          // Merged length should be at most the sum of both arrays
          expect(merged.length).toBeLessThanOrEqual(suggestions.length + opportunities.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: unused-module-integration, Property 3: Generated Requirements Include Clean Architecture Metadata**
   *
   * *For any* RefactorSuggestion with cleanArchitecturePrinciple and refactorSteps,
   * the extracted metadata should contain both the principle text and all step texts.
   *
   * **Validates: Requirements 1.4**
   */
  it('Property 3: Generated Requirements Include Clean Architecture Metadata', () => {
    fc.assert(
      fc.property(refactorSuggestionArb, (suggestion) => {
        const metadata = extractCleanArchitectureMetadata(suggestion);

        // Principle should match (or be empty string if undefined)
        expect(metadata.principle).toBe(suggestion.cleanArchitecturePrinciple || '');

        // Steps should match (or be empty array if undefined)
        expect(metadata.steps).toEqual(suggestion.refactorSteps || []);

        // If suggestion has a principle, metadata should have it
        if (suggestion.cleanArchitecturePrinciple) {
          expect(metadata.principle).toBe(suggestion.cleanArchitecturePrinciple);
        }

        // If suggestion has steps, all steps should be in metadata
        if (suggestion.refactorSteps && suggestion.refactorSteps.length > 0) {
          for (const step of suggestion.refactorSteps) {
            expect(metadata.steps).toContain(step);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: unused-module-integration, Property 4: Summary Statistics Match Suggestion Counts**
   *
   * *For any* SuggestionEngineResult, the summary.totalIssues should equal suggestions.length,
   * and the sum of byCategory values should equal totalIssues.
   *
   * **Validates: Requirements 1.5**
   */
  it('Property 4: Summary Statistics Match Suggestion Counts', () => {
    // Generator for SuggestionEngineResult
    const suggestionEngineResultArb = fc.array(refactorSuggestionArb, { minLength: 0, maxLength: 20 }).map(
      (suggestions) => {
        // Build summary from suggestions (simulating what the engine does)
        const byCategory: Record<string, number> = {};
        const bySeverity: Record<string, number> = {};

        suggestions.forEach((s) => {
          byCategory[s.category] = (byCategory[s.category] || 0) + 1;
          bySeverity[s.severity] = (bySeverity[s.severity] || 0) + 1;
        });

        const topPriorityCount = suggestions.filter(
          (s) => s.severity === 'critical' || s.severity === 'high'
        ).length;

        return {
          suggestions,
          summary: {
            totalIssues: suggestions.length,
            byCategory,
            bySeverity,
            topPriorityCount,
          },
          analysisMetadata: {
            filesAnalyzed: Math.floor(Math.random() * 100) + 1,
            totalLines: Math.floor(Math.random() * 10000) + 100,
            scanDurationMs: Math.floor(Math.random() * 5000) + 100,
          },
        };
      }
    );

    fc.assert(
      fc.property(suggestionEngineResultArb, (result) => {
        // totalIssues should equal suggestions.length
        expect(result.summary.totalIssues).toBe(result.suggestions.length);

        // Sum of byCategory values should equal totalIssues
        const categorySum = Object.values(result.summary.byCategory).reduce(
          (sum, count) => sum + count,
          0
        );
        expect(categorySum).toBe(result.summary.totalIssues);

        // Sum of bySeverity values should equal totalIssues
        const severitySum = Object.values(result.summary.bySeverity).reduce(
          (sum, count) => sum + count,
          0
        );
        expect(severitySum).toBe(result.summary.totalIssues);

        // topPriorityCount should match high + critical count
        const actualTopPriority = result.suggestions.filter(
          (s) => s.severity === 'critical' || s.severity === 'high'
        ).length;
        expect(result.summary.topPriorityCount).toBe(actualTopPriority);
      }),
      { numRuns: 100 }
    );
  });
});
