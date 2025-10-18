'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useServerProjectStore } from '@/stores/serverProjectStore';
import { PreviewTabNavigation } from './components/PreviewTabNavigation';
import { PreviewContentArea } from './components/PreviewContentArea';

export default function PreviewLayout() {
  const { projects, initializeProjects } = useProjectConfigStore();
  const { activeProject, loadProjectFileStructure, showPreview } = useActiveProjectStore();
  const { processes } = useServerProjectStore();
  const [selectedTab, setSelectedTab] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [iframeErrors, setIframeErrors] = useState<Record<string, boolean>>({});
  const [prototypeMode, setPrototypeMode] = useState(false);

  useEffect(() => {
    initializeProjects();
  }, [initializeProjects]);

  // Update selected tab when activeProject changes
  useEffect(() => {
    if (activeProject && !prototypeMode) {
      setSelectedTab(activeProject.id);
    }
  }, [activeProject, prototypeMode]);

  const handleTabClick = (projectId: string) => {
    if (!prototypeMode) {
      setSelectedTab(projectId);
      // Load the project structure when selected
      loadProjectFileStructure(projectId);
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    // Clear iframe errors for all projects in prototype mode, or just active project
    if (prototypeMode) {
      setIframeErrors({});
    } else if (activeProject) {
      setIframeErrors(prev => ({ ...prev, [activeProject.id]: false }));
    }
  };

  const handleIframeError = (projectId: string) => {
    setIframeErrors(prev => ({ ...prev, [projectId]: true }));
  };

  const handleIframeLoad = (projectId: string) => {
    setIframeErrors(prev => ({ ...prev, [projectId]: false }));
  };

  const togglePrototypeMode = () => {
    setPrototypeMode(prev => !prev);
    // When entering prototype mode, clear selected tab
    if (!prototypeMode) {
      setSelectedTab('');
    }
  };

  // Get running projects for prototype mode
  const getRunningProjects = () => {
    return projects.filter(project => {
      const process = processes[project.id];
      return process?.status === 'running';
    }).map(project => ({
      project,
      status: processes[project.id],
      isRunning: true,
      canRender: !iframeErrors[project.id]
    }));
  };

  // Create tab project data for single project view
  const activeTabProject = activeProject ? {
    project: activeProject,
    status: processes[activeProject.id] || null,
    isRunning: processes[activeProject.id]?.status === 'running' || false,
    canRender: (processes[activeProject.id]?.status === 'running' || false) && !iframeErrors[activeProject.id]
  } : undefined;

  const runningProjects = getRunningProjects();

  return (
    <motion.div 
      className={`bg-gray-950 flex flex-col ${
        prototypeMode ? 'relative' : ''
      }`}
      animate={prototypeMode ? {
        boxShadow: [
          '0 0 0 0 rgba(168, 85, 247, 0)',
          '0 0 20px 5px rgba(168, 85, 247, 0.3)',
          '0 0 40px 10px rgba(236, 72, 153, 0.2)',
          '0 0 20px 5px rgba(168, 85, 247, 0.3)',
          '0 0 0 0 rgba(168, 85, 247, 0)'
        ]
      } : {
        boxShadow: '0 0 0 0 rgba(168, 85, 247, 0)'
      }}
      transition={{
        duration: 3,
        repeat: prototypeMode ? Infinity : 0,
        ease: "easeInOut"
      }}
    >
      {/* Prototype Mode Glow Border */}
      {prototypeMode && (
        <motion.div
          className="absolute inset-0 rounded-lg pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            background: 'linear-gradient(45deg, rgba(168, 85, 247, 0.1), rgba(236, 72, 153, 0.1), rgba(168, 85, 247, 0.1))',
            backgroundSize: '400% 400%',
            animation: 'gradientShift 4s ease infinite'
          }}
        />
      )}

      {/* Tab Navigation */}
      <PreviewTabNavigation
        projects={projects}
        selectedTab={selectedTab}
        prototypeMode={prototypeMode}
        onTabClick={handleTabClick}
        onTogglePrototypeMode={togglePrototypeMode}
      />

      {/* Content Area */}
      <PreviewContentArea
        showPreview={showPreview}
        prototypeMode={prototypeMode}
        activeTabProject={activeTabProject}
        runningProjects={runningProjects}
        refreshKey={refreshKey}
        onRefresh={handleRefresh}
        onIframeError={handleIframeError}
        onIframeLoad={handleIframeLoad}
      />
      
      {/* Global Styles for Gradient Animation */}
      <style jsx global>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </motion.div>
  );
}