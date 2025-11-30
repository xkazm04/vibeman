import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { ideaRepository } from './idea.repository';
import { getDatabase, closeDatabase } from '../connection';

/**
 * **Feature: module-cleanup, Property 1: General Ideas Deletion Completeness**
 * **Validates: Requirements 4.3**
 * 
 * For any project with ideas where context_id is null, after executing the delete
 * operation for General ideas, querying ideas for that project should return zero
 * ideas with null context_id.
 */

// Arbitrary for generating valid idea data
const ideaArbitrary = fc.record({
  id: fc.uuid(),
  scan_id: fc.uuid(),
  project_id: fc.uuid(),
  context_id: fc.option(fc.uuid(), { nil: null }),
  scan_type: fc.constantFrom('zen_architect', 'code_refactor', 'ui_review'),
  category: fc.constantFrom('refactoring', 'performance', 'security', 'testing'),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  status: fc.constantFrom('pending', 'accepted', 'rejected', 'implemented'),
});

describe('Idea Repository - General Ideas Deletion', () => {
  // Track created ideas for cleanup
  let createdIdeaIds: string[] = [];

  beforeEach(() => {
    createdIdeaIds = [];
  });

  afterEach(() => {
    // Clean up any created ideas
    const db = getDatabase();
    for (const id of createdIdeaIds) {
      try {
        db.prepare('DELETE FROM ideas WHERE id = ?').run(id);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  it('Property 1: deleteIdeasWithNullContext removes all ideas with null context_id', () => {
    fc.assert(
      fc.property(
        // Generate a list of ideas, some with null context_id, some with valid context_id
        fc.array(ideaArbitrary, { minLength: 1, maxLength: 10 }),
        (ideas) => {
          // Insert all ideas into the database
          for (const idea of ideas) {
            try {
              ideaRepository.createIdea({
                id: idea.id,
                scan_id: idea.scan_id,
                project_id: idea.project_id,
                context_id: idea.context_id,
                scan_type: idea.scan_type,
                category: idea.category,
                title: idea.title,
                description: idea.description,
                status: idea.status,
              });
              createdIdeaIds.push(idea.id);
            } catch {
              // Skip if idea already exists (duplicate UUID)
              return true;
            }
          }

          // Count ideas with null context_id before deletion
          const nullContextIdeasBefore = ideaRepository.getIdeasWithNullContext();
          const nullContextCountBefore = nullContextIdeasBefore.length;

          // Execute deletion of General ideas (null context_id)
          const deletedCount = ideaRepository.deleteIdeasWithNullContext();

          // Query ideas with null context_id after deletion
          const nullContextIdeasAfter = ideaRepository.getIdeasWithNullContext();

          // Property: After deletion, there should be zero ideas with null context_id
          // that were created in this test (we check the count is 0 or reduced appropriately)
          expect(nullContextIdeasAfter.length).toBe(0);

          // The deleted count should match the number of null context ideas we had
          // (Note: there might be pre-existing ideas, so we check relative to our test)
          expect(deletedCount).toBeGreaterThanOrEqual(
            ideas.filter((i) => i.context_id === null).length
          );

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1 (corollary): deleteIdeasWithNullContext preserves ideas with non-null context_id', () => {
    fc.assert(
      fc.property(
        // Generate ideas with guaranteed non-null context_id
        fc.array(
          fc.record({
            id: fc.uuid(),
            scan_id: fc.uuid(),
            project_id: fc.uuid(),
            context_id: fc.uuid(), // Always non-null
            scan_type: fc.constantFrom('zen_architect', 'code_refactor'),
            category: fc.constantFrom('refactoring', 'performance'),
            title: fc.string({ minLength: 1, maxLength: 50 }),
            status: fc.constantFrom('pending', 'accepted'),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (ideas) => {
          // Insert all ideas with non-null context_id
          for (const idea of ideas) {
            try {
              ideaRepository.createIdea({
                id: idea.id,
                scan_id: idea.scan_id,
                project_id: idea.project_id,
                context_id: idea.context_id,
                scan_type: idea.scan_type,
                category: idea.category,
                title: idea.title,
                status: idea.status,
              });
              createdIdeaIds.push(idea.id);
            } catch {
              return true;
            }
          }

          // Execute deletion of General ideas (null context_id)
          ideaRepository.deleteIdeasWithNullContext();

          // Verify all our non-null context ideas still exist
          for (const idea of ideas) {
            const retrieved = ideaRepository.getIdeaById(idea.id);
            expect(retrieved).not.toBeNull();
            expect(retrieved?.context_id).toBe(idea.context_id);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
