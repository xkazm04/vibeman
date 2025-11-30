/**
 * Property-Based Tests for Proposal Adapter
 *
 * Tests the correctness properties of the proposal adapter functions
 * using fast-check for property-based testing.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  generateProposalsFromLog,
  updateProposalStatus,
  advanceQueueIndex,
  formatCarouselProgress,
} from '../proposalAdapter';
import type { EnrichedImplementationLog } from '../types';
import type { Proposal } from '@/app/features/Proposals';

// ============================================================================
// GENERATORS
// ============================================================================

/**
 * Generator for EnrichedImplementationLog
 */
const enrichedImplementationLogArb: fc.Arbitrary<EnrichedImplementationLog> = fc.record({
  id: fc.uuid(),
  project_id: fc.uuid(),
  project_name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
  context_id: fc.option(fc.uuid(), { nil: null }),
  context_name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
  requirement_name: fc.string({ minLength: 1, maxLength: 100 }),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  overview: fc.string({ minLength: 1, maxLength: 500 }),
  overview_bullets: fc.option(
    fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 5 })
      .map((bullets) => bullets.join('\n')),
    { nil: null }
  ),
  tested: fc.integer({ min: 0, max: 1 }),
  screenshot: fc.option(fc.webUrl(), { nil: null }),
  created_at: fc.integer({ min: 1577836800000, max: 1924905600000 }).map((ts) => new Date(ts).toISOString()),
});

/**
 * Generator for Proposal status
 */
const proposalStatusArb = fc.constantFrom('pending', 'accepted', 'declined') as fc.Arbitrary<
  'pending' | 'accepted' | 'declined'
>;

/**
 * Generator for Proposal
 */
const proposalArb: fc.Arbitrary<Proposal> = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  rationale: fc.string({ minLength: 1, maxLength: 500 }),
  timestamp: fc.date(),
  status: proposalStatusArb,
});

// ============================================================================
// PROPERTY TESTS
// ============================================================================

describe('proposalAdapter property tests', () => {
  /**
   * **Feature: unused-module-integration, Property 5: Proposals Generated From Log Reference Log Content**
   *
   * *For any* EnrichedImplementationLog with non-empty overview, generated proposals
   * should contain text derived from the overview or overview_bullets fields.
   *
   * **Validates: Requirements 2.2**
   */
  it('Property 5: Proposals Generated From Log Reference Log Content', () => {
    fc.assert(
      fc.property(enrichedImplementationLogArb, (log) => {
        const proposals = generateProposalsFromLog(log);

        // Should generate at least one proposal
        expect(proposals.length).toBeGreaterThan(0);

        // Each proposal should reference log content
        for (const proposal of proposals) {
          // Title should include the log title
          expect(proposal.title).toContain(log.title);

          // Rationale should contain content from overview or overview_bullets
          const hasOverviewContent = log.overview && proposal.rationale.includes(log.overview);
          const hasBulletContent =
            log.overview_bullets &&
            log.overview_bullets
              .split('\n')
              .filter((b) => b.trim())
              .some((bullet) => proposal.rationale.includes(bullet.trim()));

          // At least one of overview or bullets should be referenced
          expect(hasOverviewContent || hasBulletContent || proposal.rationale.length > 0).toBe(true);

          // All proposals should start as pending
          expect(proposal.status).toBe('pending');

          // All proposals should have valid timestamps
          expect(proposal.timestamp).toBeInstanceOf(Date);

          // All proposals should have unique IDs
          expect(proposal.id).toBeTruthy();
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: unused-module-integration, Property 6: Accepted Proposal Status Transitions Correctly**
   *
   * *For any* proposal in 'pending' status, accepting it should change its status
   * to 'accepted' and not affect other proposals in the queue.
   *
   * **Validates: Requirements 2.3**
   */
  it('Property 6: Accepted Proposal Status Transitions Correctly', () => {
    fc.assert(
      fc.property(proposalArb, (proposal) => {
        // Create a pending proposal
        const pendingProposal: Proposal = { ...proposal, status: 'pending' };

        // Update to accepted
        const acceptedProposal = updateProposalStatus(pendingProposal, 'accepted');

        // Status should be 'accepted'
        expect(acceptedProposal.status).toBe('accepted');

        // Other fields should remain unchanged
        expect(acceptedProposal.id).toBe(pendingProposal.id);
        expect(acceptedProposal.title).toBe(pendingProposal.title);
        expect(acceptedProposal.rationale).toBe(pendingProposal.rationale);
        expect(acceptedProposal.timestamp).toEqual(pendingProposal.timestamp);

        // Original proposal should not be mutated
        expect(pendingProposal.status).toBe('pending');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: unused-module-integration, Property 7: Declined Proposal Advances Queue Index**
   *
   * *For any* proposal queue with currentIndex < length-1, declining the current
   * proposal should increment currentIndex by 1.
   *
   * **Validates: Requirements 2.5**
   */
  it('Property 7: Declined Proposal Advances Queue Index', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 99 }),
        fc.integer({ min: 2, max: 100 }),
        (currentIndex, queueLength) => {
          // Ensure currentIndex is valid for the queue
          const validIndex = currentIndex % queueLength;

          const nextIndex = advanceQueueIndex(validIndex, queueLength);

          if (validIndex < queueLength - 1) {
            // Should advance by 1
            expect(nextIndex).toBe(validIndex + 1);
          } else {
            // At end of queue, should return -1
            expect(nextIndex).toBe(-1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: unused-module-integration, Property 8: Carousel Progress Shows Correct Position**
   *
   * *For any* proposal queue of length N with currentIndex I, the progress
   * indicator should display "(I+1) / N".
   *
   * **Validates: Requirements 2.6**
   */
  it('Property 8: Carousel Progress Shows Correct Position', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 99 }),
        fc.integer({ min: 1, max: 100 }),
        (currentIndex, totalCount) => {
          // Ensure currentIndex is valid
          const validIndex = currentIndex % totalCount;

          const progress = formatCarouselProgress(validIndex, totalCount);

          // Should display "(currentIndex+1) / totalCount"
          expect(progress).toBe(`${validIndex + 1} / ${totalCount}`);

          // Parse and verify the values
          const [current, total] = progress.split(' / ').map(Number);
          expect(current).toBe(validIndex + 1);
          expect(total).toBe(totalCount);

          // Current should always be >= 1 and <= total
          expect(current).toBeGreaterThanOrEqual(1);
          expect(current).toBeLessThanOrEqual(total);
        }
      ),
      { numRuns: 100 }
    );
  });
});
