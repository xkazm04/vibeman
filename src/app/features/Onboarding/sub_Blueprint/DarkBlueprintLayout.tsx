'use client';

import { lazy, Suspense, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Workflow } from 'lucide-react';
import BlueprintBackground from './components/BlueprintBackground';
import BlueprintCornerLabels from './components/BlueprintCornerLabels';
import DecisionPanel from './components/DecisionPanel';
import BlueprintKeyboardShortcuts from './components/BlueprintKeyboardShortcuts';
import BlueprintConfigButton from './components/BlueprintConfigButton';
import BlueprintConceptSwitcher from '../sub_BlueprintRunner/BlueprintConceptSwitcher';
import { BlueprintRunnerPanel } from '../sub_BlueprintRunner';
import { VisualizationConcept } from '../sub_BlueprintRunner/types';
import ScanProgressBars from './components/ScanProgressBars';
import { TaskProgressPanel } from './components/TaskProgressPanel';
import ScanButtonsBar from './components/ScanButtonsBar';
import ScanErrorBanner from './components/ScanErrorBanner';
import { BlueprintTestPanel } from './components/BlueprintTestPanel';
import BlueprintTestCompact from './components/BlueprintTestCompact';
import ContextGroupSelector from '../sub_BlueprintContext/components/ContextGroupSelector';
import BlueprintContextSelector from '../sub_BlueprintContext/components/BlueprintContextSelector';
import ContextDependentScans from '../sub_BlueprintContext/components/ContextDependentScans';
import GoalReviewer from '../sub_GoalDrawer/GoalReviewer';
import GoalDetailPanel from '../sub_GoalDrawer/GoalDetailPanel';
import GoalAddPanel from '../sub_GoalDrawer/GoalAddPanel';
import { useBlueprintStore } from './store/blueprintStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useDecisionQueueStore } from '@/stores/decisionQueueStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useBlueprintKeyboardShortcuts } from './hooks/useBlueprintKeyboardShortcuts';
import { useBlueprintData } from './hooks/useBlueprintData';
import { useBlueprintSelection } from './hooks/useBlueprintSelection';
import { Goal } from '@/types';

// Lazy load heavy components for better initial load performance
const StepperConfigPanel = lazy(() => import('./components/StepperConfigPanel'));
const ContextOverview = lazy(() => import('../../Context/sub_ContextOverview/ContextOverview'));

// Loading fallback component
const SuspenseFallback = () => (
  <div className="flex items-center justify-center h-full">
    <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
  </div>
);

interface DarkBlueprintProps {
  isGoalReviewerOpen?: boolean;
  onCloseGoalReviewer?: () => void;
}

