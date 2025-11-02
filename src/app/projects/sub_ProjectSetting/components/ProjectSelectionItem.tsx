import React from 'react';
import { motion } from 'framer-motion';
import { Link, GitBranch, ExternalLink } from 'lucide-react';
import { Project } from '@/types';
import { getProjectTypeConfig, getProjectTypeLabel } from '../lib/projectUtils';

interface ProjectSelectionItemProps {
  project: Project;
  isActive: boolean;
  relatedProject: Project | null;
  connectedProjects: Project[];
  onSelect: (project: Project) => void;
}

export default function ProjectSelectionItem({
  project,
  isActive,
  relatedProject,
  connectedProjects,
  onSelect
}: ProjectSelectionItemProps) {
  const typeConfig = getProjectTypeConfig(project.type);
  const TypeIcon = typeConfig.icon;

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(project)}
      className={`relative p-5 rounded-xl border cursor-pointer transition-all duration-200 ${isActive
        ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500/40 shadow-lg shadow-cyan-500/10'
        : 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700/40 hover:border-gray-600/60 hover:bg-gray-700/30'
        }`}
    >
      {/* Active Project Indicator */}
      {isActive && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-500 rounded-full animate-pulse" />
      )}

      {/* Project Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="flex-1 min-w-0">
            <h3 className={`font-bold text-3xl truncate ${isActive ? 'text-cyan-300' : 'text-white'
              }`}>
              {project.name}
            </h3>
            <div className="flex items-center absolute right-5 top-5 space-x-2 mt-1">
              <span className={`text-sm px-2 py-0.5 rounded-md font-medium ${isActive
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : `${typeConfig.bg} ${typeConfig.color} border ${typeConfig.border}`
                }`}>
                {getProjectTypeLabel(project.type)}
              </span>
              <span className={`text-sm font-mono ${isActive ? 'text-cyan-400' : 'text-gray-300'
                }`}>
                :{project.port}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Related Project Connection */}
      {relatedProject && (
        <div className="flex items-center space-x-2 mb-3 p-2 bg-gray-700/30 rounded-md border border-gray-600/30">
          <Link className="w-3 h-3 text-blue-400 flex-shrink-0" />
          <span className="text-sm text-gray-400">Connected to:</span>
          <span className="text-sm text-blue-400 font-medium truncate">
            {relatedProject.name}
          </span>
        </div>
      )}

      {/* Connected Projects */}
      {connectedProjects.length > 0 && !relatedProject && (
        <div className="flex items-center space-x-2 mb-3 p-2 bg-green-500/10 rounded-md border border-green-500/20">
          <ExternalLink className="w-3 h-3 text-green-400 flex-shrink-0" />
          <span className="text-sm text-gray-400">
            {connectedProjects.length} connected project{connectedProjects.length > 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Git Information */}
      {project.git && (
        <div className="flex items-center space-x-2 mb-3">
          <GitBranch className="w-3 h-3 text-green-400 flex-shrink-0" />
          <span className="text-sm text-gray-500 truncate font-mono">
            {project.git.repository.split('/').pop()?.replace('.git', '')}
          </span>
          <span className="text-sm text-green-400 font-mono">
            {project.git.branch}
          </span>
        </div>
      )}

      {/* Run Script */}
      {project.runScript && (
        <div className="mt-3 pt-3 border-t border-gray-600/30">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Run:</span>
            <code className="text-sm bg-gray-700/50 px-2 py-1 rounded text-gray-300 font-mono truncate">
              {project.runScript}
            </code>
          </div>
        </div>
      )}
    </motion.div>
  );
}