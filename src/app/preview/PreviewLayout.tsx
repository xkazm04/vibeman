'use client';

import { useEffect, useState } from 'react';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useServerProjectStore } from '@/stores/serverProjectStore';
import { PreviewTab } from './components/PreviewTab';
import { PreviewContent } from './components/PreviewContent';

export default function PreviewLayout() {
  const { projects, initializeProjects } = useProjectConfigStore();
  const { activeProject, loadProjectFileStructure, showPreview } = useActiveProjectStore();
  const { processes } = useServerProjectStore();
  const [selectedTab, setSelectedTab] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [iframeErrors, setIframeErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    initializeProjects();
  }, [initializeProjects]);

  // Update selected tab when activeProject changes
  useEffect(() => {
    if (activeProject) {
      setSelectedTab(activeProject.id);
    }
  }, [activeProject]);

  const handleTabClick = (projectId: string) => {
    setSelectedTab(projectId);
    // Load the project structure when selected
    loadProjectFileStructure(projectId);
  };

  const handleClearPreview = () => {
    setSelectedTab('');
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    // Clear iframe error for active project
    if (activeProject) {
      setIframeErrors(prev => ({ ...prev, [activeProject.id]: false }));
    }
  };

  const handleIframeError = (projectId: string) => {
    setIframeErrors(prev => ({ ...prev, [projectId]: true }));
  };

  const handleIframeLoad = (projectId: string) => {
    setIframeErrors(prev => ({ ...prev, [projectId]: false }));
  };

  // Create tab project data for PreviewContent
  const activeTabProject = activeProject ? {
    project: activeProject,
    status: processes[activeProject.id] || null,
    isRunning: processes[activeProject.id]?.status === 'running' || false,
    canRender: (processes[activeProject.id]?.status === 'running' || false) && !iframeErrors[activeProject.id]
  } : undefined;

  return (
    <div className="bg-gray-950 flex flex-col">
      {/* Tab Navigation */}
      <div className="bg-gray-900/50 border-b border-gray-800 px-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex space-x-1 overflow-hidden">
              {projects.map((project) => (
                <PreviewTab
                  key={project.id}
                  project={project}
                  isActive={selectedTab === project.id}
                  onTabClick={handleTabClick}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {showPreview && activeTabProject && (
        <PreviewContent
          activeProject={activeTabProject}
          refreshKey={refreshKey}
          onRefresh={handleRefresh}
          onIframeError={handleIframeError}
          onIframeLoad={handleIframeLoad}
        />
      )}
    </div>
  );
}