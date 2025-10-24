import React from 'react';
import { motion } from 'framer-motion';
import { Plus, FolderOpen, Pencil } from 'lucide-react';
import { useProjectConfigStore } from '../../../stores/projectConfigStore';
import { useActiveProjectStore } from '../../../stores/activeProjectStore';
import { useProjectsToolbarStore } from '../../../stores/projectsToolbarStore';
import { useGlobalModal } from '../../../hooks/useGlobalModal';
import { Project } from '@/types';
import ProjectSelectionModal from './ProjectSelectionModal';
import { getProjectTypeIcon, getRelatedProject, getConnectedProjects } from './lib/projectUtils';
import { fetchProjectsDirectly as fetchProjectsApi } from './lib/projectApi';
import ProjectActions from './components/ProjectActions';



export default function ProjectManagement() {
  const { projects, syncWithServer, initializeProjects } = useProjectConfigStore();
  const { activeProject, setActiveProject } = useActiveProjectStore();
  const { setShowAddProject, showEditProject, setShowEditProject } = useProjectsToolbarStore();
  const { showFullScreenModal, hideModal } = useGlobalModal();
  const [isLoadingProjects, setIsLoadingProjects] = React.useState(false);
  const fetchInProgressRef = React.useRef(false);

  // Fetch projects directly from API (debounced to prevent multiple calls)
  const fetchProjects = React.useCallback(async () => {
    // Prevent concurrent fetches
    if (fetchInProgressRef.current) {
      console.log('[ProjectManagement] Fetch already in progress, skipping');
      return projects;
    }

    fetchInProgressRef.current = true;
    setIsLoadingProjects(true);

    try {
      // Use store's sync method instead of direct API call
      await syncWithServer();

      // Auto-select first project if no active project is set
      const updatedProjects = useProjectConfigStore.getState().projects;
      if (updatedProjects.length > 0 && !activeProject) {
        setActiveProject(updatedProjects[0]);
      }

      return updatedProjects;
    } catch (error) {
      console.error('[ProjectManagement] Failed to fetch projects:', error);
    } finally {
      setIsLoadingProjects(false);
      fetchInProgressRef.current = false;
    }
    return [];
  }, [activeProject, setActiveProject, syncWithServer, projects]);

  // Initialize projects on component mount (only once)
  React.useEffect(() => {
    const initialize = async () => {
      // Only initialize if we don't have projects
      if (projects.length === 0) {
        await initializeProjects();
      }
    };
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Use store projects directly (no need for local state)
  const displayProjects = projects;

  const handleAddProject = () => {
    // No need to refresh - store already has latest data
    setShowAddProject(true);
  };

  const handleEditProject = () => {
    if (activeProject) {
      setShowEditProject(true);
    }
  };

  const handleProjectTitleClick = () => {
    // Use store projects directly (no need to fetch)
    const currentProjects = displayProjects;

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


  // Get related project info using utility functions
  const relatedProject = activeProject ? getRelatedProject(displayProjects, activeProject.relatedProjectId) : null;
  const connectedProjects = activeProject ? getConnectedProjects(displayProjects, activeProject) : [];

  const typeConfig = getProjectTypeIcon(activeProject?.type);
  const TypeIcon = typeConfig.icon;

  return (
    <div className="relative flex items-center justify-between px-6 py-5 min-w-0 flex-1">
      {/* Debug info - remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-0 right-0 text-xs text-gray-500">
          Projects: {projects.length} | Loading: {isLoadingProjects ? 'Yes' : 'No'}
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
            <ProjectActions
              activeProject={activeProject}
              relatedProject={relatedProject}
              connectedProjects={connectedProjects}
              displayProjects={displayProjects}
              onProjectTitleClick={handleProjectTitleClick}
            />
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

      {/* Action Buttons */}
      <div className="flex items-center space-x-2 flex-shrink-0">
        {/* Edit Active Project Button */}
        <motion.button
          whileHover={{ scale: 1.05, y: -1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleEditProject}
          disabled={!activeProject}
          className={`p-2.5 rounded-xl transition-all duration-300 ${
            activeProject
              ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 hover:from-blue-500/30 hover:to-indigo-500/30 border border-blue-500/30 text-blue-400 shadow-lg shadow-blue-500/10'
              : 'bg-gray-800/40 border border-gray-700/30 text-gray-600 cursor-not-allowed'
          } backdrop-blur-sm`}
          title={activeProject ? 'Edit active project' : 'No project selected'}
        >
          <Pencil className="w-4 h-4" />
        </motion.button>

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
    </div>
  );
}