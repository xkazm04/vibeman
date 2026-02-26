import { useState, useCallback, useMemo } from 'react';
import { Proposal, ProposalState, DirectionProposal, toDirectionProposal } from '../types';
import { DbDirection } from '@/app/db';

/**
 * Simulate processing with delay
 */
const simulateProcessing = (delayMs: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, delayMs));
};

/**
 * Custom hook for managing proposal state with carousel functionality.
 * When `directions` is provided, uses real data; otherwise falls back to mock.
 */
export const useProposals = (options?: {
  directions?: DbDirection[];
  onAccept?: (directionId: string) => void;
  onAcceptWithCode?: (directionId: string) => void;
  onDecline?: (directionId: string) => void;
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Mock proposal data for demonstration (fallback when no directions provided)
  const mockProposals: Proposal[] = useMemo(() => [
    {
      id: 'proposal-1',
      title: 'Implement automated testing pipeline for critical user flows',
      rationale: 'Based on recent analysis of the codebase, implementing comprehensive automated testing for user authentication, data processing, and API integrations would significantly reduce deployment risks and improve code quality. This proposal includes setting up Jest for unit tests, Cypress for end-to-end testing, and GitHub Actions for continuous integration.',
      timestamp: new Date(),
      status: 'pending'
    },
    {
      id: 'proposal-2',
      title: 'Optimize database queries and implement caching strategy',
      rationale: 'Performance analysis reveals several database bottlenecks that could be resolved through query optimization and strategic caching. Implementing Redis for session management and frequently accessed data, along with database indexing improvements, would reduce response times by an estimated 60% and improve user experience significantly.',
      timestamp: new Date(),
      status: 'pending'
    },
    {
      id: 'proposal-3',
      title: 'Refactor component architecture for better maintainability',
      rationale: 'The current component structure has grown organically and would benefit from systematic refactoring. Breaking down large components into smaller, reusable pieces, implementing proper prop drilling solutions, and establishing consistent naming conventions would improve developer productivity and reduce technical debt.',
      timestamp: new Date(),
      status: 'pending'
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
  const totalItems = usingRealData ? directionProposals.length : mockProposals.length;

  // Clamp index when data changes
  const safeIndex = Math.min(currentIndex, Math.max(0, totalItems - 1));

  const currentDirectionProposal = usingRealData
    ? directionProposals[safeIndex] ?? null
    : null;

  const currentProposal: Proposal | null = usingRealData
    ? null
    : mockProposals[safeIndex] ?? null;

  const nextProposals = useMemo(() => {
    const source = usingRealData ? directionProposals : mockProposals;
    const next = [];
    for (let i = 1; i <= 2; i++) {
      const nextIndex = safeIndex + i;
      if (nextIndex < source.length) {
        next.push(source[nextIndex]);
      }
    }
    return next;
  }, [safeIndex, usingRealData, directionProposals, mockProposals]);

  const showProposal = useCallback(() => {
    setIsVisible(true);
  }, []);

  const hideProposal = useCallback(() => {
    setIsVisible(false);
  }, []);

  const moveToNextProposal = useCallback(() => {
    if (safeIndex < totalItems - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsVisible(false);
    }
  }, [safeIndex, totalItems]);

  const processProposal = useCallback(async (delayMs: number) => {
    setIsProcessing(true);
    await simulateProcessing(delayMs);
    setIsProcessing(false);
    moveToNextProposal();
  }, [moveToNextProposal]);

  const acceptProposal = useCallback(async () => {
    if (usingRealData && currentDirectionProposal) {
      options?.onAccept?.(currentDirectionProposal.id);
    }
    await processProposal(600);
  }, [processProposal, usingRealData, currentDirectionProposal, options]);

  const acceptWithCode = useCallback(async () => {
    if (usingRealData && currentDirectionProposal) {
      options?.onAcceptWithCode?.(currentDirectionProposal.id);
    }
    await processProposal(800);
  }, [processProposal, usingRealData, currentDirectionProposal, options]);

  const declineProposal = useCallback(async () => {
    if (usingRealData && currentDirectionProposal) {
      options?.onDecline?.(currentDirectionProposal.id);
    }
    await processProposal(400);
  }, [processProposal, usingRealData, currentDirectionProposal, options]);

  const proposalState: ProposalState = {
    currentProposal,
    isVisible,
    isProcessing
  };

  return {
    proposalState,
    currentDirectionProposal,
    directionProposals,
    nextProposals,
    currentIndex: safeIndex,
    totalProposals: totalItems,
    usingRealData,
    showProposal,
    hideProposal,
    acceptProposal,
    acceptWithCode,
    declineProposal
  };
};
