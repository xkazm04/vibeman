'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProposals } from '../lib/useProposals';
import { ProposalCard } from './ProposalCard';

interface ProposalPanelProps {
  isVisible: boolean;
}

const ProposalPanel = React.memo(({ isVisible }: ProposalPanelProps) => {
  const {
    proposalState,
    nextProposals,
    currentIndex,
    totalProposals,
    acceptProposal,
    acceptWithCode,
    declineProposal
  } = useProposals();

  // Proposals should only show when there are actual proposals to display
  // Not automatically when the ProjectManager panel is visible



  if (!proposalState.currentProposal) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Prevent any backdrop clicks from closing the panel
    // The panel should only be closed via the ProjectManager close button
    e.stopPropagation();
    console.log('ProposalPanel backdrop clicked - prevented from closing');
  };

  return (
    <AnimatePresence mode="wait">
      {isVisible && proposalState.isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-30"
          onClick={handleBackdropClick}
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
                    className={`w-2 h-2 rounded-full transition-colors duration-300 ${i === currentIndex ? 'bg-cyan-400' : 'bg-gray-600'
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