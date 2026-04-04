'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { transition } from '@/lib/motion';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import ContextOverviewHeader, { TabType } from './components/ContextOverviewHeader';
import ContextDescription from './components/ContextDescription';
import ContextPreviewManager from '@/app/features/Context/sub_ContextPreview/ContextPreviewManager';

interface ContextOverviewInlineProps {
  context: any;
  groupColor: string;
  onClose?: () => void;
}

/**
 * Inline version of ContextOverview for use in DarkBlueprintLayout
 * Does not render as modal portal, but as inline component
 */
const ContextOverviewInline = ({ context, groupColor, onClose }: ContextOverviewInlineProps) => {
  const { activeProject } = useClientProjectStore();
  const activeProjectId = activeProject?.id;
  const [activeTab, setActiveTab] = useState<TabType>('manager');
  const [currentPreview, setCurrentPreview] = useState<string | null>(null);
  const [currentTestScenario, setCurrentTestScenario] = useState<string | null>(null);
  const [currentTarget, setCurrentTarget] = useState<string | null>(null);
  const [currentTargetFulfillment, setCurrentTargetFulfillment] = useState<string | null>(null);

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
          // Update local state
          setCurrentPreview(data.context.preview || null);
          setCurrentTestScenario(data.context.testScenario || null);
          setCurrentTarget(data.context.target || null);
          setCurrentTargetFulfillment(data.context.target_fulfillment || null);
        }
      }
    } catch (error) {
      console.error('[ContextOverviewInline] Failed to refresh context from DB:', error);
    }
  };


  if (!context) return null;

  return (
    <div className="h-full bg-gradient-to-br from-gray-900/95 via-slate-900/20 to-blue-900/30 border border-gray-700/50 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl flex flex-col">
      {/* Neural Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-slate-500/5 to-blue-500/5" />
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent" />


      {/* Header with Tab Switcher */}
      <ContextOverviewHeader
        contextName={context.name}
        groupColor={groupColor}
        fileCount={context.filePaths?.length || 0}
        createdAt={context.createdAt}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onClose={onClose}
        showCloseButton={!!onClose}
      />

      {/* Content - Tab Based */}
      <div className="relative flex-1 p-8 space-y-6 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'manager' && (
            <motion.div
              key="manager"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={transition.normal}
            >
              <ContextPreviewManager
                contextId={context.id}
                currentPreview={currentPreview}
                currentTestScenario={currentTestScenario}
                currentTarget={currentTarget}
                currentTargetFulfillment={currentTargetFulfillment}
                contextName={context.name}
                groupColor={groupColor}
                onPreviewUpdated={async (preview, testScenario, target, targetFulfillment) => {
                  setCurrentPreview(preview);
                  setCurrentTestScenario(testScenario);
                  setCurrentTarget(target || null);
                  setCurrentTargetFulfillment(targetFulfillment || null);
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
              transition={transition.normal}
            >
              <ContextDescription
                description={context.description || ''}
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
      </div>
    </div>
  );
};

export default ContextOverviewInline;
