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
            <div className="relative w-full max-w-2xl max-h-[90vh] bg-slate-900/95 border border-slate-700/40 rounded-xl overflow-hidden backdrop-blur-xl shadow-2xl">
              {/* Header */}
              <div className="p-6 border-b border-slate-700/30">
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-20">
                    <h2 className="text-xl font-semibold text-white mb-2 tracking-wide">
                      {proposal.title}
                    </h2>
                    <div className="flex items-center space-x-4 text-sm text-slate-400">
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
                    className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                <div className="space-y-6">
                  {/* Description */}
                  <div>
                    <h3 className="text-lg font-medium text-white mb-3 tracking-wide">Description</h3>
                    <p className="text-slate-200 leading-relaxed">
                      {proposal.description}
                    </p>
                  </div>

                  {/* Additional Details Section */}
                  <div>
                    <h3 className="text-lg font-medium text-white mb-3 tracking-wide">Details</h3>
                    <div className="space-y-3">
                      <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
                        <h4 className="text-sm font-medium text-slate-300 mb-1">Proposed By</h4>
                        <p className="text-sm text-slate-400">{agentNames[proposal.agent]} Agent</p>
                      </div>
                      <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
                        <h4 className="text-sm font-medium text-slate-300 mb-1">Created</h4>
                        <p className="text-sm text-slate-400">{proposal.timestamp.toLocaleString()}</p>
                      </div>
                      <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
                        <h4 className="text-sm font-medium text-slate-300 mb-1">Priority</h4>
                        <p className="text-sm text-slate-400">Medium</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-6 border-t border-slate-700/30 bg-slate-800/20">
                <div className="flex justify-end space-x-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onReject(proposal.id);
                      onClose();
                    }}
                    className="px-6 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-600/30 text-red-400 rounded-lg transition-colors font-medium"
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
                    className="px-6 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-600/30 text-green-400 rounded-lg transition-colors font-medium"
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