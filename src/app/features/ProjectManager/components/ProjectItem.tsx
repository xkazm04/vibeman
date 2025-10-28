'use client';

import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { ProjectOverviewItem, AnnetteState } from '../types';
import { calculateUptime } from '../lib/projectApi';
import { getServerStatus } from '../lib/serverApi';
import ProjectActionPanel from './ProjectActionPanel';
import ServerStatusLever from './ServerStatusLever';

interface ProjectItemProps {
  project: ProjectOverviewItem;
  index: number;
  selectedProject: ProjectOverviewItem | null;
  hoveredProject: string | null;
  annetteState: AnnetteState;
  processes: Record<string, any>;
  serverLoading: Record<string, boolean>;
  onProjectSelect: (project: ProjectOverviewItem) => void;
  onProjectHover: (projectId: string | null) => void;
  onServerToggle: (projectId: string) => void;
  onAnnetteSpeak: (project: ProjectOverviewItem) => void;
}

const ProjectItem = React.memo(({
  project,
  index,
  selectedProject,
  hoveredProject,
  annetteState,
  processes,
  serverLoading,
  onProjectSelect,
  onProjectHover,
  onServerToggle,
  onAnnetteSpeak
}: ProjectItemProps) => {
  const isSelected = selectedProject?.id === project.id;
  const isHovered = hoveredProject === project.id;
  const serverStatus = getServerStatus(project.id, processes, serverLoading);

  const handleProjectClick = useCallback(() => {
    onProjectSelect(project);
  }, [project, onProjectSelect]);

  const handleServerToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onServerToggle(project.id);
  }, [project.id, onServerToggle]);

  const handleAnnetteSpeak = useCallback((proj: ProjectOverviewItem) => {
    onAnnetteSpeak(proj);
  }, [onAnnetteSpeak]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onHoverStart={() => onProjectHover(project.id)}
      onHoverEnd={() => onProjectHover(null)}
      onClick={handleProjectClick}
      className={`
        relative group cursor-pointer rounded-2xl mb-3 border transition-all duration-300 backdrop-blur-sm
        ${isSelected
          ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-500/30 shadow-lg shadow-cyan-500/20'
          : 'bg-gray-800/30 border-gray-700/50 hover:bg-gray-700/30 hover:border-gray-600/50'
        }
      `}
    >
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {/* Server Status Lever */}
          <ServerStatusLever
            serverStatus={serverStatus}
            onToggle={handleServerToggle}
          />

          <div className="flex-1 min-w-0">
            <h5 className="text-sm text-white font-medium truncate font-mono">
              {project.name}
            </h5>
            <div className="flex items-center space-x-2 text-sm text-gray-400 font-mono">
              <span>:{project.port}</span>
              {serverStatus.isRunning && serverStatus.status?.startTime && (
                <span>• {calculateUptime(serverStatus.status.startTime)}s</span>
              )}
            </div>
          </div>
        </div>

        <ProjectActionPanel
          project={project}
          isHovered={isHovered}
          isSelected={isSelected}
          annetteState={annetteState}
          onAnnetteSpeak={handleAnnetteSpeak}
        />
      </div>
    </motion.div>
  );
});

ProjectItem.displayName = 'ProjectItem';

export default ProjectItem;