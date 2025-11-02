'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTooltipStore } from '@/stores/tooltipStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import ContextOverviewHeader, { TabType } from './components/ContextOverviewHeader';
import ContextDescription from './components/ContextDescription';
import ContextPreviewManager from '@/app/features/Context/sub_ContextPreview/ContextPreviewManager';
import AdvisorPanel from './AdvisorPanel';

const ContextOverview = () => {
  const {
    isVisible,
    context,
    groupColor,
    hideTooltip,
    updateContext
  } = useTooltipStore();

  const { activeProjectId } = useActiveProjectStore();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('manager');
  const [currentPreview, setCurrentPreview] = useState<string | null>(null);
  const [currentTestScenario, setCurrentTestScenario] = useState<string | null>(null);
  const [fileContents, setFileContents] = useState<Array<{ path: string; content: string }>>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (context) {
      setCurrentPreview(context.preview || null);
      setCurrentTestScenario(context.testScenario || null);
      // Load file contents for AI analysis
      loadFileContents();
    }
  }, [context]);

  const loadFileContents = async () => {
    if (!context?.filePaths || context.filePaths.length === 0 || !activeProjectId) {
      setFileContents([]);
      return;
    }

    try {
      const contents = await Promise.all(
        context.filePaths.slice(0, 10).map(async (filePath) => {
          try {
            const response = await fetch('/api/disk/read-file', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                filePath,
                projectId: activeProjectId
              }),
            });

            if (response.ok) {
              const data = await response.json();
              return { path: filePath, content: data.content || '' };
            }
          } catch (error) {
            console.error(`Failed to load file ${filePath}:`, error);
          }
          return null;
        })
      );

      setFileContents(contents.filter((c): c is { path: string; content: string } => c !== null));
    } catch (error) {
      console.error('Error loading file contents:', error);
      setFileContents([]);
    }
  };

  const refreshContextFromDB = async () => {
    if (!context?.id || !activeProjectId) return;

    try {
      const response = await fetch(`/api/contexts/${context.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.context) {
          // Update the tooltip store with fresh context data
          updateContext(data.context);
          // Also update local state
          setCurrentPreview(data.context.preview || null);
          setCurrentTestScenario(data.context.testScenario || null);
        }
      }
    } catch (error) {
      console.error('Failed to refresh context:', error);
    }
  };

  if (!context || !mounted) return null;

  const tooltipContent = (
    <div className="context-overview-container">
      <AnimatePresence>
        {isVisible && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-xl z-50"
              onClick={hideTooltip}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              transition={{ duration: 0.4, type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative bg-gradient-to-br from-gray-900/95 via-slate-900/20 to-blue-900/30 border border-gray-700/50 rounded-3xl shadow-2xl w-full max-h-[90vh] overflow-hidden backdrop-blur-xl">
                {/* Neural Background Effects */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-slate-500/5 to-blue-500/5" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent" />

                {/* Floating Neural Particles */}
                {Array.from({ length: 8 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 rounded-full"
                    style={{
                      backgroundColor: `${groupColor}40`,
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                    }}
                    animate={{
                      y: [0, -50, 0],
                      x: [0, Math.random() * 30 - 15, 0],
                      opacity: [0, 1, 0],
                      scale: [0, 1, 0],
                    }}
                    transition={{
                      duration: 3 + Math.random() * 3,
                      repeat: Infinity,
                      delay: Math.random() * 2,
                      ease: "easeInOut"
                    }}
                  />
                ))}

                {/* Header with Tab Switcher */}
                <ContextOverviewHeader
                  contextName={context.name}
                  groupColor={groupColor}
                  fileCount={context.filePaths?.length || 0}
                  createdAt={context.createdAt}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  onClose={hideTooltip}
                />

                {/* Content - Tab Based */}
                <div className="relative p-8 space-y-6 overflow-y-auto max-h-[calc(90vh-220px)]">
                  <AnimatePresence mode="wait">
                    {activeTab === 'manager' && (
                      <motion.div
                        key="manager"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ContextPreviewManager
                          contextId={context.id}
                          currentPreview={currentPreview}
                          currentTestScenario={currentTestScenario}
                          contextName={context.name}
                          groupColor={groupColor}
                          onPreviewUpdated={async (preview, testScenario) => {
                            setCurrentPreview(preview);
                            setCurrentTestScenario(testScenario);
                            // Refresh context from database to get persisted data
                            await refreshContextFromDB();
                          }}
                        />
                      </motion.div>
                    )}

                    {activeTab === 'docs' && (
                      <motion.div
                        key="docs"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ContextDescription
                          description={context.description || ''}
                          groupColor={groupColor}
                        />
                      </motion.div>
                    )}

                    {activeTab === 'advisors' && (
                      <motion.div
                        key="advisors"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <AdvisorPanel
                          contextDescription={context.description || ''}
                          filePaths={context.filePaths || []}
                          fileContents={fileContents}
                          groupColor={groupColor}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="relative flex items-center justify-between px-8 py-4 border-t border-gray-700/30 bg-gray-900/50">
                  <div className="text-sm text-gray-400 font-mono">
                    Last updated: {context.updatedAt ? new Date(context.updatedAt).toLocaleString() : 'Unknown'}
                  </div>

                  <motion.button
                    onClick={hideTooltip}
                    className="px-6 py-2 bg-gray-700/50 text-gray-300 hover:text-white rounded-xl transition-all font-mono border border-gray-600/50 hover:border-gray-500/50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Close
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );

  return createPortal(tooltipContent, document.body);
};

export default ContextOverview;
