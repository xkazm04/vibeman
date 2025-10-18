import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Code, Server, FolderOpen, GitBranch, Link, ExternalLink } from 'lucide-react';
import { useProjectConfigStore } from '../../../stores/projectConfigStore';
import { useActiveProjectStore } from '../../../stores/activeProjectStore';
import { useProjectsToolbarStore } from '../../../stores/projectsToolbarStore';
import { useGlobalModal } from '../../../hooks/useGlobalModal';
import { Project } from '@/types';
import ProjectSelectionModal from './ProjectSelectionModal';

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
  const { projects, getAllProjects, syncWithServer, initializeProjects, loading } = useProjectConfigStore();
  const { activeProject, setActiveProject } = useActiveProjectStore();
  const { setShowAddProject } = useProjectsToolbarStore();
  const { showFullScreenModal, hideModal } = useGlobalModal();
  const [localProjects, setLocalProjects] = React.useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = React.useState(false);

  // Fetch projects directly from API
  const fetchProjectsDirectly = React.useCallback(async () => {
    setIsLoadingProjects(true);
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        const fetchedProjects = data.projects || [];
        setLocalProjects(fetchedProjects);

        // Also update the store to keep it in sync
        await syncWithServer();

        // Auto-select first project if no active project is set
        if (fetchedProjects.length > 0 && !activeProject) {
          setActiveProject(fetchedProjects[0]);
        }

        return fetchedProjects;
      } else {
        console.error('Failed to fetch projects: HTTP', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setIsLoadingProjects(false);
    }
    return [];
  }, [activeProject, setActiveProject, syncWithServer]);

  // Initialize projects on component mount
  React.useEffect(() => {
    fetchProjectsDirectly();
    // Also try to sync the store
    initializeProjects();
  }, [fetchProjectsDirectly, initializeProjects]);

  // Use local projects if available, fallback to store projects
  const displayProjects = localProjects.length > 0 ? localProjects : projects;

  const handleAddProject = async () => {
    // Refresh projects before showing add dialog
    await fetchProjectsDirectly();
    setShowAddProject(true);
  };

  const handleProjectTitleClick = async () => {
    // Ensure we have the latest projects before showing the modal
    const currentProjects = await fetchProjectsDirectly();

    // Always show the modal if there are projects (even if just 1, for consistency)
    if (currentProjects.length > 0) {
      showFullScreenModal(
        'Select Project',
        <ProjectSelectionModal
          projects={currentProjects}
          activeProject={activeProject}
          onProjectSelect={(project) => {
            setActiveProject(project);
            hideModal();
          }}
          onAddProject={() => {
            hideModal();
            setShowAddProject(true);
          }}
        />,
        {
          subtitle: 'Choose a project to work with',
          icon: FolderOpen,
          iconBgColor: 'from-cyan-600/20 to-blue-600/20',
          iconColor: 'text-cyan-400',
          maxWidth: 'max-w-6xl',
          maxHeight: 'max-h-[85vh]'
        }
      );
    }
  };


  // Get related project info
  const getRelatedProject = (projectId?: string) => {
    if (!projectId) return null;
    return displayProjects.find(p => p.id === projectId);
  };

  const getConnectedProjects = (project: Project) => {
    return displayProjects.filter(p =>
      p.relatedProjectId === project.id || project.relatedProjectId === p.id
    );
  };

  const relatedProject = activeProject ? getRelatedProject(activeProject.relatedProjectId) : null;
  const connectedProjects = activeProject ? getConnectedProjects(activeProject) : [];
  const typeConfig = getProjectTypeIcon(activeProject?.type);
  const TypeIcon = typeConfig.icon;

  return (
    <div className="relative flex items-center justify-between px-6 py-5 min-w-0 flex-1">
      {/* Debug info - remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-0 right-0 text-xs text-gray-500">
          Store: {projects.length} | Local: {localProjects.length} | Loading: {isLoadingProjects ? 'Yes' : 'No'}
        </div>
      )}

      {/* App-Style Project Display */}
      <motion.div
        whileHover={displayProjects.length > 0 ? { scale: 1.005 } : {}}
        whileTap={displayProjects.length > 0 ? { scale: 0.995 } : {}}
        onClick={handleProjectTitleClick}
        className={`flex items-center space-x-5 flex-1 min-w-0 ${displayProjects.length > 0
          ? 'cursor-pointer hover:opacity-80 hover:bg-cyan-500/5 transition-all duration-300 rounded-2xl p-2 -m-2'
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
                {displayProjects.length > 1 && (
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-xs text-cyan-400/60 font-mono"
                  >
                    click to switch
                  </motion.div>
                )}
              </div>

              {/* Project Details Row */}
              <div className="flex items-center space-x-4 flex-wrap">
                {/* Port Badge */}
                <span className="text-sm font-mono text-cyan-400/90 bg-cyan-500/15 px-3 py-1 rounded-lg border border-cyan-500/25 shadow-sm">
                  :{activeProject.port}
                </span>


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
                  <div className="flex items-center space-x-1.5 bg-blue-500/15 px-3 py-1 rounded-lg border border-blue-500/25">
                    <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-xs text-blue-400/90 font-medium">
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
                {isLoadingProjects ? 'Loading Projects...' : 'No Project Selected'}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {isLoadingProjects ? 'Please wait while we load your projects' : 'Add a project to get started'}
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Add Project Button */}
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