import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Code, Server, FolderOpen, Grid3X3, GitBranch, Link, ExternalLink } from 'lucide-react';
import { useProjectConfigStore } from '../../../stores/projectConfigStore';
import { useActiveProjectStore } from '../../../stores/activeProjectStore';
import { useProjectsToolbarStore } from '../../../stores/projectsToolbarStore';
import { useGlobalModal } from '../../../hooks/useGlobalModal';
import ProjectSelectionModal from './ProjectSelectionModal';
import { Project } from '@/types';

const getProjectTypeIcon = (type?: string) => {
  switch (type) {
    case 'nextjs':
      return { icon: Code, color: 'text-blue-400', label: 'Next.js' };
    case 'fastapi':
      return { icon: Server, color: 'text-green-400', label: 'FastAPI' };
    default:
      return { icon: FolderOpen, color: 'text-gray-400', label: 'Project' };
  }
};

export default function ProjectManagement() {
  const { projects } = useProjectConfigStore();
  const { activeProject, setActiveProject } = useActiveProjectStore();
  const { setShowAddProject } = useProjectsToolbarStore();
  const { showModal, hideModal } = useGlobalModal();

  const handleAddProject = () => {
    setShowAddProject(true);
  };

  const handleProjectSelect = (project: Project) => {
    setActiveProject(project);
    hideModal();
  };

  const handleActiveProjectClick = () => {
    if (projects.length > 1) {
      showProjectSelectorModal();
    }
  };

  const showProjectSelectorModal = () => {
    const modalContent = (
      <ProjectSelectionModal
        projects={projects}
        activeProject={activeProject}
        onProjectSelect={handleProjectSelect}
        onAddProject={() => {
          hideModal();
          handleAddProject();
        }}
      />
    );

    showModal({
      title: "Select Project",
      subtitle: `Choose from ${projects.length} available projects`,
      icon: Grid3X3,
      iconBgColor: "from-cyan-500/20 to-blue-500/20",
      iconColor: "text-cyan-400",
      maxWidth: "max-w-7xl"
    }, modalContent);
  };

  // Get related project info
  const getRelatedProject = (projectId?: string) => {
    if (!projectId) return null;
    return projects.find(p => p.id === projectId);
  };

  const getConnectedProjects = (project: Project) => {
    return projects.filter(p =>
      p.relatedProjectId === project.id || project.relatedProjectId === p.id
    );
  };

  const relatedProject = activeProject ? getRelatedProject(activeProject.relatedProjectId) : null;
  const connectedProjects = activeProject ? getConnectedProjects(activeProject) : [];
  const typeConfig = getProjectTypeIcon(activeProject?.type);
  const TypeIcon = typeConfig.icon;

  return (
    <div className="relative flex items-center justify-between px-6 py-5 min-w-0 flex-1">
      {/* Enhanced App-Style Project Display */}
      <motion.div
        whileHover={projects.length > 1 ? { scale: 1.005 } : {}}
        whileTap={projects.length > 1 ? { scale: 0.995 } : {}}
        onClick={handleActiveProjectClick}
        className={`flex items-center space-x-5 flex-1 min-w-0 ${projects.length > 1
          ? 'cursor-pointer hover:opacity-80 transition-all duration-300'
          : ''
          }`}
      >
        {activeProject ? (
          <div className="flex items-center space-x-5 w-full">
            {/* Enhanced Status Indicator with Type Icon */}
            <div className="relative flex items-center space-x-3">
              <div className="relative">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 animate-pulse shadow-lg shadow-cyan-500/30" />
                <div className="absolute inset-0 w-3 h-3 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 animate-ping opacity-20" />
              </div>

              {/* Project Type Icon */}
              <div className="p-2 bg-gradient-to-br from-gray-800/60 to-gray-900/60 rounded-lg border border-gray-600/40 backdrop-blur-sm">
                <TypeIcon className={`w-5 h-5 ${typeConfig.color}`} />
              </div>
            </div>

            {/* Project Information */}
            <div className="flex-1 min-w-0">
              {/* Main Project Title */}
              <div className="flex items-center space-x-3 mb-1">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-cyan-100 to-blue-200 bg-clip-text text-transparent tracking-tight leading-tight">
                  {activeProject.name}
                </h1>
                <span className="text-lg text-gray-400 font-light">
                  {typeConfig.label}
                </span>
              </div>

              {/* Project Details Row */}
              <div className="flex items-center space-x-4 flex-wrap">
                {/* Port Badge */}
                <span className="text-sm font-mono text-cyan-400/90 bg-cyan-500/15 px-3 py-1 rounded-lg border border-cyan-500/25 shadow-sm">
                  :{activeProject.port}
                </span>

                {/* Description */}
                {activeProject.description && (
                  <span className="text-sm text-gray-400 italic truncate max-w-md">
                    {activeProject.description}
                  </span>
                )}

                {/* Git Branch */}
                {activeProject.git && (
                  <div className="flex items-center space-x-1.5 bg-green-500/15 px-3 py-1 rounded-lg border border-green-500/25">
                    <GitBranch className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-xs text-green-400/90 font-mono">
                      {activeProject.git.branch}
                    </span>
                  </div>
                )}

                {/* Related Project Connection */}
                {relatedProject && (
                  <div className="flex items-center space-x-1.5 bg-blue-500/15 px-3 py-1 rounded-lg border border-blue-500/25">
                    <Link className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-xs text-blue-400/90 font-medium">
                      → {relatedProject.name}
                    </span>
                  </div>
                )}

                {/* Connected Projects */}
                {connectedProjects.length > 0 && !relatedProject && (
                  <div className="flex items-center space-x-1.5 bg-purple-500/15 px-3 py-1 rounded-lg border border-purple-500/25">
                    <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-xs text-purple-400/90 font-medium">
                      {connectedProjects.length} connected
                    </span>
                  </div>
                )}

                {/* Run Script Hint */}
                {activeProject.runScript && (
                  <div className="hidden lg:flex items-center space-x-1.5 bg-gray-500/15 px-3 py-1 rounded-lg border border-gray-500/25">
                    <span className="text-xs text-gray-400 font-mono truncate max-w-32">
                      {activeProject.runScript}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Project Selector Hint */}
            {projects.length > 1 && (
              <div className="hidden md:flex items-center space-x-2 text-gray-500 text-sm">
                <span>Click to switch</span>
                <div className="w-1 h-1 bg-gray-500 rounded-full" />
                <span>{projects.length} projects</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center space-x-5">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 rounded-full bg-gray-600/50" />
              <div className="p-2 bg-gray-800/60 rounded-lg border border-gray-600/40">
                <FolderOpen className="w-5 h-5 text-gray-500" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-500 tracking-tight">
                No Project Selected
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Add a project to get started
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Enhanced Add Project Button */}
      <motion.button
        whileHover={{ scale: 1.05, y: -1 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleAddProject}
        className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/30 rounded-xl text-cyan-400 transition-all duration-300 group text-sm flex-shrink-0 shadow-lg shadow-cyan-500/10 backdrop-blur-sm"
        title="Add new project"
      >
        <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
        <span className="font-medium">Add Project</span>
      </motion.button>
    </div>
  );
}