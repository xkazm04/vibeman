'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTooltipStore } from '@/stores/tooltipStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import ContextOverviewHeader, { TabType } from './components/ContextOverviewHeader';
import ContextDescription from './components/ContextDescription';
import ContextPreviewManager from '@/app/features/Context/sub_ContextPreview/ContextPreviewManager';
import TestingTab from './components/TestingTab';
import FilesTab from './components/FilesTab';

interface ContextOverviewProps {
  mode?: 'modal' | 'embedded';
  // Props for embedded mode
  contextData?: any;
  groupColorProp?: string;
  onClose?: () => void;
  onPreviewUpdated?: (newPreview: string | null, testScenario: string | null, target?: string | null, targetFulfillment?: string | null) => void;
}

const ContextOverview = ({
  mode = 'modal',
  contextData,
  groupColorProp,
  onClose: onCloseProp,
  onPreviewUpdated: onPreviewUpdatedProp,
}: ContextOverviewProps = {}) => {
  const {
    isVisible,
    context: tooltipContext,
    groupColor: tooltipGroupColor,
    hideTooltip,
    updateContext
  } = useTooltipStore();

  const { activeProject } = useActiveProjectStore();
  const activeProjectId = activeProject?.id;
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('manager');
  const [currentPreview, setCurrentPreview] = useState<string | null>(null);
  const [currentTestScenario, setCurrentTestScenario] = useState<string | null>(null);
  const [currentTarget, setCurrentTarget] = useState<string | null>(null);
  const [currentTargetFulfillment, setCurrentTargetFulfillment] = useState<string | null>(null);

  // Use embedded props or fallback to tooltip store
  const context = mode === 'embedded' ? contextData : tooltipContext;
  const groupColor = mode === 'embedded' ? (groupColorProp || '#06b6d4') : tooltipGroupColor;
  const handleClose = mode === 'embedded' ? (onCloseProp || (() => {})) : hideTooltip;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (context) {
      setCurrentPreview(context.preview || null);
      setCurrentTestScenario(context.testScenario || null);
      setCurrentTarget(context.target || null);
      setCurrentTargetFulfillment(context.target_fulfillment || null);
    }
  }, [context]);

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
          setCurrentTarget(data.context.target || null);
          setCurrentTargetFulfillment(data.context.target_fulfillment || null);
        }
      }
    } catch (error) {    }
  };

  // Ref for debounce timer and last saved value to prevent duplicate saves
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedScenarioRef = useRef<string | null>(null);

  // Save test scenario to database (debounced)
  const saveTestScenario = useCallback((testScenario: string | null) => {
    if (!context?.id) return;

    // Skip if value hasn't changed from last save
    if (lastSavedScenarioRef.current === testScenario) return;

    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce: wait 1 second after last change before saving
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch('/api/contexts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contextId: context.id,
            updates: { testScenario },
          }),
        });

        if (response.ok) {
          lastSavedScenarioRef.current = testScenario;
          // Update tooltip store with new test scenario
          updateContext({ ...context, testScenario });
        }
      } catch (error) {
        console.error('[ContextOverview] Failed to save test scenario:', error);
      }
    }, 1000);
  }, [context, updateContext]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  if (!context) return null;
  if (mode === 'modal' && !mounted) return null;

  const handlePreviewUpdate = async (preview: string | null, testScenario: string | null, target?: string | null, targetFulfillment?: string | null) => {
    setCurrentPreview(preview);
    setCurrentTestScenario(testScenario);
    setCurrentTarget(target || null);
    setCurrentTargetFulfillment(targetFulfillment || null);

    if (mode === 'embedded' && onPreviewUpdatedProp) {
      onPreviewUpdatedProp(preview, testScenario, target, targetFulfillment);
    } else {
      // Modal mode - refresh from DB
      await refreshContextFromDB();
    }
  };

  // Content component (reused for both modes)
  const contentComponent = (
    <div className="relative bg-gradient-to-br from-gray-900/95 via-slate-900/20 to-blue-900/30 border border-gray-700/50 rounded-3xl shadow-2xl w-full max-h-[90vh] overflow-hidden backdrop-blur-xl">
                {/* Neural Background Effects - Static version (removed particle animations) */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-slate-500/5 to-blue-500/5" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent" />

                {/* Header with Tab Switcher */}
                <ContextOverviewHeader
                  contextName={context.name}
                  groupColor={groupColor}
                  fileCount={context.filePaths?.length || 0}
                  createdAt={context.createdAt}
                  implementedIdeas={context.implemented_ideas || 0}
                  testScenario={context.testScenario || currentTestScenario}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  onClose={handleClose}
                  showCloseButton={true}
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
                          currentTarget={currentTarget}
                          currentTargetFulfillment={currentTargetFulfillment}
                          contextName={context.name}
                          groupColor={groupColor}
                          onPreviewUpdated={handlePreviewUpdate}
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

                    {activeTab === 'testing' && (
                      <motion.div
                        key="testing"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <TestingTab
                          contextId={context.id}
                          contextName={context.name}
                          groupColor={groupColor}
                          testScenario={currentTestScenario}
                          onTestScenarioChange={(value) => {
                            setCurrentTestScenario(value);
                            // Auto-save test scenario to database
                            saveTestScenario(value);
                          }}
                          onPreviewUpdate={(previewPath) => {
                            handlePreviewUpdate(previewPath, currentTestScenario);
                          }}
                        />
                      </motion.div>
                    )}

                    {activeTab === 'files' && (
                      <motion.div
                        key="files"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <FilesTab
                          filePaths={context.filePaths || []}
                          groupColor={groupColor}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Footer */}
                {mode === 'modal' && (
                  <div className="relative flex items-center justify-between px-8 py-4 border-t border-gray-700/30 bg-gray-900/50">
                    <div className="text-sm text-gray-400 font-mono">
                      Last updated: {context.updatedAt ? new Date(context.updatedAt).toLocaleString() : 'Unknown'}
                    </div>

                    <motion.button
                      onClick={handleClose}
                      className="px-6 py-2 bg-gray-700/50 text-gray-300 hover:text-white rounded-xl transition-all font-mono border border-gray-600/50 hover:border-gray-500/50"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Close
                    </motion.button>
                  </div>
                )}
              </div>
  );

  // Embedded mode - return content directly
  if (mode === 'embedded') {
    return contentComponent;
  }

  // Modal mode - wrap in portal with backdrop
  const modalContent = (
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
              {contentComponent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ContextOverview;
