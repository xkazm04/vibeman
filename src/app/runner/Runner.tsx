'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import RunnerSwitch from '@/app/runner/components/RunnerSwitch';
import RunnerAdd from './components/RunnerAdd';
import { RunnerSettings } from './components/RunnerSettings';
import { StandalonePreviewLever } from './components/StandalonePreviewLever';
import { EmergencyKillModal } from './components/EmergencyKillModal';
import { Project } from '@/types';
import { useServerProjectStore } from '@/stores/serverProjectStore';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import RunnerRightPanel from './components/RunnerRightPanel';

export default function Runner() {
  const {
    fetchStatuses,
    forceRefresh
  } = useServerProjectStore();
  
  const {
    projects,
    updateProject,
    removeProject,
    addProject,
    initializeProjects
  } = useProjectConfigStore();

  const [showAddProject, setShowAddProject] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEmergencyKill, setShowEmergencyKill] = useState(false);
  const [newProject, setNewProject] = useState<Partial<Project>>({
    name: '',
    path: '',
    port: 3000,
    description: ''
  });

  const disabled = false

  useEffect(() => {
    const initProjects = async () => {
      try {
        await initializeProjects();
        console.log('Runner: Projects initialized, current projects:', projects.map(p => ({ id: p.id, name: p.name, port: p.port })));
      } catch (error) {
        console.error('Runner: Failed to initialize projects:', error);
      }
    };
    
    initProjects();
  }, [initializeProjects]);

  // Fetch statuses periodically
  useEffect(() => {
    let isMounted = true;
    let intervalId: NodeJS.Timeout;

    const fetchWithCheck = async () => {
      if (isMounted) {
        console.log('Runner: Fetching statuses...');
        await fetchStatuses();
        console.log('Runner: Statuses fetched');
      }
    };

    fetchWithCheck();
    intervalId = setInterval(fetchWithCheck, 5000);

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [fetchStatuses]);

  const handleUpdateProject = async (projectId: string, updates: Partial<Project>) => {
    try {
      await updateProject(projectId, updates);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update project');
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await removeProject(projectId);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete project');
    }
  };

  const handleEmergencyRefresh = async () => {
    try {
      await forceRefresh();
      await initializeProjects();
    } catch (error) {
      console.error('Emergency refresh failed:', error);
    }
  };

  return (
    <>
      <div className="w-full bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 border-b border-gray-800 shadow-lg">
        {/* Main Header Bar */}
        <div className="px-6 py-3">
          <div className="flex items-center justify-between pl-10">
            {/* Left: Title and Stats */}
            <div className="p-3">
              {disabled && (
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500 font-sans">Localhost only</span>
                </div>
              )}
              <div className={`flex overflow-hidden items-center space-x-3 pb-2
                ${disabled && 'opacity-50'}`}>
                {projects.map((project, index) => (
                  <RunnerSwitch
                    key={project.id}
                    project={project}
                    index={index}
                    disabled={disabled}
                  />
                ))}
                
                {/* Standalone Preview Lever with spacing */}
                <div className="ml-6 border-l border-gray-700 pl-6">
                  <StandalonePreviewLever />
                </div>
              </div>
              
              {/* Emergency actions */}
              <div className="flex items-center space-x-2 mt-2">
                <button
                  onClick={() => setShowEmergencyKill(true)}
                  className="text-xs px-2 py-1 bg-orange-600/20 text-orange-400 border border-orange-600/30 rounded hover:bg-orange-600/30 transition-colors"
                >
                  Emergency Kill
                </button>
                <button
                  onClick={handleEmergencyRefresh}
                  className="text-xs px-2 py-1 bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded hover:bg-blue-600/30 transition-colors"
                >
                  Force Refresh
                </button>
              </div>
            </div>

            {/* Right: Controls */}
            <RunnerRightPanel
              disabled={disabled}
              showSettings={showSettings}
              setShowSettings={setShowSettings}
              showAddProject={showAddProject}
              setShowAddProject={setShowAddProject}
            />
          </div>

        </div>

        {/* Add Project Form */}
        <AnimatePresence>
          {showAddProject && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-gray-800 bg-gray-900/50"
            >
              <div className="px-6 py-4">
                <RunnerAdd
                  showAddProject={showAddProject}
                  setShowAddProject={setShowAddProject}
                  newProject={newProject}
                  setNewProject={setNewProject}
                  addProject={addProject}
                  projects={projects}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Settings Modal */}
      <RunnerSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        projects={projects}
        onUpdateProject={handleUpdateProject}
        onDeleteProject={handleDeleteProject}
      />

      {/* Emergency Kill Modal */}
      <EmergencyKillModal
        isOpen={showEmergencyKill}
        onClose={() => setShowEmergencyKill(false)}
        onRefresh={handleEmergencyRefresh}
      />
    </>
  );
} 