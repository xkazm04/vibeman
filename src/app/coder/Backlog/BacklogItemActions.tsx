import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { BacklogProposal } from '../../../types';
import { CopilotTask } from '@/types/copilot';
import { useStore } from '../../../stores/nodeStore';
import { useActiveProjectStore } from '../../../stores/activeProjectStore';
import { useBacklog } from '../../../hooks/useBacklog';

interface BacklogItemActionsProps {
  proposal: BacklogProposal;
  isInProgress: boolean;
  onStartCoding: () => void;
  onReject: () => void;
}

export default function BacklogItemActions({ 
  proposal, 
  isInProgress, 
  onStartCoding, 
  onReject 
}: BacklogItemActionsProps) {
  const { highlightNodes, clearHighlights, highlightedNodes } = useStore();
  const { activeProject } = useActiveProjectStore();

  const handleStartCoding = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!activeProject) {
      console.error('No active project available');
      return;
    }

    onStartCoding();
    
    try {
      // Extract repo info from active project
      const repoUrl = activeProject.git?.repository || '';
      const repoOwner = repoUrl.includes('github.com') 
        ? repoUrl.split('/').slice(-2, -1)[0] 
        : 'unknown';

      const copilotTask: CopilotTask = {
        title: proposal.title,
        description: proposal.description,
        type: 'feature', // Default type, could be mapped from proposal
        priority: 'medium', // Default priority, could be mapped from proposal
        technicalDetails: proposal.description,
        repo_owner: repoOwner,
        repo_url: repoUrl,
      };

      const response = await fetch('/api/copilot/create-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(copilotTask),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('Copilot task created successfully:', result);
        // Keep local in-progress state - don't change it
        // The backend will update the status, and we'll sync on next fetch
      } else {
        console.error('Failed to create copilot task:', result.error);
      }
    } catch (error) {
      console.error('Error creating copilot task:', error);
    }
  };

  const handleReject = async (e: React.MouseEvent) => {
    e.stopPropagation();
    onReject();
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

  return (
    <>
      {/* Side Action Buttons - Hidden when in progress */}
      {!isInProgress && (
        <>
          <div className="absolute left-0 top-0 bottom-0 w-3 flex flex-col">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleReject}
              className="flex-1 bg-red-700/20 hover:bg-red-500/60 transition-colors rounded-tl-lg z-40 cursor-pointer"
              title="Reject" 
            />
          </div>

          <div className="absolute right-0 top-0 bottom-0 w-3 flex flex-col">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleStartCoding}
              className="flex-1 bg-green-700/20 hover:bg-green-500/60 transition-colors rounded-tr-lg z-40 cursor-pointer"
              title="Start Coding"
            />
          </div>
        </>
      )}

      {/* Bottom Highlight Button */}
      {proposal.impactedFiles && proposal.impactedFiles.length > 0 && (
        <div className="absolute bottom-0 left-3 right-3 h-4 flex items-center justify-center">
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
    </>
  );
} 