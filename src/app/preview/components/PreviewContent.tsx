import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, AlertTriangle, RefreshCw, ExternalLink, Eye } from 'lucide-react';
import { Project, ProcessInfo } from '@/types';

interface TabProject {
  project: Project;
  status: ProcessInfo | null;
  isRunning: boolean;
  canRender: boolean;
}

interface PreviewContentProps {
  activeProject: TabProject | undefined;
  refreshKey: number;
  onStartServer: (projectId: string) => void;
  onRefresh: () => void;
  onIframeError: (projectId: string) => void;
  onIframeLoad: (projectId: string) => void;
}

export const PreviewContent: React.FC<PreviewContentProps> = ({
  activeProject,
  refreshKey,
  onStartServer,
  onRefresh,
  onIframeError,
  onIframeLoad
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleIframeLoad = () => {
    setIsLoading(false);
    if (activeProject) {
      onIframeLoad(activeProject.project.id);
    }
  };

  const handleIframeError = () => {
    setIsLoading(false);
    if (activeProject) {
      onIframeError(activeProject.project.id);
    }
  };

  // TV turn-on animation variants
  const tvAnimation = {
    initial: { 
      scaleY: 0,
      scaleX: 0.1,
      opacity: 0,
      filter: 'brightness(3) contrast(2)'
    },
    animate: { 
      scaleY: 1,
      scaleX: 1,
      opacity: 1,
      filter: 'brightness(1) contrast(1)',
      transition: {
        duration: 0.8,
        ease: [0.25, 0.46, 0.45, 0.94] as any,
        scaleY: { duration: 0.3 },
        scaleX: { duration: 0.6, delay: 0.1 },
        opacity: { duration: 0.4, delay: 0.2 },
        filter: { duration: 0.5, delay: 0.3 }
      }
    },
    exit: { 
      scaleY: 0,
      opacity: 0,
      transition: { duration: 0.3 }
    }
  };

  return (
    <div className="flex-1 p-4" style={{ minHeight: '50vh' }}>
      <AnimatePresence mode="wait">
        {activeProject ? (
          <motion.div
            key={activeProject.project.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="h-full"
            style={{ minHeight: '50vh' }}
          >
            {activeProject.isRunning ? (
              <div className="h-full bg-gray-900 rounded-lg border border-gray-800 overflow-hidden relative">
                {activeProject.canRender ? (
                  <>
                    {/* Loading overlay with TV effect */}
                    <AnimatePresence>
                      {isLoading && (
                        <motion.div
                          initial={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-gray-900 flex items-center justify-center z-10"
                        >
                          <div className="text-center">
                            <motion.div
                              animate={{ 
                                scale: [1, 1.1, 1],
                                opacity: [0.5, 1, 0.5]
                              }}
                              transition={{ 
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                              className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4"
                            >
                              <Eye size={24} className="text-blue-400" />
                            </motion.div>
                            <p className="text-gray-400">Loading preview...</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Iframe with TV animation */}
                    <motion.iframe
                      key={`${activeProject.project.id}-${refreshKey}`}
                      variants={tvAnimation}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      src={`http://localhost:${activeProject.project.port}`}
                      className="w-full h-full"
                      style={{ border: 'none', minHeight: '50vh' }}
                      title={activeProject.project.name}
                      onLoad={handleIframeLoad}
                      onError={handleIframeError}
                      onLoadStart={() => setIsLoading(true)}
                    />
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center" style={{ minHeight: '50vh' }}>
                    <div className="text-center max-w-md">
                      <AlertTriangle size={48} className="text-yellow-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-100 mb-2">
                        Cannot Display Server
                      </h3>
                      <p className="text-gray-400 mb-4">
                        The server at localhost:{activeProject.project.port} cannot be rendered in an iframe. 
                        This might be due to X-Frame-Options or Content Security Policy restrictions.
                      </p>
                      <div className="flex gap-2 justify-center">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={onRefresh}
                          className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg flex items-center gap-2 hover:bg-gray-600 transition-colors"
                        >
                          <RefreshCw size={16} />
                          Try Again
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => window.open(`http://localhost:${activeProject.project.port}`, '_blank')}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
                        >
                          <ExternalLink size={16} />
                          Open in New Tab
                        </motion.button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center" style={{ minHeight: '50vh' }}>
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Play size={24} className="text-gray-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-100 mb-2">
                    Server Not Running
                  </h3>
                  <p className="text-gray-400 mb-4">
                    {activeProject.project.name} is not currently running. Start the server to preview it.
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onStartServer(activeProject.project.id)}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors mx-auto"
                  >
                    <Play size={16} />
                    Start Server
                  </motion.button>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <div className="h-full flex items-center justify-center" style={{ minHeight: '50vh' }}>
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Eye size={24} className="text-gray-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-100 mb-2">
                No Preview Selected
              </h3>
              <p className="text-gray-400">
                Select a running project tab to start previewing.
              </p>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}; 