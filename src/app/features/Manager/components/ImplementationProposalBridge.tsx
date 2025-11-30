'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, ChevronLeft, ChevronRight, AlertCircle, X } from 'lucide-react';
import { IntegrationErrorBoundary } from '@/components/IntegrationErrorBoundary';
import type { Proposal } from '@/app/features/Proposals';
import {
  generateProposalsFromLog,
  createRequirementFromProposal,
  mapProposalAction,
  updateProposalStatus,
  advanceQueueIndex,
  formatCarouselProgress,
} from '../lib/proposalAdapter';
import type { EnrichedImplementationLog } from '../lib/types';

export interface ImplementationProposalBridgeProps {
  /** The implementation log to generate proposals for */
  implementationLog: EnrichedImplementationLog;
  /** Optional project path for context */
  projectPath?: string;
  /** Callback when a proposal is accepted */
  onProposalAccepted: (proposalId: string, requirementName: string, content: string) => void;
  /** Callback when a proposal is accepted with code generation */
  onProposalAcceptedWithCode?: (proposalId: string, requirementName: string, content: string) => void;
  /** Callback when a proposal is declined */
  onProposalDeclined: (proposalId: string) => void;
  /** Optional callback for error logging */
  onError?: (error: Error) => void;
}

/**
 * Bridge component that integrates the Proposals module with the Manager.
 *
 * Handles:
 * - Generating proposals from implementation log content
 * - Wrapping ProposalCard with implementation-specific context
 * - Managing accept/decline actions with requirement creation
 * - Carousel navigation with progress indicator
 *
 * Requirements: 2.1, 2.6
 */
