import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, User, FileText } from 'lucide-react';
import { BacklogProposal } from '../../../types';
import { UniversalModal } from '../../../components/UniversalModal';
import { BacklogDescription } from './BacklogDescription';

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
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title={proposal.title}
      subtitle={`Proposed by ${agentNames[proposal.agent]} • ${proposal.timestamp.toLocaleString()}`}
      icon={FileText}
      iconBgColor="from-blue-800/60 to-blue-900/60"
      iconColor="text-blue-300"
      maxWidth="max-w-7xl"
      maxHeight="max-h-[90vh]"
    >
      <div className="flex h-full min-h-[70vh]">
        {/* Left Panel - Details */}
        <div className="w-1/2 pr-6 border-r border-slate-700/30">
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4 tracking-wide">
                Implementation Details
              </h3>
              <div className="space-y-3">
                <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
                  <div className="flex items-center space-x-2 mb-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <h4 className="text-sm font-medium text-slate-300">Proposed By</h4>
                  </div>
                  <p className="text-sm text-slate-200">{agentNames[proposal.agent]} Agent</p>
                </div>
                
                <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <h4 className="text-sm font-medium text-slate-300">Created</h4>
                  </div>
                  <p className="text-sm text-slate-200">{proposal.timestamp.toLocaleString()}</p>
                </div>
                
                <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
                  <div className="flex items-center space-x-2 mb-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <h4 className="text-sm font-medium text-slate-300">Status</h4>
                  </div>
                  <p className="text-sm text-slate-200 capitalize">{proposal.status}</p>
                </div>
              </div>
            </div>

            {/* Impacted Files */}
            {proposal.impactedFiles && proposal.impactedFiles.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-white mb-4 tracking-wide">
                  Impacted Files
                </h3>
                                 <div className="space-y-2">
                   {proposal.impactedFiles.map((file, index) => (
                     <div key={index} className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
                       <p className="text-sm text-slate-200 font-mono">{file.filepath}</p>
                       <p className="text-xs text-slate-400 mt-1 capitalize">{file.type}</p>
                     </div>
                   ))}
                 </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-700/30">
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
        </div>

        {/* Right Panel - Description */}
        <div className="w-1/2 pl-6">
          <div className="h-full">
            <h3 className="text-lg font-medium text-white mb-4 tracking-wide">
              Description
            </h3>
            <div className="h-full overflow-y-auto pr-2">
              <BacklogDescription 
                description={proposal.description}
                className="h-full"
              />
            </div>
          </div>
        </div>
      </div>
    </UniversalModal>
  );
}; 