export default function DarkBlueprint({
  isGoalReviewerOpen = false,
  onCloseGoalReviewer
}: DarkBlueprintProps = {}) {
  const { activeProject } = useActiveProjectStore();
  const { closeBlueprint } = useOnboardingStore();
  const { currentDecision } = useDecisionQueueStore();
  const { toggleGroup } = useBlueprintStore();

  // Goal panel state - can be a Goal object (edit mode) or 'add' (add mode) or null (closed)
  const [selectedGoal, setSelectedGoal] = useState<Goal | 'add' | null>(null);

  // Blueprint Runner prototype state
  const [activeRunnerConcept, setActiveRunnerConcept] = useState<VisualizationConcept | null>(null);

  // Handler for adding new goal
  const handleAddGoal = async (newGoal: Omit<Goal, 'id' | 'order' | 'projectId'>) => {
    if (!activeProject) return;

    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newGoal,
          projectId: activeProject.id,
        }),
      });

      if (response.ok) {
        // Close the panel after successful creation
        setSelectedGoal(null);
      }
    } catch (error) {
      // Error handling could be improved here
    }
  };

  // Custom Hooks
  const { contextGroups, stepperConfig } = useBlueprintData(activeProject);

  const {
    selectedScanId,
    setSelectedScanId,
    selectedContextGroupId,
    setSelectedContextGroupId,
    selectedContextId,
    setSelectedContextId,
    selectedContext,
    setSelectedContext,
    handleSelectScan,
    handleBlueprintContextSelect,
    handlePreviewUpdated,
    selectedGroupColor,
    getScanStatusMemoized,
    getDaysAgo,
    isRecommended,
  } = useBlueprintSelection(activeProject, contextGroups, stepperConfig);

  // Keyboard shortcuts
  useBlueprintKeyboardShortcuts({
    onVisionScan: () => handleSelectScan('vision', 'vision'),
    onContextsScan: () => handleSelectScan('knowledge', 'contexts'),
    onStructureScan: () => handleSelectScan('structure', 'structure'),
    onBuildScan: () => handleSelectScan('quality', 'build'),
    onPhotoScan: () => handleSelectScan('nextjs-ui', 'photo'),
    onClose: closeBlueprint,
  });

  const handleRetryScan = (scanId: string) => {
    const scanGroupMap: Record<string, string> = {
      'vision': 'vision',
      'contexts': 'knowledge',
      'structure': 'structure',
      'build': 'quality',
      'photo': 'nextjs-ui'
    };
    const groupId = scanGroupMap[scanId];
    if (groupId) {
      handleSelectScan(groupId, scanId);
    }
  };

  const bg = "/patterns/bg_blueprint.jpg";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="relative w-full h-full bg-gray-950 overflow-hidden"
      data-testid="blueprint-layout"
    >
      {/* Dynamic Background Layer - Optimized with CSS animations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Deep Space Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-[#050a14] to-gray-950" />

        {/* Animated Mesh Gradient (CSS animations for better performance) */}
        <div
          className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-blue-900/20 blur-[120px] rounded-full animate-pulse-slow"
          style={{
            animation: 'pulse-slow 20s ease-in-out infinite',
          }}
        />
        <div
          className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-cyan-900/20 blur-[120px] rounded-full animate-pulse-slower"
          style={{
            animation: 'pulse-slower 25s ease-in-out infinite 2s',
          }}
        />

        {/* Pattern Overlay */}
        <div
          style={{
            backgroundImage: `url(${bg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.08,
            mixBlendMode: 'overlay'
          }}
          className="absolute inset-0"
        />
      </div>

      {/* Background UI Elements */}
      <BlueprintBackground />
      <BlueprintCornerLabels />
      <BlueprintKeyboardShortcuts />
      <BlueprintConfigButton />

      {/* Blueprint Runner Concept Switcher */}
      <div className="absolute top-4 right-20 z-30 flex items-center gap-2">
        <BlueprintConceptSwitcher
          activeConcept={activeRunnerConcept}
          onConceptChange={setActiveRunnerConcept}
        />
      </div>

      {/* Blueprint Runner Panel - shows when a concept is selected */}
      <AnimatePresence>
        {activeRunnerConcept && (
          <BlueprintRunnerPanel
            concept={activeRunnerConcept}
            onClose={() => setActiveRunnerConcept(null)}
          />
        )}
      </AnimatePresence>

      {/* Top UI Layer */}
      <div className="relative z-10 h-full flex flex-col pointer-events-none">
        {/* Header Area */}
        <div className="w-full h-24 pointer-events-auto">
          <ScanProgressBars />
          <ScanErrorBanner onRetry={handleRetryScan} />

          {/* Scan Buttons Bar - Centered Top */}
          {stepperConfig && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40">
              <ScanButtonsBar
                config={stepperConfig}
                selectedScanId={selectedScanId}
                onScanSelect={handleSelectScan}
                getDaysAgo={getDaysAgo}
                getScanStatus={getScanStatusMemoized}
                isRecommended={isRecommended}
              />
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 relative pointer-events-auto">

          {/* Decision Panel - Floating Top Center */}
          <AnimatePresence>
            {currentDecision && (
              <motion.div
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-5xl px-8"
              >
                <DecisionPanel />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Task Progress Panel */}
          <TaskProgressPanel />

          {/* Blueprint Test Panel */}
          <BlueprintTestPanel />

          {/* Stepper Config Panel */}
          {stepperConfig && (
            <Suspense fallback={<SuspenseFallback />}>
              <StepperConfigPanel
                groups={stepperConfig.groups}
                onToggle={toggleGroup}
              />
            </Suspense>
          )}

          {/* Context Sidebar (Left) */}
          <AnimatePresence>
            {selectedContextGroupId && (
              <motion.div
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute left-6 top-4 bottom-24 z-30 w-72"
                data-testid="blueprint-context-sidebar"
              >
                <div className="h-full bg-gray-950/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl shadow-2xl overflow-hidden">
                  <BlueprintContextSelector
                    selectedGroupId={selectedContextGroupId}
                    groupColor={selectedGroupColor}
                    selectedContextId={selectedContextId}
                    onSelectContext={handleBlueprintContextSelect}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Right Sidebar (Split) */}
          <AnimatePresence>
            {selectedContextGroupId && (
              <motion.div
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute right-6 top-4 bottom-24 z-30 w-64 flex flex-col gap-4"
                data-testid="right-sidebar-split"
              >
                {/* Upper Half - Context-Dependent Scans */}
                <div className="flex-1 bg-gray-950/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl shadow-2xl overflow-hidden">
                  <ContextDependentScans
                    selectedContextId={selectedContextId}
                    selectedScanId={selectedScanId}
                    onScanSelect={handleSelectScan}
                    getDaysAgo={getDaysAgo}
                    getScanStatus={getScanStatusMemoized}
                    isRecommended={isRecommended}
                  />
                </div>

                {/* Bottom Half - Test Results */}
                <div className="flex-1 bg-gray-950/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl shadow-2xl overflow-hidden">
                  <BlueprintTestCompact />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Context Overview - Center */}
          <AnimatePresence>
            {selectedContext && !isGoalReviewerOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="absolute top-4 left-80 right-72 bottom-24 z-40"
                data-testid="blueprint-context-preview"
              >
                <div className="w-full h-full bg-gray-950/20 backdrop-blur-sm border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                  <Suspense fallback={<SuspenseFallback />}>
                    <ContextOverview
                      mode="embedded"
                      contextData={selectedContext}
                      groupColorProp={selectedGroupColor}
                      onClose={() => {
                        setSelectedContextId(null);
                        setSelectedContext(null);
                      }}
                      onPreviewUpdated={handlePreviewUpdated}
                    />
                  </Suspense>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Goal Reviewer Panel */}
          <AnimatePresence>
            {isGoalReviewerOpen && !selectedContextGroupId && activeProject && (
              <>
                {/* Left Panel - Goal List */}
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ type: 'spring', damping: 30, stiffness: 250 }}
                  className={`absolute pl-[10%] max-w-[1000px] top-16 left-8 bottom-24 z-50 ${selectedGoal ? 'right-1/2 mr-4' : 'right-8'} transition-all duration-300`}
                  data-testid="blueprint-goal-reviewer"
                >
                  <div className="relative justify-center h-full bg-gray-900/90 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden">
                    {/* Decorative corner elements */}
                    <div className="absolute top-0 left-0 w-16 h-16 bg-gradient-to-br from-cyan-500/10 to-transparent pointer-events-none" />

                    <div className="relative h-full overflow-y-auto overflow-x-hidden">
                      <div className="relative p-8">
                        {onCloseGoalReviewer && (
                          <button
                            onClick={onCloseGoalReviewer}
                            className="absolute top-4 right-4 p-2 rounded-full bg-gray-800/50 hover:bg-gray-700/50 transition-colors z-10"
                          >
                            <X className="w-5 h-5 text-gray-400 hover:text-white" />
                          </button>
                        )}
                        <GoalReviewer
                          projectId={activeProject.id}
                          onGoalSelect={setSelectedGoal}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Right Panel - Goal Detail or Add */}
                {selectedGoal && (
                  <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 50 }}
                    transition={{ type: 'spring', damping: 30, stiffness: 250 }}
                    className="absolute top-16 right-8 bottom-24 left-1/2 ml-4 z-50"
                    data-testid={selectedGoal === 'add' ? 'blueprint-goal-add' : 'blueprint-goal-detail'}
                  >
                    <div className="relative h-full bg-gray-900/90 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden">
                      <div className="relative h-full overflow-y-auto">
                        <div className="relative p-8">
                          <button
                            onClick={() => setSelectedGoal(null)}
                            className="absolute top-4 right-4 p-2 rounded-full bg-gray-800/50 hover:bg-gray-700/50 transition-colors z-10"
                          >
                            <X className="w-5 h-5 text-gray-400 hover:text-white" />
                          </button>
                          {selectedGoal === 'add' ? (
                            <GoalAddPanel
                              projectId={activeProject.id}
                              onSubmit={handleAddGoal}
                              onClose={() => setSelectedGoal(null)}
                              projectPath={activeProject.path}
                            />
                          ) : (
                            <GoalDetailPanel
                              goal={selectedGoal}
                              projectId={activeProject.id}
                              onClose={() => setSelectedGoal(null)}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </AnimatePresence>

        </div>

        {/* Footer Area */}
        <div className="relative h-24 pointer-events-auto flex items-center justify-center">
          <ContextGroupSelector
            selectedGroupId={selectedContextGroupId}
            onSelectGroup={setSelectedContextGroupId}
          />
        </div>
      </div>
    </motion.div>
  );
}
