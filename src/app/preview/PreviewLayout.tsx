'use client';

import { useEffect, useState } from 'react';
import { ProcessInfo, Project } from '@/types';
import { motion } from 'framer-motion';
import { ExternalLink, X } from 'lucide-react';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { useServerProjectStore } from '@/stores/serverProjectStore';
import { PreviewTab } from './components/PreviewTab';
import { PreviewContent } from './components/PreviewContent';

interface TabProject {
  project: Project;
  status: ProcessInfo | null;
  isRunning: boolean;
  canRender: boolean;
}

export default function PreviewLayout() {
  const { projects, initializeProjects } = useProjectConfigStore();
  const { getProcess, startServer, stopServer, fetchStatuses } = useServerProjectStore();
  const [activeTab, setActiveTab] = useState<string>(''); // No default selection
  const [refreshKey, setRefreshKey] = useState(0);
  const [iframeErrors, setIframeErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    initializeProjects();
    fetchStatuses();
    const interval = setInterval(fetchStatuses, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [initializeProjects, fetchStatuses]);

  // Create tab data with status information
  const tabProjects: TabProject[] = projects.map(project => {
    const status = getProcess(project.id) || null;
    const isRunning = status?.status === 'running';
    const canRender = isRunning && !iframeErrors[project.id];
    
    return {
      project,
      status,
      isRunning,
      canRender
    };
  });

  const handleTabClick = (projectId: string) => {
    setActiveTab(projectId);
  };

  const handleClearPreview = () => {
    setActiveTab('');
  };

  const handleStartServer = async (projectId: string) => {
    try {
      await startServer(projectId);
      // Refresh statuses after a delay
      setTimeout(fetchStatuses, 2000);
    } catch (error) {
      console.error('Failed to start server:', error);
    }
  };

  const handleStopServer = async (projectId: string) => {
    try {
      await stopServer(projectId);
      // Clear iframe error state when stopping
      setIframeErrors(prev => ({ ...prev, [projectId]: false }));
    } catch (error) {
      console.error('Failed to stop server:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    // Clear iframe error for active tab
    if (activeTab) {
      setIframeErrors(prev => ({ ...prev, [activeTab]: false }));
    }
  };

  const handleIframeError = (projectId: string) => {
    setIframeErrors(prev => ({ ...prev, [projectId]: true }));
  };

  const handleIframeLoad = (projectId: string) => {
    setIframeErrors(prev => ({ ...prev, [projectId]: false }));
  };

  const activeProject = activeTab ? tabProjects.find(tp => tp.project.id === activeTab) : undefined;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Tab Navigation */}
      <div className="bg-gray-900/50 border-b border-gray-800 px-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex space-x-1 overflow-hidden">
              {tabProjects.map((tabProject) => (
                <PreviewTab
                  key={tabProject.project.id}
                  project={tabProject.project}
                  status={tabProject.status}
                  isRunning={tabProject.isRunning}
                  isActive={activeTab === tabProject.project.id}
                  onTabClick={handleTabClick}
                  onStartServer={handleStartServer}
                  onStopServer={handleStopServer}
                />
              ))}
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center gap-2 ml-4">
              {/* Clear preview button */}
              {activeTab && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleClearPreview}
                  className="p-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                  title="Clear preview"
                >
                  <X size={16} />
                </motion.button>
              )}
              
              {/* Open in new tab button */}
              {activeProject?.isRunning && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => window.open(`http://localhost:${activeProject.project.port}`, '_blank')}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink size={16} />
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <PreviewContent
        activeProject={activeProject}
        refreshKey={refreshKey}
        onStartServer={handleStartServer}
        onRefresh={handleRefresh}
        onIframeError={handleIframeError}
        onIframeLoad={handleIframeLoad}
      />
    </div>
  );
}