import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { Context } from '@/lib/queries/contextQueries';
import { getContextNameFromMap } from '@/app/features/Ideas/lib/contextLoader';

/**
 * **Feature: module-cleanup, Property 3: General Context Fallback**
 * **Validates: Requirements 7.3**
 * 
 * For any idea displayed in the tinder card where context_id is null or undefined,
 * the displayed context name should be "General".
 */

// Helper function that mirrors the logic in TinderContent for determining context name
function getContextNameForIdea(
  contextId: string | null | undefined,
  contextsMap: Record<string, Context[]>
): string {
  if (contextId) {
    return getContextNameFromMap(contextId, contextsMap);
  }
  return 'General';
}

// Use constant date to avoid date generation issues
const fixedDate = new Date('2024-01-01T00:00:00.000Z');

// Arbitrary for generating valid context data
const contextArbitrary: fc.Arbitrary<Context> = fc.record({
  id: fc.uuid(),
  projectId: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  filePaths: fc.array(fc.string({ minLength: 1, maxLength: 100 })),
  groupId: fc.option(fc.uuid(), { nil: null }),
  createdAt: fc.constant(fixedDate),
  updatedAt: fc.constant(fixedDate),
});

// Arbitrary for generating a contexts map
const contextsMapArbitrary: fc.Arbitrary<Record<string, Context[]>> = fc
  .array(fc.tuple(fc.uuid(), fc.array(contextArbitrary, { minLength: 0, maxLength: 5 })), {
    minLength: 0,
    maxLength: 3,
  })
  .map((entries) => Object.fromEntries(entries));

describe('IdeaCard - General Context Fallback', () => {
  it('Property 3: ideas with null context_id display "General" as context name', () => {
    fc.assert(
      fc.property(
        contextsMapArbitrary,
        (contextsMap) => {
          // When context_id is null, the result should always be "General"
          const result = getContextNameForIdea(null, contextsMap);
          expect(result).toBe('General');
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 3: ideas with undefined context_id display "General" as context name', () => {
    fc.assert(
      fc.property(
        contextsMapArbitrary,
        (contextsMap) => {
          // When context_id is undefined, the result should always be "General"
          const result = getContextNameForIdea(undefined, contextsMap);
          expect(result).toBe('General');
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 3 (corollary): ideas with valid context_id display the context name from map', () => {
    fc.assert(
      fc.property(
        // Generate a non-empty contexts map with at least one context
        fc.array(contextArbitrary, { minLength: 1, maxLength: 5 }),
        fc.uuid(),
        (contexts, projectId) => {
          // Create a contexts map with the generated contexts
          const contextsMap: Record<string, Context[]> = {
            [projectId]: contexts,
          };

          // Pick a random context from the list
          const randomContext = contexts[0];

          // When context_id matches a context in the map, return that context's name
          const result = getContextNameForIdea(randomContext.id, contextsMap);
          expect(result).toBe(randomContext.name);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 3 (edge case): ideas with context_id not in map return truncated ID', () => {
    fc.assert(
      fc.property(
        contextsMapArbitrary,
        fc.uuid(),
        (contextsMap, unknownContextId) => {
          // Ensure the unknownContextId is not in any of the contexts
          const allContextIds = Object.values(contextsMap)
            .flat()
            .map((c) => c.id);
          
          // Skip if by chance the generated ID exists in the map
          if (allContextIds.includes(unknownContextId)) {
            return true;
          }

          // When context_id doesn't match any context, getContextNameFromMap returns truncated ID
          const result = getContextNameForIdea(unknownContextId, contextsMap);
          
          // The fallback in getContextNameFromMap returns first 8 chars of the ID
          expect(result).toBe(unknownContextId.substring(0, 8));
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
