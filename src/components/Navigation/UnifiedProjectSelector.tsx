'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, Sparkles } from 'lucide-react';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { useUnifiedProjectStore } from '@/stores/unifiedProjectStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useGlobalIdeaStats } from '@/hooks/useGlobalIdeaStats';
import { useProjectUpdatesStore } from '@/stores/projectUpdatesStore';

// Animation constants
const PULSE_ANIMATION = {
  boxShadow: [
    '0 0 0 0 rgba(59, 130, 246, 0)',
    '0 0 0 4px rgba(59, 130, 246, 0.1)',
    '0 0 0 0 rgba(59, 130, 246, 0)'
  ]
};

const PULSE_TRANSITION = {
  scale: { duration: 0.2 },
  y: { duration: 0.2 },
  boxShadow: { duration: 1.5, repeat: Infinity }
};

// Stat badge component
interface StatBadgeProps {
  icon: React.ElementType;
  value: number | string;
  color: 'blue' | 'green' | 'amber';
  loading?: boolean;
}

function StatBadge({ icon: Icon, value, color, loading }: StatBadgeProps) {
  const colors = {
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    green: 'bg-green-500/10 border-green-500/20 text-green-400',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  };

  return (
    <motion.div
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${colors[color]}`}
      whileHover={{ scale: 1.05 }}
      animate={{ scale: [1, 1.02, 1] }}
      transition={{ duration: 0.3 }}
      key={`${color}-${value}`}
    >
      <Icon className="w-3.5 h-3.5" />
      <motion.span
        className="text-xs font-mono font-semibold"
        initial={{ scale: 1.2 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        {loading ? '...' : value}
      </motion.span>
    </motion.div>
  );
}

// Project button component
interface ProjectButtonProps {
  projectId: string;
  projectName: string;
  isSelected: boolean;
  onClick: () => void;
}

function ProjectButton({ projectId, projectName, isSelected, onClick }: ProjectButtonProps) {
  return (
    <motion.button
      data-testid={`unified-project-${projectId}`}
      onClick={onClick}
      className={`relative px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
        isSelected
          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-lg shadow-blue-500/20'
          : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:bg-gray-800/60 hover:text-gray-300'
      }`}
      whileHover={{ scale: 1.05, y: -1 }}
      whileTap={{ scale: 0.95 }}
      animate={isSelected ? PULSE_ANIMATION : {}}
      transition={PULSE_TRANSITION}
    >
      {projectName}
    </motion.button>
  );
}

/**
 * UnifiedProjectSelector
 *
 * Global project selector displayed in TopBar
 * Syncs selection across all app modules
 * Updates both unifiedProjectStore (for filtering) and activeProjectStore (for file operations)
 */
export default function UnifiedProjectSelector() {
  const { projects, initializeProjects, syncWithServer } = useProjectConfigStore();
  const { selectedProjectId, setSelectedProjectId } = useUnifiedProjectStore();
  const { setActiveProject } = useActiveProjectStore();
  const { stats, loading } = useGlobalIdeaStats();
  const { updateCount, lastUpdate } = useProjectUpdatesStore();

  // Initialize projects on mount
  useEffect(() => {
    initializeProjects();
  }, [initializeProjects]);

  // Listen for project updates (add/delete) and refresh the list
  useEffect(() => {
    if (updateCount > 0 && lastUpdate) {
      syncWithServer();
      
      // If active project was deleted, reset to 'all'
      if (lastUpdate.type === 'delete' && selectedProjectId === lastUpdate.projectId) {
        setSelectedProjectId('all');
      }
    }
  }, [updateCount, lastUpdate, syncWithServer, selectedProjectId, setSelectedProjectId]);

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
            <ProjectButton
              projectId="all"
              projectName="All Projects"
              isSelected={selectedProjectId === 'all'}
              onClick={() => handleProjectSelect('all')}
            />

            {/* Individual Project Buttons - Sorted by name ASC */}
            {[...projects]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((project) => (
                <ProjectButton
                  key={project.id}
                  projectId={project.id}
                  projectName={project.name}
                  isSelected={selectedProjectId === project.id}
                  onClick={() => handleProjectSelect(project.id)}
                />
              ))}
          </div>

          {/* Right: Idea Stats */}
          <div className="flex items-center gap-2 shrink-0">
            <StatBadge icon={Clock} value={stats.pending} color="blue" loading={loading} />
            <StatBadge icon={CheckCircle} value={stats.accepted} color="green" loading={loading} />
            <StatBadge icon={Sparkles} value={stats.implemented} color="amber" loading={loading} />
          </div>
        </div>
      </div>
    </div>
  );
}
