/**
 * Property-Based Tests for Requirement Generator
 *
 * Tests the correctness properties of the requirement generator functions
 * using fast-check for property-based testing.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateRequirementContent } from '../requirementGenerator';

// ============================================================================
// GENERATORS
// ============================================================================

/**
 * Generator for category
 */
const categoryArb = fc.constantFrom(
  'performance',
  'maintainability',
  'security',
  'code-quality',
  'duplication',
  'architecture'
);

/**
 * Generator for severity levels
 */
const severityArb = fc.constantFrom('low', 'medium', 'high', 'critical');

/**
 * Generator for effort levels
 */
const effortArb = fc.constantFrom('low', 'medium', 'high');

/**
 * Generator for file paths
 */
const filePathArb = fc.stringMatching(/^[a-zA-Z0-9_\-./]+\.(ts|tsx|js|jsx)$/);

/**
 * Generator for non-empty alphanumeric strings (for principles and steps)
 */
const nonEmptyTextArb = fc.string({ minLength: 5, maxLength: 100 }).filter(s => s.trim().length > 0);

/**
 * Generator for Opportunity with clean architecture metadata
 */
const opportunityWithMetadataArb = fc.record({
  id: fc.uuid(),
  title: nonEmptyTextArb,
  description: nonEmptyTextArb,
  category: categoryArb,
  severity: severityArb,
  effort: effortArb,
  impact: nonEmptyTextArb,
  files: fc.array(filePathArb, { minLength: 1, maxLength: 3 }),
  lineNumbers: fc.option(
    fc.dictionary(
      filePathArb,
      fc.array(fc.integer({ min: 1, max: 1000 }), { minLength: 1, maxLength: 5 })
    ),
    { nil: undefined }
  ),
  suggestedFix: fc.option(nonEmptyTextArb, { nil: undefined }),
  estimatedTime: fc.option(fc.constantFrom('15-30 min', '1-2 hours', '2-4 hours'), { nil: undefined }),
  autoFixAvailable: fc.boolean(),
  cleanArchitecturePrinciple: fc.option(nonEmptyTextArb, { nil: undefined }),
  refactorSteps: fc.option(
    fc.array(nonEmptyTextArb, { minLength: 1, maxLength: 5 }),
    { nil: undefined }
  ),
});

/**
 * Generator for Opportunity that always has clean architecture metadata
 */
const opportunityWithRequiredMetadataArb = fc.record({
  id: fc.uuid(),
  title: nonEmptyTextArb,
  description: nonEmptyTextArb,
  category: categoryArb,
  severity: severityArb,
  effort: effortArb,
  impact: nonEmptyTextArb,
  files: fc.array(filePathArb, { minLength: 1, maxLength: 3 }),
  lineNumbers: fc.option(
    fc.dictionary(
      filePathArb,
      fc.array(fc.integer({ min: 1, max: 1000 }), { minLength: 1, maxLength: 5 })
    ),
    { nil: undefined }
  ),
  suggestedFix: fc.option(nonEmptyTextArb, { nil: undefined }),
  estimatedTime: fc.option(fc.constantFrom('15-30 min', '1-2 hours', '2-4 hours'), { nil: undefined }),
  autoFixAvailable: fc.boolean(),
  // Always present for this generator
  cleanArchitecturePrinciple: nonEmptyTextArb,
  refactorSteps: fc.array(nonEmptyTextArb, { minLength: 1, maxLength: 5 }),
});

// ============================================================================
// PROPERTY TESTS
// ============================================================================

describe('requirementGenerator property tests', () => {
  /**
   * **Feature: unused-module-integration, Property 3: Generated Requirements Include Clean Architecture Metadata**
   *
   * *For any* RefactorSuggestion with cleanArchitecturePrinciple and refactorSteps,
   * the generated requirement content should contain both the principle text and all step texts.
   *
   * **Validates: Requirements 1.4**
   */
  it('Property 3: Generated Requirements Include Clean Architecture Metadata', () => {
    fc.assert(
      fc.property(
        fc.array(opportunityWithRequiredMetadataArb, { minLength: 1, maxLength: 5 }),
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 10 }),
        nonEmptyTextArb,
        (opportunities, batchNum, totalBatches, projectName) => {
          const content = generateRequirementContent(
            opportunities,
            batchNum,
            Math.max(batchNum, totalBatches),
            projectName
          );

          // For each opportunity with clean architecture metadata
          for (const opp of opportunities) {
            // The principle should appear in the generated content
            if (opp.cleanArchitecturePrinciple) {
              expect(content).toContain(opp.cleanArchitecturePrinciple);
            }

            // All refactor steps should appear in the generated content
            if (opp.refactorSteps && opp.refactorSteps.length > 0) {
              for (const step of opp.refactorSteps) {
                expect(content).toContain(step);
              }
            }
          }

          // The content should contain the "Clean Architecture Principle" header
          expect(content).toContain('Clean Architecture Principle');

          // The content should contain the "Refactor Steps" header
          expect(content).toContain('Refactor Steps');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Generated content includes all opportunity titles
   */
  it('Generated content includes all opportunity titles', () => {
    fc.assert(
      fc.property(
        fc.array(opportunityWithMetadataArb, { minLength: 1, maxLength: 5 }),
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 10 }),
        nonEmptyTextArb,
        (opportunities, batchNum, totalBatches, projectName) => {
          const content = generateRequirementContent(
            opportunities,
            batchNum,
            Math.max(batchNum, totalBatches),
            projectName
          );

          // All opportunity titles should appear in the content
          for (const opp of opportunities) {
            expect(content).toContain(opp.title);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
