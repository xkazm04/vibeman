'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity } from 'lucide-react';
import { ProjectOverviewItem } from '../types';
import { useProjects, useAnnette, useServerManagement, useHover, useProjectManager } from '../lib/hooks';
import ProjectList from './ProjectList';
import AnnetteResponse from './AnnetteResponse';
import ProjectManagerToggleButton from './ProjectManagerToggleButton';
import { ProposalPanel } from '../../Proposals';
import BacklogTaskInput from '../../Backlog/BacklogTaskInput';


interface ProjectManagerPanelProps {
  onAnnetteInteraction?: (project: ProjectOverviewItem, message: string) => void;
  onFreezeStateChange?: (shouldFreeze: boolean) => void;
}

const ProjectManagerPanel = React.memo(({ onAnnetteInteraction, onFreezeStateChange }: ProjectManagerPanelProps) => {
  // Custom hooks for state management
  const { projects, loading, selectedProject, handleProjectSelect } = useProjects();
  const { annetteState, handleAnnetteInteraction, dismissResponse, updateSelectedProject } = useAnnette(onAnnetteInteraction);
  const { processes, serverLoading, handleServerToggle } = useServerManagement();
  const { hoveredProject, handleProjectHover } = useHover();
  const { isExpanded, shouldFreezeComponents, togglePanel } = useProjectManager();

  // Update Annette state when project is selected
  React.useEffect(() => {
    if (selectedProject) {
      updateSelectedProject(selectedProject);
    }
  }, [selectedProject, updateSelectedProject]);

  // Notify parent about freeze state changes
  React.useEffect(() => {
    if (onFreezeStateChange) {
      onFreezeStateChange(shouldFreezeComponents);
    }
  }, [shouldFreezeComponents, onFreezeStateChange]);



  return (
    <>
      {/* Toggle Button */}
      <ProjectManagerToggleButton isExpanded={isExpanded} onToggle={togglePanel} />

      {/* Panel */}
      <AnimatePresence>
        {isExpanded && (
          <>
            {/* Backdrop - No click to close */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, x: 400 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 400 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 h-full w-[400px] z-50 bg-gradient-to-br from-gray-900/95 via-slate-900/20 to-blue-900/30 backdrop-blur-xl border-l border-gray-700/40 shadow-2xl overflow-hidden"
              onClick={(e) => {
                // Prevent clicks inside the panel from bubbling to backdrop
                e.stopPropagation();
              }}
            >
              {/* Neural Background Effects */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-slate-500/5 to-blue-500/5" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent" />

              {/* Animated Grid Pattern */}
              <motion.div
                className="absolute inset-0 opacity-5"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(99, 102, 241, 0.3) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(99, 102, 241, 0.3) 1px, transparent 1px)
                  `,
                  backgroundSize: '15px 15px'
                }}
                animate={{
                  backgroundPosition: ['0px 0px', '15px 15px'],
                }}
                transition={{
                  duration: 15,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />

              {/* Floating Neural Particles */}
              {Array.from({ length: 6 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-cyan-400/30 rounded-full"
                  style={{
                    left: `${10 + i * 15}%`,
                    top: `${20 + i * 12}%`,
                  }}
                  animate={{
                    y: [0, -30, 0],
                    x: [0, Math.random() * 20 - 10, 0],
                    opacity: [0, 1, 0],
                    scale: [0, 1.5, 0],
                  }}
                  transition={{
                    duration: 3 + Math.random() * 2,
                    repeat: Infinity,
                    delay: i * 0.5,
                    ease: "easeInOut"
                  }}
                />
              ))}

              <div className="relative h-full flex flex-col">
                {/* Close Button Header */}
                <div className="relative p-4 border-b border-gray-700/30 bg-gradient-to-r from-gray-800/30 via-slate-900/20 to-gray-800/30 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <motion.div
                        className="w-6 h-6 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg flex items-center justify-center backdrop-blur-sm border border-cyan-500/30"
                        animate={{
                          boxShadow: [
                            '0 0 0 rgba(6, 182, 212, 0)', 
                            '0 0 15px rgba(6, 182, 212, 0.3)', 
                            '0 0 0 rgba(6, 182, 212, 0)'
                          ]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Activity className="w-4 h-4 text-cyan-400" />
                      </motion.div>
                      
                      <div>
                        <motion.h3 
                          className="text-lg font-bold bg-gradient-to-r from-cyan-400 via-slate-400 to-blue-400 bg-clip-text text-transparent font-mono"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 }}
                        >
                          PROJECT MANAGER
                        </motion.h3>
                      </div>
                    </div>

                    {/* Close Button */}
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Close button clicked');
                        togglePanel();
                      }}
                      className="p-2 hover:bg-gray-700/50 rounded-xl transition-all duration-300 group relative z-10"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      title="Close Panel"
                    >
                      <X className="w-5 h-5 text-gray-400 group-hover:text-gray-300 transition-colors" />
                    </motion.button>
                  </div>
                </div>

                {/* Project List */}
                <div className="flex-1 overflow-hidden">
                  <ProjectList
                    projects={projects}
                    loading={loading}
                    selectedProject={selectedProject}
                    hoveredProject={hoveredProject}
                    annetteState={annetteState}
                    processes={processes}
                    serverLoading={serverLoading}
                    onProjectSelect={handleProjectSelect}
                    onProjectHover={handleProjectHover}
                    onServerToggle={handleServerToggle}
                    onAnnetteSpeak={handleAnnetteInteraction}
                  />
                </div>
                {/* Backlog Task Input - Center */}
                <div className="flex-1 max-w-2xl mx-8">
                  <BacklogTaskInput />
                </div>
                {/* Annette Response */}
                <AnnetteResponse
                  annetteState={annetteState}
                  onDismiss={dismissResponse}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Proposal Panel - Shows when ProjectManager is expanded */}
      <ProposalPanel isVisible={isExpanded} />
    </>
  );
});

ProjectManagerPanel.displayName = 'ProjectManagerPanel';

export default ProjectManagerPanel;