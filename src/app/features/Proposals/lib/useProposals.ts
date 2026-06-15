import { useState, useCallback, useMemo } from 'react';
import { Proposal, ProposalState, DirectionProposal, toDirectionProposal } from '../types';
import type { DbDirection } from '@/app/db/models/types';
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

  // No mock fallback. Previously this returned three hardcoded "proposals"
  // (automated testing / DB caching / refactor) whenever no real directions were
  // supplied — and ProposalPanel calls useProposals() with no args, so it always
  // rendered those fabricated proposals whose accept/decline fired undefined
  // callbacks (success theater). With an empty fallback the panel shows nothing
  // until real directions are provided.
  const mockProposals: (Proposal & { id: string })[] = useMemo(() => [], []);

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
