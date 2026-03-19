'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProposals } from '../lib/useProposals';
import { ProposalCard } from './ProposalCard';
import { useThemeStore } from '@/stores/themeStore';

interface ProposalPanelProps {
  isVisible: boolean;
}

const ProposalPanel = React.memo(({ isVisible }: ProposalPanelProps) => {
  const { getThemeColors } = useThemeStore();
  const colors = getThemeColors();
  const panelRef = useRef<HTMLDivElement>(null);

  const {
    proposalState,
    nextProposals,
    currentIndex,
    totalProposals,
    acceptProposal,
    acceptWithCode,
    declineProposal
  } = useProposals();

  // Keyboard navigation for the proposal overlay
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (proposalState.isProcessing) return;
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        acceptProposal();
        break;
      case 'Backspace':
      case 'Delete':
        e.preventDefault();
        declineProposal();
        break;
    }
  }, [proposalState.isProcessing, acceptProposal, declineProposal]);

  // Auto-focus panel when visible
  useEffect(() => {
    if (isVisible && proposalState.isVisible) {
      panelRef.current?.focus();
    }
  }, [isVisible, proposalState.isVisible]);

  if (!proposalState.currentProposal) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <AnimatePresence mode="wait">
      {isVisible && proposalState.isVisible && (
        <motion.div
          ref={panelRef}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-30 outline-none"
          onClick={handleBackdropClick}
          role="region"
          aria-label="Proposal review panel"
        >
          {/* Proposal Cards with improved transitions */}
          <AnimatePresence mode="popLayout">
            {/* Main Proposal - Always centered */}
            <ProposalCard
              key={`main-${proposalState.currentProposal.id}`}
              proposal={proposalState.currentProposal}
              isMain={true}
              onAccept={acceptProposal}
              onAcceptWithCode={acceptWithCode}
              onDecline={declineProposal}
              isProcessing={proposalState.isProcessing}
            />

            {/* Next Proposals - Blurred on the left */}
            {nextProposals.map((proposal, index) => (
              <ProposalCard
                key={`next-${proposal.id}`}
                proposal={proposal}
                isMain={false}
                index={index}
              />
            ))}
          </AnimatePresence>

          {/* Progress Indicator */}
          <motion.div
            className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-35"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center space-x-2 px-4 py-2 bg-gray-900/80 backdrop-blur-xl border border-gray-700/40 rounded-full">
              <span className="text-sm text-gray-400 font-mono">
                {currentIndex + 1} / {totalProposals}
              </span>
              <div className="flex space-x-1">
                {Array.from({ length: totalProposals }).map((_, i) => (
                  <motion.div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-colors duration-200 ${i === currentIndex ? colors.accent : 'bg-gray-600'
                      }`}
                    animate={{
                      scale: i === currentIndex ? 1.2 : 1
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

ProposalPanel.displayName = 'ProposalPanel';

export default ProposalPanel;