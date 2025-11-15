'use client';

import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import BlueprintBackground from './components/BlueprintBackground';
import BlueprintCornerLabels from './components/BlueprintCornerLabels';
import DecisionPanel from './components/DecisionPanel';
import BlueprintKeyboardShortcuts from './components/BlueprintKeyboardShortcuts';
import BlueprintConfigButton from './components/BlueprintConfigButton';
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
import { useBadgeStore } from '@/stores/badgeStore';
import { useBlueprintKeyboardShortcuts } from './hooks/useBlueprintKeyboardShortcuts';
import { executeScan } from './lib/blueprint-scan';

// Lazy load heavy components for better initial load performance
const StepperConfigPanel = lazy(() => import('./components/StepperConfigPanel'));
const ContextOverview = lazy(() => import('../../Context/sub_ContextOverview/ContextOverview'));

// Loading fallback component
const SuspenseFallback = () => (
  <div className="flex items-center justify-center h-full">
    <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
  </div>
);

export default function DarkBlueprint() {
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [selectedContextGroupId, setSelectedContextGroupId] = useState<string | null>(null);
  const [selectedContextId, setSelectedContextId] = useState<string | null>(null);
  const [selectedContext, setSelectedContext] = useState<any>(null);
  const [contextGroups, setContextGroups] = useState<any[]>([]);

  const {
    startScan,
    completeScan,
    failScan,
    getDaysAgo,
    loadScanEvents,
    stepperConfig,
    initStepperConfig,
    toggleGroup,
    getScanStatus,
    isRecommended,
    recommendedScans, // Subscribe to recommendedScans for reactivity
  } = useBlueprintStore();

  // Log when recommendedScans changes
  useEffect(() => {
    if (Object.keys(recommendedScans).length > 0) {
      console.log('[DarkBlueprintLayout] recommendedScans updated:', recommendedScans);
    }
  }, [recommendedScans]);

  const { closeBlueprint } = useOnboardingStore();
  const { currentDecision, addDecision, queue } = useDecisionQueueStore();
  const { activeProject } = useActiveProjectStore();
  const { awardBadge, earnedBadges } = useBadgeStore();

  // Initialize stepper config when active project changes
  useEffect(() => {
    if (!activeProject) return;

    const projectType = activeProject.type || 'other';
    initStepperConfig(projectType);
  }, [activeProject, initStepperConfig]);

  // Check if onboarding is complete (no more decisions and has some badges)
  useEffect(() => {
    if (!currentDecision && queue.length === 0 && earnedBadges.length >= 3) {
      // Award the completion badge
      awardBadge('blueprint-master');
    }
  }, [currentDecision, queue.length, earnedBadges.length, awardBadge]);

  // Load scan events when active project changes
  useEffect(() => {
    if (!activeProject || !stepperConfig) return;

    // Build event title map from stepper config
    const eventTitles: Record<string, string> = {};
    for (const group of stepperConfig.groups) {
      for (const technique of group.techniques) {
        if (technique.eventTitle) {
          eventTitles[technique.id] = technique.eventTitle;
        }
      }
    }

    loadScanEvents(activeProject.id, eventTitles);
  }, [activeProject, stepperConfig, loadScanEvents]);

  // Load context groups when active project changes
  useEffect(() => {
    if (!activeProject) {
      setContextGroups([]);
      return;
    }

    const loadGroups = async () => {
      try {
        const response = await fetch(`/api/context-groups?projectId=${activeProject.id}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setContextGroups(result.data);
          }
        }
      } catch (error) {
        console.error('[Blueprint] Error loading context groups:', error);
      }
    };

    loadGroups();
  }, [activeProject]);

  // Reset context selection when group changes
  useEffect(() => {
    setSelectedContextId(null);
    setSelectedContext(null);
  }, [selectedContextGroupId]);

  // Memoize event handlers to prevent unnecessary re-renders
  const handleSelectScan = useCallback((groupId: string, scanId: string) => {
    // For context-dependent scans, check if context is selected
    const contextDependentScans = ['selectors', 'photo', 'test', 'separator', 'testDesign'];
    if (contextDependentScans.includes(scanId) && !selectedContextId) {
      console.warn(`[Blueprint] Scan ${scanId} requires a context to be selected`);
      return;
    }

    // If already selected, deselect
    if (selectedScanId === scanId) {
      setSelectedScanId(null);
      return;
    }

    // Find scan label from stepper config
    let scanLabel = scanId;
    if (stepperConfig) {
      for (const group of stepperConfig.groups) {
        const technique = group.techniques.find(t => t.id === scanId);
        if (technique) {
          scanLabel = technique.label;
          break;
        }
      }
    }

    // Select the scan
    setSelectedScanId(scanId);

    // For context-dependent scans, use the already-selected context
    if (contextDependentScans.includes(scanId) && selectedContextId && selectedContext) {
      addDecision({
        type: 'pre-scan',
        title: `Execute ${scanLabel} Scan?`,
        description: `Context: "${selectedContext.name}"\n\nClick Accept to start the ${scanLabel.toLowerCase()} scan for this context.`,
        severity: 'info' as const,
        data: { scanId, contextId: selectedContextId },
        onAccept: async () => {
          setSelectedScanId(null);
          await handleScan(scanId, selectedContextId);
        },
        onReject: async () => {
          setSelectedScanId(null);
        },
      });
      return;
    }

    // For non-context scans, add standard pre-scan decision
    addDecision({
      type: 'pre-scan',
      title: `Execute ${scanLabel} Scan?`,
      description: `Click Accept to start the ${scanLabel.toLowerCase()} scan for this project.`,
      severity: 'info' as const,
      data: { scanId },
      onAccept: async () => {
        setSelectedScanId(null);
        await handleScan(scanId);
      },
      onReject: async () => {
        setSelectedScanId(null);
      },
    });
  }, [selectedContextId, selectedScanId, stepperConfig, selectedContext, addDecision]);

  const handleScan = useCallback(async (scanId: string, contextId?: string) => {
    // Use extracted scan execution logic
    await executeScan(
      scanId,
      stepperConfig,
      {
        startScan,
        completeScan,
        failScan,
        addDecision,
      },
      activeProject,
      contextId
    );

    // Reload scan events after scan completes
    if (activeProject && stepperConfig) {
      const eventTitles: Record<string, string> = {};
      for (const group of stepperConfig.groups) {
        for (const technique of group.techniques) {
          if (technique.eventTitle) {
            eventTitles[technique.id] = technique.eventTitle;
          }
        }
      }
      await loadScanEvents(activeProject.id, eventTitles);
    }
  }, [stepperConfig, startScan, completeScan, failScan, addDecision, activeProject, loadScanEvents]);

  const handleBlueprintContextSelect = useCallback((contextId: string, context: any) => {
    setSelectedContextId(contextId);
    setSelectedContext(context);
  }, []);

  const handlePreviewUpdated = useCallback(async (
    newPreview: string | null,
    testScenario: string | null,
    target?: string | null,
    targetFulfillment?: string | null
  ) => {
    if (!selectedContext || !activeProject) return;

    try {
      // Update context with new preview, test scenario, and target fields
      const response = await fetch('/api/contexts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contextId: selectedContext.id,
          updates: {
            preview: newPreview,
            testScenario: testScenario,
            testUpdated: testScenario ? new Date().toISOString() : selectedContext.testUpdated,
            target: target,
            target_fulfillment: targetFulfillment,
          },
        }),
      });

      if (response.ok) {
        // Update local state
        setSelectedContext({
          ...selectedContext,
          preview: newPreview,
          testScenario: testScenario,
          target: target,
          target_fulfillment: targetFulfillment,
        });
      }
    } catch (error) {
      console.error('[Blueprint] Error updating context preview:', error);
    }
  }, [selectedContext, activeProject]);

  // Memoize expensive computed values
  const selectedGroupColor = useMemo(() => {
    if (!selectedContextGroupId) return '#06b6d4';
    return contextGroups.find(g => g.id === selectedContextGroupId)?.color || '#06b6d4';
  }, [selectedContextGroupId, contextGroups]);

  // Memoize scan status callback to prevent unnecessary re-renders
  const getScanStatusMemoized = useCallback((techniqueId: string) => {
    const status = getScanStatus(techniqueId);
    return {
      isRunning: status.isRunning,
      progress: status.progress,
      hasError: status.hasError,
    };
  }, [getScanStatus]);

  // Keyboard shortcuts
  useBlueprintKeyboardShortcuts({
    onVisionScan: () => handleSelectScan('vision', 'vision'),
    onContextsScan: () => handleSelectScan('knowledge', 'contexts'),
    onStructureScan: () => handleSelectScan('structure', 'structure'),
    onBuildScan: () => handleSelectScan('quality', 'build'),
    onPhotoScan: () => handleSelectScan('nextjs-ui', 'photo'),
    onClose: closeBlueprint,
  });

  const bg = "/patterns/bg_blueprint.jpg";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="relative w-full h-full bg-gradient-to-br from-gray-950 via-blue-950/30 to-gray-950 overflow-hidden"
      data-testid="blueprint-layout"
    >
      {/* Background pattern with opacity */}
      <div 
        style={{ 
          backgroundImage: `url(${bg})`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center',
          opacity: 0.1
        }}
        className="absolute inset-0 pointer-events-none"
      />
      {/* Background elements */}
      <BlueprintBackground />

      {/* Corner labels */}
      <BlueprintCornerLabels />

      {/* Keyboard shortcuts help */}
      <BlueprintKeyboardShortcuts />
      
      {/* Blueprint Configuration Button */}
      <BlueprintConfigButton />

      {/* Scan Progress Bars - Top of screen */}
      <ScanProgressBars />

      {/* Scan Error Banner - Top Right */}
      <ScanErrorBanner onRetry={handleSelectScan} />


      {/* Decision Panel - Top Center */}
      {currentDecision && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-5xl px-8">
          <DecisionPanel />
        </div>
      )}

      {/* Task Progress Panel */}
      <TaskProgressPanel />

      {/* Blueprint Test Panel */}
      <BlueprintTestPanel />

      {/* Stepper Configuration Panel - Lazy loaded */}
      {stepperConfig && (
        <Suspense fallback={<SuspenseFallback />}>
          <StepperConfigPanel
            groups={stepperConfig.groups}
            onToggle={toggleGroup}
          />
        </Suspense>
      )}

      {/* Scan Buttons Bar - Top */}
      {stepperConfig && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-40">
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

      {/* Blueprint Context Selector - Left Sidebar */}
      {selectedContextGroupId && (
        <motion.div
          initial={{ opacity: 0, x: -300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -300 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="absolute left-4 top-24 bottom-24 z-30 w-64"
          data-testid="blueprint-context-sidebar"
        >
          <div className="h-full bg-gray-950/10 backdrop-blur-sm border border-cyan-500/20 rounded-xl shadow-2xl overflow-hidden">
            <BlueprintContextSelector
              selectedGroupId={selectedContextGroupId}
              groupColor={selectedGroupColor}
              selectedContextId={selectedContextId}
              onSelectContext={handleBlueprintContextSelect}
            />
          </div>
        </motion.div>
      )}

      {/* Right Sidebar - Split in half for Context Scans and Test Results */}
      {selectedContextGroupId && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="absolute right-4 top-24 bottom-24 z-30 w-48 flex flex-col gap-4"
          data-testid="right-sidebar-split"
        >
          {/* Upper Half - Context-Dependent Scans */}
          <div className="flex-1 bg-gray-950/10 backdrop-blur-sm border border-cyan-500/20 rounded-xl shadow-2xl overflow-hidden">
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
          <div className="flex-1 bg-gray-950/10 backdrop-blur-sm border border-cyan-500/20 rounded-xl shadow-2xl overflow-hidden">
            <BlueprintTestCompact />
          </div>
        </motion.div>
      )}

      {/* Context Overview - Center (with margins for both sidebars) - Lazy loaded */}
      {selectedContext && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="absolute top-24 left-72 right-56 bottom-24 z-40"
          data-testid="blueprint-context-preview"
        >
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
        </motion.div>
      )}

      {/* Context Group Selector - Bottom */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 w-full max-w-4xl px-8">
        <ContextGroupSelector
          selectedGroupId={selectedContextGroupId}
          onSelectGroup={setSelectedContextGroupId}
        />
      </div>
    </motion.div>
  );
}
