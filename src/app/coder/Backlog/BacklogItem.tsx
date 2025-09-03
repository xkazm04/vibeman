import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PropagateLoader } from 'react-spinners';
import { BacklogProposal } from '../../../types';
import { agentIcons, agentThemes } from '@/helpers/typeStyles'; 
import BacklogDetail from './BacklogDetail';
import BacklogItemActions from './BacklogItemActions';
import { useBacklog } from '../../../hooks/useBacklog';
import { useActiveProjectStore } from '../../../stores/activeProjectStore';

interface ProposalItemProps {
  proposal: BacklogProposal;
  isNew?: boolean;
  onAccept?: (taskId: string) => void;
  onReject?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
}

export default function BacklogItem({ proposal, isNew = false, onAccept, onReject, onDelete }: ProposalItemProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isInProgress, setIsInProgress] = useState(proposal.status === 'in_progress');
  const [isRejected, setIsRejected] = useState(false);
  const { activeProject } = useActiveProjectStore();
  const { moveToInProgress, rejectProposal } = useBacklog(activeProject?.id || null);
  
  const AgentIcon = agentIcons[proposal.agent];
  const theme = agentThemes[proposal.agent];

  // Sync local state with proposal status, but don't override local in-progress state
  useEffect(() => {
    if (proposal.status === 'in_progress') {
      setIsInProgress(true);
    } else if (proposal.status === 'accepted' || proposal.status === 'rejected') {
      setIsInProgress(false);
    }
  }, [proposal.status]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleStartCoding = async () => {
    setIsInProgress(true);
    try {
      await moveToInProgress(proposal.id);
      if (onAccept) {
        onAccept(proposal.id);
      }
    } catch (error) {
      console.error('Failed to start coding:', error);
      setIsInProgress(false);
    }
  };

  const handleReject = async () => {
    setIsRejected(true);
    try {
      // Wait for animation to complete before calling API
      setTimeout(async () => {
        await rejectProposal(proposal.id);
        if (onReject) {
          onReject(proposal.id);
        }
      }, 300);
    } catch (error) {
      console.error('Failed to reject proposal:', error);
      setIsRejected(false);
    }
  };

  const handleDelete = async () => {
    if (onDelete) {
      try {
        await onDelete(proposal.id);
      } catch (error) {
        console.error('Failed to delete proposal:', error);
      }
    }
  };

  return (
    <>
      <motion.div
        initial={isNew ? { opacity: 0, scale: 0.8, y: -20 } : false}
        animate={isRejected ? { opacity: 0, scale: 0.8, y: -20 } : isNew ? { opacity: 1, scale: 1, y: 0 } : {}}
        transition={isRejected ? { 
          duration: 0.3,
          ease: "easeInOut"
        } : isNew ? { 
          type: "spring", 
          damping: 20, 
          stiffness: 300,
          delay: 0.1
        } : {}}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        className={`relative rounded-lg border transition-all duration-200 overflow-hidden ${theme.bg} ${theme.hoverBg} hover:shadow-lg ${
          isNew ? 'ring-2 ring-purple-500/50 shadow-lg shadow-purple-500/25' : ''
        }`}
      >
        {/* Background Icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {isInProgress ? (
            <div className="w-10 h-10 flex items-center justify-center">
              <PropagateLoader color="#fb923c" size={8} speedMultiplier={0.8} />
            </div>
          ) : (
            <AgentIcon className={`w-10 h-10 ${theme.icon} transition-all duration-200 ${isHovered ? 'scale-110' : ''}`} />
          )}
        </div>

        {/* Action Buttons */}
        <BacklogItemActions
          proposal={proposal}
          isInProgress={isInProgress}
          onStartCoding={handleStartCoding}
          onReject={handleReject}
        />

        {/* Main Content */}
        <div 
          className={`flex flex-col p-4 pl-5 pr-5 cursor-pointer relative z-10 ${
            proposal.impactedFiles && proposal.impactedFiles.length > 0 ? 'pb-10' : ''
          }`}
          onClick={handleOpenModal}
        >
          {/* Title Row */}
          <div className="flex items-start justify-between w-full mb-2">
            <h4 className="text-white font-medium text-sm flex-1 pr-12 leading-relaxed">
              {proposal.title}
            </h4>
          </div>

          {/* Description Preview */}
          <p className="text-gray-300 text-xs leading-relaxed mb-1 pr-12 line-clamp-2">
            {proposal.description}
          </p>
        </div>

        {/* Hover Indicator */}
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none"
          />
        )}
      </motion.div>

      {/* Modal */}
      <BacklogDetail
        proposal={proposal}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onAccept={handleStartCoding}
        onReject={handleReject}
        onDelete={handleDelete}
      />
    </>
  );
};