import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, User, FileText, X, Trash2, Check, Play, Clock, Code, Layers, Zap, Sparkles } from 'lucide-react';
import { BacklogProposal } from '../../../types';
import { BacklogDescription } from './BacklogDescription';
import { agentIcons, agentThemes } from '@/helpers/typeStyles';

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
  const [mounted, setMounted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!proposal || !mounted) return null;

  // Debug logging to check proposal data
  console.log('BacklogDetail - Proposal data:', {
    id: proposal.id,
    title: proposal.title,
    steps: proposal.steps,
    hasSteps: !!proposal.steps,
    stepsLength: proposal.steps?.length || 0
  });

  const agentNames = {
    developer: 'Developer',
    mastermind: 'Mastermind',
    tester: 'Tester',
    artist: 'Artist'
  };

  const AgentIcon = agentIcons[proposal.agent];
  const theme = agentThemes[proposal.agent];

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

  const handleAction = async (action: 'accept' | 'reject' | 'delete') => {
    setIsProcessing(true);

    try {
      switch (action) {
        case 'accept':
          await onAccept(proposal.id);
          break;
        case 'reject':
          await onReject(proposal.id);
          break;
        case 'delete':
          await onDelete(proposal.id);
          break;
      }
      onClose();
    } catch (error) {
      console.error(`Failed to ${action} proposal:`, error);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            style={{ zIndex: 999998 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-4 bg-gradient-to-br from-gray-900/98 via-gray-800/98 to-gray-900/98 rounded-3xl shadow-2xl backdrop-blur-xl border border-gray-700/50 overflow-hidden"
            style={{ zIndex: 999999 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-blue-500/5 to-cyan-500/5" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent" />

            {/* Header */}
            <div className="relative flex items-center justify-between p-8 border-b border-gray-700/30">
              <div className="flex items-center space-x-6">
                {/* Agent Icon */}
                <div className="relative">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center backdrop-blur-sm"
                    style={{
                      backgroundColor: `${theme.bg.includes('purple') ? '#8B5CF6' : theme.bg.includes('blue') ? '#3B82F6' : theme.bg.includes('green') ? '#10B981' : '#F59E0B'}20`,
                      border: `1px solid ${theme.bg.includes('purple') ? '#8B5CF6' : theme.bg.includes('blue') ? '#3B82F6' : theme.bg.includes('green') ? '#10B981' : '#F59E0B'}30`
                    }}
                  >
                    <AgentIcon className="w-8 h-8 text-white" />
                  </div>
                  <motion.div
                    className="absolute -inset-2 rounded-2xl opacity-50"
                    style={{
                      background: `linear-gradient(45deg, ${theme.bg.includes('purple') ? '#8B5CF6' : theme.bg.includes('blue') ? '#3B82F6' : theme.bg.includes('green') ? '#10B981' : '#F59E0B'}30, transparent, ${theme.bg.includes('purple') ? '#8B5CF6' : theme.bg.includes('blue') ? '#3B82F6' : theme.bg.includes('green') ? '#10B981' : '#F59E0B'}30)`,
                      filter: 'blur(12px)',
                    }}
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>

                {/* Title and Meta */}
                <div>
                  <h1 className="text-3xl font-bold text-white font-mono mb-2">
                    {proposal.title}
                  </h1>
                  <div className="flex items-center space-x-4 text-sm text-gray-400 font-mono">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4" />
                      <span>{agentNames[proposal.agent]}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span>{formatDate(proposal.timestamp)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: proposal.status === 'pending' ? '#F59E0B' :
                            proposal.status === 'in_progress' ? '#3B82F6' :
                              proposal.status === 'accepted' ? '#10B981' : '#EF4444'
                        }}
                      />
                      <span className="capitalize">{proposal.status}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <motion.button
                onClick={onClose}
                className="p-3 hover:bg-gray-700/50 rounded-xl transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <X className="w-6 h-6 text-gray-400 hover:text-white transition-colors" />
              </motion.button>
            </div>

            {/* Content */}
            <div className="relative flex-1 overflow-hidden">
              <div className="grid grid-cols-12 gap-8 p-8 h-full">
                {/* Left Column - Description (40%) */}
                <div className="col-span-5 flex flex-col">
                  <div className="flex items-center space-x-3 mb-6">
                    <FileText className="w-5 h-5 text-blue-400" />
                    <h2 className="text-xl font-bold text-white font-mono">Description</h2>
                  </div>
                  <div className="flex-1 overflow-y-auto pr-4">
                    <BacklogDescription
                      description={proposal.description}
                      className="text-gray-300 leading-relaxed"
                    />
                  </div>
                </div>

                {/* Middle Column - Implementation Steps (35%) */}
                <div className="col-span-4 flex flex-col">
                  <div className="flex items-center space-x-3 mb-6">
                    <Layers className="w-5 h-5 text-purple-400" />
                    <h2 className="text-xl font-bold text-white font-mono">Implementation</h2>
                  </div>
                  <div className="flex-1 overflow-y-auto pr-4">
                    {proposal.steps && proposal.steps.length > 0 ? (
                      <div className="space-y-4">
                        {proposal.steps.map((step, index) => (
                          <motion.div
                            key={index}
                            className="relative p-4 bg-gradient-to-r from-gray-800/40 to-gray-900/40 rounded-2xl border border-gray-700/30 hover:border-gray-600/50 transition-all duration-300"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <div className="flex items-start space-x-4">
                              <div className="w-8 h-8 bg-gradient-to-br from-purple-500/20 to-blue-500/20 text-purple-400 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 border border-purple-500/30">
                                {index + 1}
                              </div>
                              <p className="text-sm text-gray-200 leading-relaxed font-mono">{step}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                        <Code className="w-12 h-12 mb-3 opacity-50" />
                        <p className="text-sm font-mono">No implementation steps provided</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column - Files & Actions (25%) */}
                <div className="col-span-3 flex flex-col">
                  <div className="flex items-center space-x-3 mb-6">
                    <Zap className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-xl font-bold text-white font-mono">Files</h2>
                  </div>

                  {/* Files List */}
                  <div className="flex-1 overflow-y-auto pr-4 mb-6">
                    {proposal.impactedFiles && proposal.impactedFiles.length > 0 ? (
                      <div className="space-y-3">
                        {proposal.impactedFiles.map((file, index) => (
                          <motion.div
                            key={index}
                            className="group relative p-3 bg-gradient-to-r from-gray-800/40 to-gray-900/40 rounded-xl border border-gray-700/30 hover:border-gray-600/50 transition-all duration-300"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-200 font-mono truncate mb-1" title={file.filepath}>
                                  {file.filepath.split('/').pop()}
                                </p>
                                <p className="text-xs text-gray-500 capitalize">{file.type}</p>
                              </div>
                              <motion.button
                                onClick={() => handleRemoveFile(index)}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded-lg transition-all"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                title="Remove file"
                              >
                                <X className="w-3 h-3 text-red-400" />
                              </motion.button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                        <FileText className="w-12 h-12 mb-3 opacity-50" />
                        <p className="text-xs font-mono text-center">No files specified</p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <motion.button
                      onClick={() => handleAction('accept')}
                      disabled={isProcessing}
                      className="w-full px-4 py-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 border border-green-500/30 text-green-400 rounded-xl transition-all font-mono font-medium flex items-center justify-center space-x-2 disabled:opacity-50"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Play className="w-4 h-4" />
                      <span>Accept & Start</span>
                    </motion.button>

                    <div className="grid grid-cols-2 gap-3">
                      <motion.button
                        onClick={() => handleAction('reject')}
                        disabled={isProcessing}
                        className="px-3 py-2 bg-gradient-to-r from-red-500/20 to-red-600/20 hover:from-red-500/30 hover:to-red-600/30 border border-red-500/30 text-red-400 rounded-xl transition-all font-mono text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <X className="w-3 h-3" />
                        <span>Reject</span>
                      </motion.button>

                      <motion.button
                        onClick={() => handleAction('delete')}
                        disabled={isProcessing}
                        className="px-3 py-2 bg-gradient-to-r from-gray-600/20 to-gray-700/20 hover:from-gray-600/30 hover:to-gray-700/30 border border-gray-600/30 text-gray-400 rounded-xl transition-all font-mono text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : null;
}; 