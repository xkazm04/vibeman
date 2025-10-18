'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Book, Code, GitBranch, Mic, Loader2 } from 'lucide-react';
import { ProjectOverviewItem, AnnetteState } from '../types';

interface ProjectActionPanelProps {
  project: ProjectOverviewItem;
  isHovered: boolean;
  isSelected: boolean;
  annetteState: AnnetteState;
  onAnnetteSpeak: (project: ProjectOverviewItem) => void;
}

const ProjectActionPanel = React.memo(({
  project,
  isHovered,
  isSelected,
  annetteState,
  onAnnetteSpeak
}: ProjectActionPanelProps) => {
  const isAnnetteProcessing = annetteState.selectedProject?.id === project.id && annetteState.isProcessing;

  return (
    <div className="flex items-center space-x-1 ml-2">
      {/* Compact Action Buttons - Only show on hover or selection */}
      <AnimatePresence>
        {(isHovered || isSelected) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center space-x-1"
          >
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-1 bg-blue-500/20 hover:bg-blue-500/30 rounded transition-colors"
              title="Documentation"
            >
              <Book className="w-3 h-3 text-blue-400" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-1 bg-green-500/20 hover:bg-green-500/30 rounded transition-colors"
              title="Code Analysis"
            >
              <Code className="w-3 h-3 text-green-400" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-1 bg-blue-500/20 hover:bg-blue-500/30 rounded transition-colors"
              title="Git Status"
            >
              <GitBranch className="w-3 h-3 text-blue-400" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Annette Speak Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={(e) => {
          e.stopPropagation();
          onAnnetteSpeak(project);
        }}
        disabled={annetteState.isProcessing}
        className={`
          relative p-1.5 rounded-lg transition-all duration-200
          ${isAnnetteProcessing
            ? 'bg-yellow-500/20 border border-yellow-500/30'
            : 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30'
          }
        `}
        title="Ask Annette"
      >
        <motion.div
          animate={{
            rotate: isAnnetteProcessing ? 360 : 0
          }}
          transition={{ 
            duration: 2, 
            repeat: isAnnetteProcessing ? Infinity : 0, 
            ease: "linear" 
          }}
        >
          {isAnnetteProcessing ? (
            <Loader2 className="w-3 h-3 text-yellow-400" />
          ) : (
            <Mic className="w-3 h-3 text-indigo-400" />
          )}
        </motion.div>
      </motion.button>
    </div>
  );
});

ProjectActionPanel.displayName = 'ProjectActionPanel';

export default ProjectActionPanel;