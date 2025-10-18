import React from 'react';
import { motion } from 'framer-motion';
import { FolderOpen, Code, Server, Link, GitBranch, ExternalLink } from 'lucide-react';
import { Project } from '@/types';
import { useGlobalModal } from '@/hooks/useGlobalModal';

interface ProjectSelectionModalProps {
  projects: Project[];
  activeProject: Project | null;
  onProjectSelect: (project: Project) => void;
  onAddProject: () => void;
}

const getProjectTypeIcon = (type?: string) => {
  switch (type) {
    case 'nextjs':
      return { icon: Code, color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' };
    case 'fastapi':
      return { icon: Server, color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30' };
    default:
      return { icon: FolderOpen, color: 'text-gray-400', bg: 'bg-gray-500/20', border: 'border-gray-500/30' };
  }
};

const getProjectTypeLabel = (type?: string) => {
  switch (type) {
    case 'nextjs':
      return 'Next.js';
    case 'fastapi':
      return 'FastAPI';
    default:
      return 'Other';
  }
};

export default function ProjectSelectionModal({
  projects,
  activeProject,
  onProjectSelect,
  onAddProject
}: ProjectSelectionModalProps) {
  // Group projects by type for better organization
  const groupedProjects = projects.reduce((acc, project) => {
    const type = project.type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(project);
    return acc;
  }, {} as Record<string, Project[]>);

  // Find related projects
  const getRelatedProject = (projectId?: string) => {
    if (!projectId) return null;
    return projects.find(p => p.id === projectId);
  };

  const getConnectedProjects = (project: Project) => {
    // Find projects that are related to this one or that this one is related to
    const connected = projects.filter(p =>
      p.relatedProjectId === project.id || project.relatedProjectId === p.id
    );
    return connected;
  };

  return (
    <div className="space-y-6">
      {/* Project Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => {
          const typeConfig = getProjectTypeIcon(project.type);
          const TypeIcon = typeConfig.icon;
          const relatedProject = getRelatedProject(project.relatedProjectId);
          const connectedProjects = getConnectedProjects(project);
          const isActive = activeProject?.id === project.id;

          return (
            <motion.div
              key={project.id}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onProjectSelect(project)}
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
                      <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${isActive
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
                  <span className="text-xs text-gray-400">Connected to:</span>
                  <span className="text-xs text-blue-400 font-medium truncate">
                    {relatedProject.name}
                  </span>
                </div>
              )}

              {/* Connected Projects */}
              {connectedProjects.length > 0 && !relatedProject && (
                <div className="flex items-center space-x-2 mb-3 p-2 bg-green-500/10 rounded-md border border-green-500/20">
                  <ExternalLink className="w-3 h-3 text-green-400 flex-shrink-0" />
                  <span className="text-xs text-gray-400">
                    {connectedProjects.length} connected project{connectedProjects.length > 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {/* Git Information */}
              {project.git && (
                <div className="flex items-center space-x-2 mb-3">
                  <GitBranch className="w-3 h-3 text-green-400 flex-shrink-0" />
                  <span className="text-xs text-gray-500 truncate font-mono">
                    {project.git.repository.split('/').pop()?.replace('.git', '')}
                  </span>
                  <span className="text-xs text-green-400 font-mono">
                    {project.git.branch}
                  </span>
                </div>
              )}

              {/* Run Script */}
              {project.runScript && (
                <div className="mt-3 pt-3 border-t border-gray-600/30">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">Run:</span>
                    <code className="text-xs bg-gray-700/50 px-2 py-1 rounded text-gray-300 font-mono truncate">
                      {project.runScript}
                    </code>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Empty State */}
      {projects.length === 0 && (
        <div className="text-center py-12">
          <FolderOpen className="w-16 h-16 text-gray-600 mx-auto mb-6" />
          <h3 className="text-xl font-semibold text-gray-400 mb-3">No Projects Found</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Get started by adding your first project. You can create Next.js frontends, FastAPI backends, or any other type of project.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onAddProject}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/30 rounded-lg text-cyan-400 transition-all duration-300 font-medium"
          >
            Add Your First Project
          </motion.button>
        </div>
      )}

      {/* Project Type Summary */}
      {projects.length > 0 && (
        <div className="border-t border-gray-700/50 pt-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              {Object.entries(groupedProjects).map(([type, typeProjects]) => {
                const typeConfig = getProjectTypeIcon(type);
                const TypeIcon = typeConfig.icon;
                return (
                  <div key={type} className="flex items-center space-x-2">
                    <TypeIcon className={`w-4 h-4 ${typeConfig.color}`} />
                    <span className="text-gray-400">
                      {typeProjects.length} {getProjectTypeLabel(type)}
                    </span>
                  </div>
                );
              })}
            </div>
            <span className="text-gray-500">
              {projects.length} total project{projects.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}