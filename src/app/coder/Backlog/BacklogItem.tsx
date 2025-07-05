import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { BacklogProposal } from '../../../types';
import { agentIcons, agentThemes } from '@/helpers/typeStyles'; 
import BacklogDetail from './BacklogDetail';
import { useStore } from '../../../stores/nodeStore';

interface ProposalItemProps {
  proposal: BacklogProposal;
  onAccept: (proposalId: string) => void;
  onReject: (proposalId: string) => void;
  isNew?: boolean;
}

export default function BacklogItem({ proposal, onAccept, onReject, isNew = false }: ProposalItemProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { highlightNodes, clearHighlights, highlightedNodes } = useStore();
  
  const AgentIcon = agentIcons[proposal.agent];
  const theme = agentThemes[proposal.agent];

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleHighlightFiles = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (proposal.impactedFiles && proposal.impactedFiles.length > 0) {
      // Check if any of the proposal's files are currently highlighted
      const isCurrentlyHighlighted = proposal.impactedFiles.some(fileId => 
        highlightedNodes.has(fileId)
      );
      
      if (isCurrentlyHighlighted) {
        clearHighlights();
      } else {
        highlightNodes(proposal.impactedFiles);
      }
    }
  };

  const isHighlighted = proposal.impactedFiles && 
    proposal.impactedFiles.some(fileId => highlightedNodes.has(fileId));

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <>
      <motion.div
        initial={isNew ? { opacity: 0, scale: 0.8, y: -20 } : false}
        animate={isNew ? { opacity: 1, scale: 1, y: 0 } : {}}
        transition={isNew ? { 
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
          <AgentIcon className={`w-10 h-10 ${theme.icon} transition-all duration-200 ${isHovered ? 'scale-110' : ''}`} />
        </div>

        {/* Side Action Buttons */}
        <div className="absolute left-0 top-0 bottom-0 w-3 flex flex-col">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onReject(proposal.id);
            }}
            className="flex-1 bg-red-700/20 hover:bg-red-500/60 transition-colors rounded-tl-lg z-40 cursor-pointer"
            title="Reject" 
          />
        </div>

        <div className="absolute right-0 top-0 bottom-0 w-3 flex flex-col">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onAccept(proposal.id);
            }}
            className="flex-1 bg-green-700/20 hover:bg-green-500/60 transition-colors rounded-tr-lg z-40 cursor-pointer"
            title="Accept"
          />
        </div>

        {/* Bottom Highlight Button */}
        {proposal.impactedFiles && proposal.impactedFiles.length > 0 && (
          <div className="absolute bottom-0  left-3 right-3 h-4 flex items-center justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleHighlightFiles}
              className={`flex min-w-[300px] cursor-pointer items-center space-x-2 px-3 py-1 rounded-t-lg text-xs font-medium transition-all duration-200 z-40 ${
                isHighlighted
                  ? 'bg-orange-500/30 text-orange-300 border-t border-orange-400/50'
                  : 'bg-gray-700/50 text-gray-400 hover:bg-orange-500/20 hover:text-orange-300 border-t border-gray-600/50'
              }`}
              title={isHighlighted ? "Clear highlights" : "Highlight impacted files"}
            >
              <Zap className={`w-3 h-3 ${isHighlighted ? 'text-orange-400' : 'text-gray-400'}`} />
            </motion.button>
          </div>
        )}

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
        onAccept={onAccept}
        onReject={onReject}
      />
    </>
  );
};