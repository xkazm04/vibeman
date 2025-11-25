'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import ContextOverviewHeader, { TabType } from './components/ContextOverviewHeader';
import ContextDescription from './components/ContextDescription';
import ContextPreviewManager from '@/app/features/Context/sub_ContextPreview/ContextPreviewManager';
import AdvisorPanel from './AdvisorPanel';
import TestingTab from './components/TestingTab';

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
  const { activeProject } = useActiveProjectStore();
  const activeProjectId = activeProject?.id;
  const [activeTab, setActiveTab] = useState<TabType>('manager');
  const [currentPreview, setCurrentPreview] = useState<string | null>(null);
  const [currentTestScenario, setCurrentTestScenario] = useState<string | null>(null);
  const [currentTarget, setCurrentTarget] = useState<string | null>(null);
  const [currentTargetFulfillment, setCurrentTargetFulfillment] = useState<string | null>(null);
  const [fileContents, setFileContents] = useState<Array<{ path: string; content: string }>>([]);

  useEffect(() => {
    if (context) {
      setCurrentPreview(context.preview || null);
      setCurrentTestScenario(context.testScenario || null);
      setCurrentTarget(context.target || null);
      setCurrentTargetFulfillment(context.target_fulfillment || null);
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
        context.filePaths.slice(0, 10).map(async (filePath: string) => {
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
          }
          return null;
        })
      );

      setFileContents(contents.filter((c): c is { path: string; content: string } => c !== null));
    } catch (error) {
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
          // Update local state
          setCurrentPreview(data.context.preview || null);
          setCurrentTestScenario(data.context.testScenario || null);
          setCurrentTarget(data.context.target || null);
          setCurrentTargetFulfillment(data.context.target_fulfillment || null);
        }
      }
    } catch (error) {
    }
  };

  if (!context) return null;

  return (
    <div className="h-full bg-gradient-to-br from-gray-900/95 via-slate-900/20 to-blue-900/30 border border-gray-700/50 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl flex flex-col">
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
                }}
                onPreviewUpdate={async (previewPath) => {
                  setCurrentPreview(previewPath);
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
      </div>
    </div>
  );
};

export default ContextOverviewInline;
