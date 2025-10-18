import { useState, useCallback, useMemo } from 'react';
import { Proposal, ProposalState } from '../types';

/**
 * Custom hook for managing proposal state with carousel functionality
 */
export const useProposals = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Mock proposal data for demonstration
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

  const currentProposal = mockProposals[currentIndex] || null;
  const nextProposals = useMemo(() => {
    const next = [];
    for (let i = 1; i <= 2; i++) {
      const nextIndex = currentIndex + i;
      if (nextIndex < mockProposals.length) {
        next.push(mockProposals[nextIndex]);
      }
    }
    return next;
  }, [currentIndex, mockProposals]);

  const showProposal = useCallback(() => {
    setIsVisible(true);
  }, []);

  const hideProposal = useCallback(() => {
    setIsVisible(false);
  }, []);

  const moveToNextProposal = useCallback(() => {
    if (currentIndex < mockProposals.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // No more proposals, hide the panel
      setIsVisible(false);
    }
  }, [currentIndex, mockProposals.length]);

  const acceptProposal = useCallback(async () => {
    if (!currentProposal) return;

    setIsProcessing(true);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsProcessing(false);
    moveToNextProposal();
  }, [currentProposal, moveToNextProposal]);

  const acceptWithCode = useCallback(async () => {
    if (!currentProposal) return;

    setIsProcessing(true);
    
    // Simulate processing delay for code generation
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsProcessing(false);
    moveToNextProposal();
  }, [currentProposal, moveToNextProposal]);

  const declineProposal = useCallback(async () => {
    if (!currentProposal) return;

    setIsProcessing(true);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsProcessing(false);
    moveToNextProposal();
  }, [currentProposal, moveToNextProposal]);

  const proposalState: ProposalState = {
    currentProposal,
    isVisible,
    isProcessing
  };

  return {
    proposalState,
    nextProposals,
    currentIndex,
    totalProposals: mockProposals.length,
    showProposal,
    hideProposal,
    acceptProposal,
    acceptWithCode,
    declineProposal
  };
};