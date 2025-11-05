'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, Sparkles } from 'lucide-react';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { useUnifiedProjectStore } from '@/stores/unifiedProjectStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useGlobalIdeaStats } from '@/hooks/useGlobalIdeaStats';

/**
 * UnifiedProjectSelector
 *
 * Global project selector displayed in TopBar
 * Syncs selection across all app modules
 * Updates both unifiedProjectStore (for filtering) and activeProjectStore (for file operations)
 */
export default function UnifiedProjectSelector() {
  const { projects, initializeProjects } = useProjectConfigStore();
  const { selectedProjectId, setSelectedProjectId } = useUnifiedProjectStore();
  const { setActiveProject } = useActiveProjectStore();
  const { stats, loading } = useGlobalIdeaStats();

  // Initialize projects on mount
  useEffect(() => {
    initializeProjects();
  }, [initializeProjects]);

  const handleProjectSelect = (projectId: string) => {
    // Update unified store for filtering
    setSelectedProjectId(projectId);

    // Update active project store if specific project is selected
    if (projectId !== 'all') {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        setActiveProject(project);
      }
    }
  };

  return (
    <div className="w-full border-t border-white/10 bg-black/10 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between gap-6">
          {/* Left: Project Selection */}
          <div className="flex items-center space-x-3 overflow-x-hidden">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0">
              Project:
            </span>

            {/* All Projects Button */}
            <motion.button
              data-testid="unified-project-all"
              onClick={() => handleProjectSelect('all')}
              className={`relative px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                selectedProjectId === 'all'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-lg shadow-blue-500/20'
                  : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:bg-gray-800/60 hover:text-gray-300'
              }`}
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
              animate={selectedProjectId === 'all' ? {
                boxShadow: [
                  '0 0 0 0 rgba(59, 130, 246, 0)',
                  '0 0 0 4px rgba(59, 130, 246, 0.1)',
                  '0 0 0 0 rgba(59, 130, 246, 0)'
                ]
              } : {}}
              transition={{
                scale: { duration: 0.2 },
                y: { duration: 0.2 },
                boxShadow: { duration: 1.5, repeat: Infinity }
              }}
            >
              All Projects
            </motion.button>

            {/* Individual Project Buttons */}
            {projects.map((project) => (
              <motion.button
                key={project.id}
                data-testid={`unified-project-${project.id}`}
                onClick={() => handleProjectSelect(project.id)}
                className={`relative px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                  selectedProjectId === project.id
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-lg shadow-blue-500/20'
                    : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:bg-gray-800/60 hover:text-gray-300'
                }`}
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.95 }}
                animate={selectedProjectId === project.id ? {
                  boxShadow: [
                    '0 0 0 0 rgba(59, 130, 246, 0)',
                    '0 0 0 4px rgba(59, 130, 246, 0.1)',
                    '0 0 0 0 rgba(59, 130, 246, 0)'
                  ]
                } : {}}
                transition={{
                  scale: { duration: 0.2 },
                  y: { duration: 0.2 },
                  boxShadow: { duration: 1.5, repeat: Infinity }
                }}
              >
                {project.name}
              </motion.button>
            ))}
          </div>

          {/* Right: Idea Stats */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Pending */}
            <motion.div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20"
              whileHover={{ scale: 1.05 }}
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 0.3 }}
              key={`pending-${stats.pending}`}
            >
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <motion.span
                className="text-xs font-mono font-semibold text-blue-400"
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                {loading ? '...' : stats.pending}
              </motion.span>
            </motion.div>

            {/* Accepted */}
            <motion.div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20"
              whileHover={{ scale: 1.05 }}
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 0.3 }}
              key={`accepted-${stats.accepted}`}
            >
              <CheckCircle className="w-3.5 h-3.5 text-green-400" />
              <motion.span
                className="text-xs font-mono font-semibold text-green-400"
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                {loading ? '...' : stats.accepted}
              </motion.span>
            </motion.div>

            {/* Implemented */}
            <motion.div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20"
              whileHover={{ scale: 1.05 }}
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 0.3 }}
              key={`implemented-${stats.implemented}`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <motion.span
                className="text-xs font-mono font-semibold text-amber-400"
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                {loading ? '...' : stats.implemented}
              </motion.span>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
