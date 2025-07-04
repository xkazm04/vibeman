'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import RunnerSwitch from '@/app/runner/components/RunnerSwitch';
import RunnerAdd from './components/RunnerAdd';
import { RunnerSettings } from './components/RunnerSettings';
import { Project } from '@/types';
import { useServerProjectStore } from '@/stores/serverProjectStore';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import RunnerRightPanel from './components/RunnerRightPanel';

export default function Runner() {
  const {
    fetchStatuses
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
  const [newProject, setNewProject] = useState<Partial<Project>>({
    name: '',
    path: '',
    port: 3000,
    description: ''
  });

  const disabled = false

  useEffect(() => {
    initializeProjects();
  }, [initializeProjects]);

  // Fetch statuses periodically
  useEffect(() => {
    let isMounted = true;
    let intervalId: NodeJS.Timeout;

    const fetchWithCheck = async () => {
      if (isMounted) {
        await fetchStatuses();
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

  const handleUpdateProject = (projectId: string, updates: Partial<Project>) => {
    updateProject(projectId, updates);
  };

  const handleDeleteProject = (projectId: string) => {
    removeProject(projectId);
  };

  return (
    <>
      <div className="w-full bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 border-b border-gray-800 shadow-lg">
        {/* Main Header Bar */}
        <div className="px-6 py-3">
          <div className="flex items-center justify-between pl-10">
            {/* Left: Title and Stats */}
            <div className="mt-3">
              {disabled && (
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500 font-sans">Localhost only</span>
                </div>
              )}
              <div className={`flex overflow-hidden items-center space-x-3 overflow-x-auto pb-2
                ${disabled && 'opacity-50'}`}>
                {projects.map((project, index) => (
                  <RunnerSwitch
                    key={project.id}
                    project={project}
                    index={index}
                    disabled={disabled}
                  />
                ))}
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
    </>
  );
} 