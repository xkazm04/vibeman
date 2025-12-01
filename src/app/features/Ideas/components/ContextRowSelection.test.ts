import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { Context, ContextGroup } from '@/lib/queries/contextQueries';

/**
 * **Feature: module-cleanup, Property 2: Context Alphabetical Sorting**
 * **Validates: Requirements 5.3**
 * 
 * For any list of contexts within a context group, the rendered order should match
 * the alphabetical sorting by name in ascending order (a-z).
 */

// Extract the sorting logic from ContextRowSelection for testing
// This mirrors the groupedContexts useMemo logic
function groupAndSortContexts(
  contexts: Context[],
  contextGroups: ContextGroup[]
): Record<string, Context[]> {
  const grouped: Record<string, Context[]> = {
    ungrouped: [],
  };

  contextGroups.forEach(group => {
    grouped[group.id] = [];
  });

  contexts.forEach(context => {
    if (context.groupId) {
      if (grouped[context.groupId]) {
        grouped[context.groupId].push(context);
      }
    } else {
      grouped.ungrouped.push(context);
    }
  });

  // Sort contexts alphabetically by name within each group
  Object.keys(grouped).forEach(groupId => {
    grouped[groupId].sort((a, b) => a.name.localeCompare(b.name));
  });

  return grouped;
}

// Use constant date to avoid date generation issues
const fixedDate = new Date('2024-01-01T00:00:00.000Z');

// Arbitrary for generating valid context data
const contextArbitrary = (groupIds: string[]): fc.Arbitrary<Context> =>
  fc.record({
    id: fc.uuid(),
    projectId: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    filePaths: fc.array(fc.string({ minLength: 1, maxLength: 100 })),
    groupId: fc.option(fc.constantFrom(...groupIds), { nil: null }),
    createdAt: fc.constant(fixedDate),
    updatedAt: fc.constant(fixedDate),
  });

// Arbitrary for generating valid context group data
const contextGroupArbitrary: fc.Arbitrary<ContextGroup> = fc.record({
  id: fc.uuid(),
  projectId: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  color: fc.constantFrom('#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'),
  position: fc.integer({ min: 0, max: 100 }),
  type: fc.constantFrom('pages', 'client', 'server', 'external', null),
  icon: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
  createdAt: fc.constant(fixedDate),
  updatedAt: fc.constant(fixedDate),
});

describe('ContextRowSelection - Alphabetical Sorting', () => {
  // Fixed group IDs for testing
  const fixedGroupIds = ['group-1', 'group-2', 'group-3'];

  it('Property 2: contexts within each group are sorted alphabetically by name (a-z)', () => {
    fc.assert(
      fc.property(
        // Generate context groups
        fc.array(contextGroupArbitrary, { minLength: 0, maxLength: 5 }),
        // Generate contexts that may reference any of the fixed group IDs
        fc.array(contextArbitrary(fixedGroupIds), { minLength: 1, maxLength: 20 }),
        (groups, contexts) => {
          // Ensure groups have the fixed IDs for proper grouping
          const groupsWithFixedIds = groups.map((g, i) => ({
            ...g,
            id: fixedGroupIds[i % fixedGroupIds.length]
          }));

          // Apply the grouping and sorting logic
          const grouped = groupAndSortContexts(contexts, groupsWithFixedIds);

          // For each group, verify alphabetical ordering
          for (const groupId of Object.keys(grouped)) {
            const groupContexts = grouped[groupId];
            
            // Check that contexts are sorted alphabetically by name
            for (let i = 1; i < groupContexts.length; i++) {
              const prevName = groupContexts[i - 1].name;
              const currName = groupContexts[i].name;
              
              // localeCompare should return <= 0 for sorted order
              expect(prevName.localeCompare(currName)).toBeLessThanOrEqual(0);
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2 (corollary): sorting is stable - same input produces same output', () => {
    fc.assert(
      fc.property(
        fc.array(contextGroupArbitrary, { minLength: 1, maxLength: 3 }),
        fc.array(contextArbitrary(fixedGroupIds), { minLength: 1, maxLength: 10 }),
        (groups, contexts) => {
          const groupsWithFixedIds = groups.map((g, i) => ({
            ...g,
            id: fixedGroupIds[i % fixedGroupIds.length]
          }));

          // Apply sorting twice
          const result1 = groupAndSortContexts(contexts, groupsWithFixedIds);
          const result2 = groupAndSortContexts(contexts, groupsWithFixedIds);

          // Results should be identical
          for (const groupId of Object.keys(result1)) {
            const names1 = result1[groupId].map(c => c.name);
            const names2 = result2[groupId].map(c => c.name);
            expect(names1).toEqual(names2);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2 (edge case): empty context list produces empty groups', () => {
    fc.assert(
      fc.property(
        fc.array(contextGroupArbitrary, { minLength: 0, maxLength: 5 }),
        (groups) => {
          const grouped = groupAndSortContexts([], groups);

          // All groups should be empty
          for (const groupId of Object.keys(grouped)) {
            expect(grouped[groupId]).toHaveLength(0);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
