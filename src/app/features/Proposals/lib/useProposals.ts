import { useState, useCallback, useMemo } from 'react';
import { Proposal, ProposalState, DirectionProposal, toDirectionProposal } from '../types';
import { DbDirection } from '@/app/db';
import { useCarousel } from './useCarousel';
import { CAROUSEL_DELAYS } from './carouselConfig';

/**
 * Custom hook for managing proposal state with carousel functionality.
 * When `directions` is provided, uses real data; otherwise falls back to mock.
 *
 * Internally delegates index/processing state to the shared `useCarousel` hook.
 */
export const useProposals = (options?: {
  directions?: DbDirection[];
  onAccept?: (directionId: string) => void;
  onAcceptWithCode?: (directionId: string) => void;
  onDecline?: (directionId: string) => void;
}) => {
  const [isVisible, setIsVisible] = useState(false);

  // Mock proposal data for demonstration (fallback when no directions provided)
  const mockProposals: (Proposal & { id: string })[] = useMemo(() => [
    {
      id: 'proposal-1',
      title: 'Implement automated testing pipeline for critical user flows',
      rationale: 'Based on recent analysis of the codebase, implementing comprehensive automated testing for user authentication, data processing, and API integrations would significantly reduce deployment risks and improve code quality. This proposal includes setting up Jest for unit tests, Cypress for end-to-end testing, and GitHub Actions for continuous integration.',
      timestamp: new Date(),
      status: 'pending' as const,
    },
    {
      id: 'proposal-2',
      title: 'Optimize database queries and implement caching strategy',
      rationale: 'Performance analysis reveals several database bottlenecks that could be resolved through query optimization and strategic caching. Implementing Redis for session management and frequently accessed data, along with database indexing improvements, would reduce response times by an estimated 60% and improve user experience significantly.',
      timestamp: new Date(),
      status: 'pending' as const,
    },
    {
      id: 'proposal-3',
      title: 'Refactor component architecture for better maintainability',
      rationale: 'The current component structure has grown organically and would benefit from systematic refactoring. Breaking down large components into smaller, reusable pieces, implementing proper prop drilling solutions, and establishing consistent naming conventions would improve developer productivity and reduce technical debt.',
      timestamp: new Date(),
      status: 'pending' as const,
    }
  ], []);

  // Map real directions to DirectionProposals
  const directionProposals: DirectionProposal[] = useMemo(() => {
    if (!options?.directions) return [];
    return options.directions
      .filter(d => d.status === 'pending')
      .map(toDirectionProposal);
  }, [options?.directions]);

  const usingRealData = directionProposals.length > 0;

  // Unified items list — both Proposal and DirectionProposal have { id: string }
  const items: { id: string }[] = usingRealData ? directionProposals : mockProposals;

  // Use the shared carousel hook for all index/processing management
  const [carouselState, carouselActions] = useCarousel({
    items,
    onAccept: usingRealData
      ? (item) => options?.onAccept?.(item.id)
      : undefined,
    onAcceptWithCode: usingRealData
      ? (item) => options?.onAcceptWithCode?.(item.id)
      : undefined,
    onDecline: usingRealData
      ? (item) => options?.onDecline?.(item.id)
      : undefined,
    delays: CAROUSEL_DELAYS,
    onExhausted: () => setIsVisible(false),
  });

  // Derive typed items from the source arrays using the shared index
  const idx = carouselState.currentIndex;

  const currentDirectionProposal = usingRealData
    ? directionProposals[idx] ?? null
    : null;

  const currentProposal: Proposal | null = usingRealData
    ? null
    : mockProposals[idx] ?? null;

  const nextProposals = useMemo(() => {
    const source = usingRealData ? directionProposals : mockProposals;
    const out: (DirectionProposal | Proposal)[] = [];
    for (let i = 1; i <= 2; i++) {
      const next = source[idx + i];
      if (next) out.push(next);
    }
    return out;
  }, [usingRealData, directionProposals, mockProposals, idx]);

  const showProposal = useCallback(() => {
    setIsVisible(true);
  }, []);

  const hideProposal = useCallback(() => {
    setIsVisible(false);
  }, []);

  const proposalState: ProposalState = {
    currentProposal,
    isVisible,
    isProcessing: carouselState.isProcessing,
  };

  return {
    proposalState,
    currentDirectionProposal,
    directionProposals,
    nextProposals,
    currentIndex: carouselState.currentIndex,
    totalProposals: carouselState.total,
    usingRealData,
    showProposal,
    hideProposal,
    acceptProposal: carouselActions.accept,
    acceptWithCode: carouselActions.acceptWithCode,
    declineProposal: carouselActions.decline,
  };
};
