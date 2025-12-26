'use client';

import { lazy, Suspense, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { useBlueprintStore } from './store/blueprintStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useDecisionQueueStore } from '@/stores/decisionQueueStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useBlueprintKeyboardShortcuts } from './hooks/useBlueprintKeyboardShortcuts';
import { useBlueprintData } from './hooks/useBlueprintData';
import { useBlueprintSelection } from './hooks/useBlueprintSelection';
// Lazy load heavy components for better initial load performance
const StepperConfigPanel = lazy(() => import('./components/StepperConfigPanel'));
const ContextOverview = lazy(() => import('../../Context/sub_ContextOverview/ContextOverview'));

// Loading fallback component
const SuspenseFallback = () => (
  <div className="flex items-center justify-center h-full">
    <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
  </div>
);

export default function DarkBlueprint() {
  const { activeProject } = useActiveProjectStore();
  const { closeBlueprint } = useOnboardingStore();
  const { currentDecision } = useDecisionQueueStore();
  const { toggleGroup } = useBlueprintStore();

  // Blueprint Runner prototype state
  const [activeRunnerConcept, setActiveRunnerConcept] = useState<VisualizationConcept | null>(null);

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

        {/* Static Mesh Gradient - removed infinite animations for performance */}
        <div
          className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-blue-900/20 blur-[120px] rounded-full opacity-25"
        />
        <div
          className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-cyan-900/20 blur-[120px] rounded-full opacity-20"
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
            {selectedContext && (
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