function ImplementationProposalBridgeInner({
  implementationLog,
  projectPath,
  onProposalAccepted,
  onProposalAcceptedWithCode,
  onProposalDeclined,
  onError,
}: ImplementationProposalBridgeProps) {
  // Generate proposals from the implementation log
  const [proposals, setProposals] = useState<Proposal[]>(() =>
    generateProposalsFromLog(implementationLog, projectPath)
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVisible, setIsVisible] = useState(true);


  // Regenerate proposals when implementation log changes
  useEffect(() => {
    const newProposals = generateProposalsFromLog(implementationLog, projectPath);
    setProposals(newProposals);
    setCurrentIndex(0);
    setIsVisible(newProposals.length > 0);
  }, [implementationLog.id, projectPath]);

  // Current proposal
  const currentProposal = useMemo(() => {
    return proposals[currentIndex] || null;
  }, [proposals, currentIndex]);

  // Next proposals for carousel preview
  const nextProposals = useMemo(() => {
    const next: Proposal[] = [];
    for (let i = 1; i <= 2; i++) {
      const nextIndex = currentIndex + i;
      if (nextIndex < proposals.length) {
        next.push(proposals[nextIndex]);
      }
    }
    return next;
  }, [currentIndex, proposals]);

  // Progress indicator
  const progressText = useMemo(() => {
    return formatCarouselProgress(currentIndex, proposals.length);
  }, [currentIndex, proposals.length]);

  /**
   * Move to the next proposal in the queue
   */
  const moveToNext = useCallback(() => {
    const nextIndex = advanceQueueIndex(currentIndex, proposals.length);
    if (nextIndex === -1) {
      // End of queue
      setIsVisible(false);
    } else {
      setCurrentIndex(nextIndex);
    }
  }, [currentIndex, proposals.length]);

  /**
   * Handle accepting a proposal
   */
  const handleAccept = useCallback(async () => {
    if (!currentProposal || isProcessing) return;

    try {
      setIsProcessing(true);

      // Update proposal status
      const updatedProposal = updateProposalStatus(currentProposal, 'accepted');
      setProposals((prev) =>
        prev.map((p) => (p.id === currentProposal.id ? updatedProposal : p))
      );

      // Create requirement content
      const content = createRequirementFromProposal(currentProposal, implementationLog);
      const requirementName = `${implementationLog.requirement_name}-improvement`;

      // Notify parent
      onProposalAccepted(currentProposal.id, requirementName, content);

      // Move to next proposal
      moveToNext();
    } catch (error) {
      console.error('[ImplementationProposalBridge] Accept failed:', error);
      onError?.(error instanceof Error ? error : new Error('Accept failed'));
    } finally {
      setIsProcessing(false);
    }
  }, [currentProposal, isProcessing, implementationLog, onProposalAccepted, moveToNext, onError]);

  /**
   * Handle accepting a proposal with code generation
   */
  const handleAcceptWithCode = useCallback(async () => {
    if (!currentProposal || isProcessing) return;

    try {
      setIsProcessing(true);

      // Update proposal status
      const updatedProposal = updateProposalStatus(currentProposal, 'accepted');
      setProposals((prev) =>
        prev.map((p) => (p.id === currentProposal.id ? updatedProposal : p))
      );

      // Create requirement content
      const content = createRequirementFromProposal(currentProposal, implementationLog);
      const requirementName = `${implementationLog.requirement_name}-improvement`;

      // Notify parent (use code callback if available, otherwise regular accept)
      if (onProposalAcceptedWithCode) {
        onProposalAcceptedWithCode(currentProposal.id, requirementName, content);
      } else {
        onProposalAccepted(currentProposal.id, requirementName, content);
      }

      // Move to next proposal
      moveToNext();
    } catch (error) {
      console.error('[ImplementationProposalBridge] AcceptWithCode failed:', error);
      onError?.(error instanceof Error ? error : new Error('AcceptWithCode failed'));
    } finally {
      setIsProcessing(false);
    }
  }, [
    currentProposal,
    isProcessing,
    implementationLog,
    onProposalAccepted,
    onProposalAcceptedWithCode,
    moveToNext,
    onError,
  ]);

  /**
   * Handle declining a proposal
   */
  const handleDecline = useCallback(async () => {
    if (!currentProposal || isProcessing) return;

    try {
      setIsProcessing(true);

      // Update proposal status
      const updatedProposal = updateProposalStatus(currentProposal, 'declined');
      setProposals((prev) =>
        prev.map((p) => (p.id === currentProposal.id ? updatedProposal : p))
      );

      // Notify parent
      onProposalDeclined(currentProposal.id);

      // Move to next proposal
      moveToNext();
    } catch (error) {
      console.error('[ImplementationProposalBridge] Decline failed:', error);
      onError?.(error instanceof Error ? error : new Error('Decline failed'));
    } finally {
      setIsProcessing(false);
    }
  }, [currentProposal, isProcessing, onProposalDeclined, moveToNext, onError]);

  /**
   * Handle closing the proposal panel
   */
  const handleClose = useCallback(() => {
    setIsVisible(false);
  }, []);

  // Don't render if no proposals or not visible
  if (!isVisible || !currentProposal || proposals.length === 0) {
    return null;
  }

  return (
    <div
      className="relative mt-4"
      data-testid="implementation-proposal-bridge"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium text-gray-200">
            Improvement Proposals
          </span>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-xs text-amber-400 border border-amber-500/30">
            {proposals.length} available
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-mono">{progressText}</span>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-gray-700/50 text-gray-400 hover:text-gray-200 transition-colors"
            aria-label="Close proposals"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Inline Proposal Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border border-gray-700/50 rounded-xl p-5"
      >
        {/* Proposal Content */}
        <div className="mb-4">
          <h4 className="text-lg font-semibold text-white mb-2">
            {currentProposal.title}
          </h4>
          <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">
            {currentProposal.rationale}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Progress dots */}
            <div className="flex gap-1">
              {proposals.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === currentIndex
                      ? 'bg-amber-400'
                      : i < currentIndex
                      ? 'bg-gray-600'
                      : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDecline}
              disabled={isProcessing}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors disabled:opacity-50"
            >
              Skip
            </button>
            <button
              onClick={handleAccept}
              disabled={isProcessing}
              className="px-3 py-1.5 text-sm bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30 rounded-lg transition-colors disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : 'Create Requirement'}
            </button>
            {onProposalAcceptedWithCode && (
              <button
                onClick={handleAcceptWithCode}
                disabled={isProcessing}
                className="px-3 py-1.5 text-sm bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg transition-colors disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : 'Implement with AI'}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * ImplementationProposalBridge wrapped with error boundary for graceful degradation.
 *
 * If the Proposals module fails to load or throws an error,
 * this component will hide itself and log the error.
 */
export default function ImplementationProposalBridge(props: ImplementationProposalBridgeProps) {
  const handleError = useCallback(
    (error: Error) => {
      console.error('[ImplementationProposalBridge] Integration error:', error);
      props.onError?.(error);
    },
    [props.onError]
  );

  return (
    <IntegrationErrorBoundary
      integrationName="proposal"
      onError={handleError}
      fallback={
        <div className="mt-4 border border-gray-700/50 rounded-lg p-4 bg-gray-900/50">
          <div className="flex items-center gap-2 text-gray-500">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">Improvement proposals unavailable</span>
          </div>
        </div>
      }
    >
      <ImplementationProposalBridgeInner {...props} />
    </IntegrationErrorBoundary>
  );
}
