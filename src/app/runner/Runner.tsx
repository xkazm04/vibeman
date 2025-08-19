'use client';

import { useEffect, useState, useCallback } from 'react';
import RunnerSwitch from '@/app/runner/components/RunnerSwitch';
import { StandalonePreviewLever } from './components/StandalonePreviewLever';
import EmergencyKillModal from './components/EmergencyKillModal';
import { Project } from '@/types';
import { useServerProjectStore } from '@/stores/serverProjectStore';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import RunnerRightPanel from './components/RunnerRightPanel';
import { RefreshCcw, Skull } from 'lucide-react';

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
    intervalId = setInterval(fetchWithCheck, 50000);

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [fetchStatuses]);


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
                    key={project.id || `project-${index}`}
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
              <div className="flex absolute left-2 top-0 items-center space-x-2 mt-2">
                <button
                  onClick={() => setShowEmergencyKill(true)}
                  title="Emergency Kill"
                  className="text-xs px-2 py-1 cursor-pointer text-orange-400 border border-orange-600/10 rounded hover:bg-orange-600/30 transition-colors"
                >
                  <Skull size={16} />
                </button>
                <button
                  onClick={handleEmergencyRefresh}
                  title="Force Refresh"
                  className="text-xs px-2 py-1 cursor-pointer text-blue-400 border border-blue-600/10 rounded hover:bg-blue-600/30 transition-colors"
                >
                  <RefreshCcw size={16} />
                </button>
              </div>
            </div>

            {/* Right: Controls */}
            <RunnerRightPanel
              disabled={disabled}
            />
          </div>

        </div>

      </div>

      {/* Emergency Kill Modal */}
      <EmergencyKillModal
        isOpen={showEmergencyKill}
        onClose={() => setShowEmergencyKill(false)}
        onRefresh={handleEmergencyRefresh}
      />
    </>
  );
} 