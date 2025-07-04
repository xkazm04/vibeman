import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, User } from 'lucide-react';
import { BacklogProposal } from '../../../types';

interface CoderBacklogDetailProps {
  proposal: BacklogProposal | null;
  isOpen: boolean;
  onClose: () => void;
  onAccept: (proposalId: string) => void;
  onReject: (proposalId: string) => void;
}

export default function BacklogDetail({
  proposal,
  isOpen,
  onClose,
  onAccept,
  onReject
}: CoderBacklogDetailProps) {
  if (!proposal) return null;

  const agentNames = {
    developer: 'Developer',
    mastermind: 'Mastermind',
    tester: 'Tester',
    artist: 'Artist'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className={`relative w-full max-w-2xl max-h-[90vh] border border-gray-700/30 rounded-xl overflow-hidden bg-gray-950/80`}>
              {/* Header */}
              <div className="relative z-10 p-6 border-b border-gray-700/30">
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-20">
                    <h2 className="text-xl font-semibold text-white mb-2">
                      {proposal.title}
                    </h2>
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <div className="flex items-center space-x-1">
                        <User className="w-4 h-4" />
                        <span>{agentNames[proposal.agent]}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{proposal.timestamp.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                <div className="space-y-6">
                  {/* Description */}
                  <div>
                    <h3 className="text-lg font-medium text-white mb-3">Description</h3>
                    <p className="text-gray-300 leading-relaxed">
                      {proposal.description}
                    </p>
                  </div>

                  {/* Additional Details Section - Placeholder for future expansion */}
                  <div>
                    <h3 className="text-lg font-medium text-white mb-3">Details</h3>
                    <div className="space-y-3">
                      <div className="p-4 bg-gray-800/30 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-300 mb-1">Proposed By</h4>
                        <p className="text-sm text-gray-400">{agentNames[proposal.agent]} Agent</p>
                      </div>
                      <div className="p-4 bg-gray-800/30 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-300 mb-1">Created</h4>
                        <p className="text-sm text-gray-400">{proposal.timestamp.toLocaleString()}</p>
                      </div>
                      <div className="p-4 bg-gray-800/30 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-300 mb-1">Priority</h4>
                        <p className="text-sm text-gray-400">Medium</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-6 border-t border-gray-700/30 bg-gray-800/20">
                <div className="flex justify-end space-x-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onReject(proposal.id);
                      onClose();
                    }}
                    className="px-6 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-600/30 text-red-400 rounded-lg transition-colors"
                  >
                    Reject
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onAccept(proposal.id);
                      onClose();
                    }}
                    className="px-6 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-600/30 text-green-400 rounded-lg transition-colors"
                  >
                    Accept
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}; 