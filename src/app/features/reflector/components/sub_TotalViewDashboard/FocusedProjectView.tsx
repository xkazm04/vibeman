'use client';

import { motion } from 'framer-motion';
import { FolderOpen } from 'lucide-react';
import { ProjectGroup } from '../../lib/groupIdeasByProjectAndContext';
import { ContextSection } from './ContextSection';

interface FocusedProjectViewProps {
  project: ProjectGroup;
  onExit: () => void;
}

export function FocusedProjectView({ project, onExit }: FocusedProjectViewProps) {
  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      data-testid={`focused-project-${project.projectId}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-purple-500/20 to-blue-500/20
                      border border-purple-500/40 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <motion.div
            className="p-3 bg-gradient-to-br from-purple-400 to-blue-400 rounded-xl"
            animate={{
              boxShadow: [
                '0 0 20px rgba(168, 85, 247, 0.5)',
                '0 0 40px rgba(168, 85, 247, 0.8)',
                '0 0 20px rgba(168, 85, 247, 0.5)',
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
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
                     text-gray-300 hover:bg-gray-800/80 transition-all"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
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
