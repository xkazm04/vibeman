'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, FolderOpen, Eye } from 'lucide-react';
import { ProjectGroup } from '../lib/groupIdeasByProjectAndContext';
import { ContextSection } from './ContextSection';

interface ProjectSectionProps {
  project: ProjectGroup;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onFocus: () => void;
}

export function ProjectSection({ project, index, isExpanded, onToggle, onFocus }: ProjectSectionProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="bg-gray-800/20 border border-gray-700/40 rounded-xl overflow-hidden backdrop-blur-sm"
      data-testid={`project-section-${project.projectId}`}
    >
      {/* Project Header */}
      <motion.div
        className="bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-yellow-500/10
                   border-b border-gray-700/40 px-6 py-4 cursor-pointer hover:bg-yellow-500/15
                   transition-colors"
        onClick={onToggle}
        whileHover={{ backgroundColor: 'rgba(234, 179, 8, 0.15)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <motion.div
              animate={{ rotate: isExpanded ? 0 : -90 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-5 h-5 text-yellow-400" />
            </motion.div>
            <FolderOpen className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-semibold text-yellow-300">{project.projectName}</h3>
          </div>
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-sm font-semibold">
              {project.totalIdeas} {project.totalIdeas === 1 ? 'idea' : 'ideas'}
            </span>
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                onFocus();
              }}
              className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/40
                         text-purple-300 hover:bg-purple-500/30 transition-all"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              data-testid={`focus-project-${project.projectId}`}
            >
              <Eye className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Context Groups */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-6 space-y-4">
              {project.contexts.map((context, ctxIndex) => (
                <ContextSection
                  key={context.contextId || 'uncategorized'}
                  context={context}
                  index={ctxIndex}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
