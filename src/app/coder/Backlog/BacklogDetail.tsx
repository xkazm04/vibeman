import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, User, FileText, X, Trash2, Check, Play } from 'lucide-react';
import { BacklogProposal } from '../../../types';
import { UniversalModal } from '../../../components/UniversalModal';
import { BacklogDescription } from './BacklogDescription';

interface CoderBacklogDetailProps {
  proposal: BacklogProposal | null;
  isOpen: boolean;
  onClose: () => void;
  onAccept: (proposalId: string) => void;
  onReject: (proposalId: string) => void;
  onDelete: (proposalId: string) => void;
}

export default function BacklogDetail({
  proposal,
  isOpen,
  onClose,
  onAccept,
  onReject,
  onDelete
}: CoderBacklogDetailProps) {
  if (!proposal) return null;

  const agentNames = {
    developer: 'Developer',
    mastermind: 'Mastermind',
    tester: 'Tester',
    artist: 'Artist'
  };

  const handleRemoveFile = async (fileIndex: number) => {
    if (!proposal.impactedFiles) return;
    
    try {
      const updatedFiles = proposal.impactedFiles.filter((_, index) => index !== fileIndex);
      
      const response = await fetch('/api/backlog/update-task', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: proposal.id,
          updates: {
            impacted_files: updatedFiles
          }
        })
      });

      if (response.ok) {
        // Update the proposal locally
        proposal.impactedFiles = updatedFiles;
      } else {
        console.error('Failed to update task files');
      }
    } catch (error) {
      console.error('Error removing file:', error);
    }
  };

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title={proposal.title}
      subtitle={`${agentNames[proposal.agent]} • ${proposal.timestamp.toLocaleString()} • ${proposal.status}`}
      icon={FileText}
      iconBgColor="from-blue-800/60 to-blue-900/60"
      iconColor="text-blue-300"
      maxWidth="max-w-full"
      maxHeight="max-h-full"
      fullScreen={true}
    >
      <div className="flex flex-col h-full">
        {/* Action Buttons Header */}
        <div className="flex justify-end space-x-3 mb-6 pb-4 border-b border-slate-700/30">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              onDelete(proposal.id);
              onClose();
            }}
            className="px-4 py-2 bg-gray-600/20 hover:bg-gray-600/30 border border-gray-600/30 text-gray-400 rounded-lg transition-colors font-medium flex items-center space-x-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              onReject(proposal.id);
              onClose();
            }}
            className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-600/30 text-red-400 rounded-lg transition-colors font-medium flex items-center space-x-2"
          >
            <X className="w-4 h-4" />
            <span>Reject</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              onAccept(proposal.id);
              onClose();
            }}
            className="px-4 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-600/30 text-green-400 rounded-lg transition-colors font-medium flex items-center space-x-2"
          >
            <Play className="w-4 h-4" />
            <span>Accept & Start Coding</span>
          </motion.button>
        </div>

        {/* Main Content Grid */}
        <div className="flex-1 grid grid-cols-3 gap-6 overflow-hidden">
          {/* Left Column - Description */}
          <div className="col-span-1">
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

          {/* Middle Column - Implementation Steps */}
          <div className="col-span-1">
            <h3 className="text-lg font-medium text-white mb-4 tracking-wide">
              Implementation Steps
            </h3>
            <div className="h-full overflow-y-auto pr-2">
              {proposal.steps && proposal.steps.length > 0 ? (
                <div className="space-y-3">
                  {proposal.steps.map((step, index) => (
                    <div key={index} className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                          {index + 1}
                        </div>
                        <p className="text-sm text-slate-200 leading-relaxed">{step}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-slate-400 text-sm">No implementation steps provided</div>
              )}
            </div>
          </div>

          {/* Right Column - Impacted Files */}
          <div className="col-span-1">
            <h3 className="text-lg font-medium text-white mb-4 tracking-wide">
              Impacted Files
            </h3>
            <div className="h-full overflow-y-auto pr-2">
              {proposal.impactedFiles && proposal.impactedFiles.length > 0 ? (
                <div className="space-y-2">
                  {proposal.impactedFiles.map((file, index) => (
                    <div key={index} className="group p-3 bg-slate-800/30 rounded-lg border border-slate-700/30 hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-200 font-mono truncate" title={file.filepath}>
                            {file.filepath}
                          </p>
                          <p className="text-xs text-slate-400 mt-1 capitalize">{file.type}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveFile(index)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                          title="Remove file"
                        >
                          <X className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-slate-400 text-sm">No impacted files specified</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </UniversalModal>
  );
}; 