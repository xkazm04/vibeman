import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TestTubeDiagonal } from 'lucide-react';
import { Project, ProcessInfo } from '@/types';
import { PreviewContent } from './PreviewContent';

interface TabProject {
  project: Project;
  status: ProcessInfo | null;
  isRunning: boolean;
  canRender: boolean;
}

interface PreviewContentAreaProps {
  showPreview: boolean;
  prototypeMode: boolean;
  activeTabProject: TabProject | undefined;
  runningProjects: TabProject[];
  refreshKey: number;
  onRefresh: () => void;
  onIframeError: (projectId: string) => void;
  onIframeLoad: (projectId: string) => void;
}

export const PreviewContentArea: React.FC<PreviewContentAreaProps> = ({
  showPreview,
  prototypeMode,
  activeTabProject,
  runningProjects,
  refreshKey,
  onRefresh,
  onIframeError,
  onIframeLoad
}) => {
  return (
    <AnimatePresence mode="wait">
      {showPreview && (
        <motion.div
          key={prototypeMode ? 'prototype' : 'single'}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="flex-1 min-h-0"
        >
          {prototypeMode ? (
            // Prototype Mode - Grid View
            <div className="p-4 h-full flex flex-col">
              {runningProjects.length > 0 ? (
                <div className={`grid gap-4 flex-1 min-h-0 ${
                  runningProjects.length === 1 ? 'grid-cols-1' :
                  runningProjects.length === 2 ? 'grid-cols-1 lg:grid-cols-2' :
                  'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'
                }`}>
                  {runningProjects.map((tabProject) => (
                    <motion.div
                      key={tabProject.project.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 }}
                      className="relative bg-gray-900 rounded-lg border border-gray-800 overflow-hidden flex flex-col min-h-0"
                    >
                      {/* Project Header */}
                      <div className="bg-gray-800/50 px-4 py-2 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          <span className="text-sm font-medium text-gray-300">
                            {tabProject.project.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            :{tabProject.project.port}
                          </span>
                        </div>
                        <motion.button
                          onClick={() => window.open(`http://localhost:${tabProject.project.port}`, '_blank')}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="text-gray-400 hover:text-cyan-400 transition-colors"
                          title="Open in new tab"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </motion.button>
                      </div>
                      
                      {/* Project Content - Full Height */}
                      <div className="flex-1 min-h-0">
                        <PreviewContent
                          activeProject={tabProject}
                          refreshKey={refreshKey}
                          onRefresh={onRefresh}
                          onIframeError={onIframeError}
                          onIframeLoad={onIframeLoad}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center max-w-md">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2 }}
                      className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4"
                    >
                      <TestTubeDiagonal size={24} className="text-gray-500" />
                    </motion.div>
                    <h3 className="text-lg font-semibold text-gray-100 mb-2">
                      No Running Projects
                    </h3>
                    <p className="text-gray-400">
                      Start some projects to see them in prototype mode. You can view up to 3 projects simultaneously.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Single Project View (Original behavior)
            activeTabProject && (
              <PreviewContent
                activeProject={activeTabProject}
                refreshKey={refreshKey}
                onRefresh={onRefresh}
                onIframeError={onIframeError}
                onIframeLoad={onIframeLoad}
              />
            )
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}; 