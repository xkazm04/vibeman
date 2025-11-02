import React from 'react';
import { motion } from 'framer-motion';
import { FolderOpen } from 'lucide-react';
import { Project } from '@/types';
import { getProjectTypeConfig, getProjectTypeLabel } from '../lib/projectUtils';
import { getRelatedProject, getConnectedProjects } from '../lib/projectUtils';
import ProjectSelectionItem from './ProjectSelectionItem';

interface ProjectSelectionModalProps {
  projects: Project[];
  activeProject: Project | null;
  onProjectSelect: (project: Project) => void;
  onAddProject: () => void;
}



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



  return (
    <div className="space-y-6">
      {/* Project Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => {
          const relatedProject = getRelatedProject(projects, project.relatedProjectId);
          const connectedProjects = getConnectedProjects(projects, project);
          const isActive = activeProject?.id === project.id;

          return (
            <ProjectSelectionItem
              key={project.id}
              project={project}
              isActive={isActive}
              relatedProject={relatedProject}
              connectedProjects={connectedProjects}
              onSelect={onProjectSelect}
            />
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
                const typeConfig = getProjectTypeConfig(type);
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