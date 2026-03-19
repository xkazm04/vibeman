'use client';

import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { FolderOpen } from 'lucide-react';
import { ProjectGroup } from '../lib/groupIdeasByProjectAndContext';
import { ContextSection } from './ContextSection';

interface FocusedProjectViewProps {
  project: ProjectGroup;
  onExit: () => void;
}

export function FocusedProjectView({ project, onExit }: FocusedProjectViewProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className="space-y-6"
      initial={reducedMotion ? false : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
      data-testid={`focused-project-${project.projectId}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-purple-500/20 to-blue-500/20
                      border border-purple-500/40 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <motion.div
            className="p-3 bg-gradient-to-br from-purple-400 to-blue-400 rounded-xl"
            whileHover={reducedMotion ? undefined : {
              boxShadow: '0 0 30px rgba(168, 85, 247, 0.7)',
            }}
          >
            <FolderOpen className="w-8 h-8 text-white" />
          </motion.div>
          <div>
            <h2 className="text-2xl font-bold text-purple-300">{project.projectName}</h2>
            <p className="text-sm text-gray-400">
              {project.totalIdeas} ideas • {project.contexts.length} contexts
            </p>
          </div>
        </div>
        <motion.button
          onClick={onExit}
          className="px-4 py-2 bg-gray-800/60 border border-gray-700/40 rounded-lg
                     text-gray-300 hover:bg-gray-800/80 transition-all outline-none focus-visible:ring-2 focus-visible:ring-yellow-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          whileHover={reducedMotion ? undefined : { scale: 1.05 }}
          whileTap={reducedMotion ? undefined : { scale: 0.95 }}
          data-testid="exit-focus-btn"
        >
          Exit Focus
        </motion.button>
      </div>

      {/* Contexts */}
      <div className="space-y-4">
        {project.contexts.map((context, index) => (
          <ContextSection
            key={context.contextId || 'uncategorized'}
            context={context}
            index={index}
          />
        ))}
      </div>
    </motion.div>
  );
}
