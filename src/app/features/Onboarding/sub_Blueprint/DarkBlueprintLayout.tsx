'use client';

import { motion } from 'framer-motion';
import BlueprintBackground from './components/BlueprintBackground';
import BlueprintCornerLabels from './components/BlueprintCornerLabels';
import BlueprintColumn from './components/BlueprintColumn';
import DecisionPanel from './components/DecisionPanel';
import { BLUEPRINT_COLUMNS } from './lib/blueprintConfig';
import { useBlueprintStore } from './store/blueprintStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useDecisionQueueStore } from '@/stores/decisionQueueStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';

export default function DarkBlueprint() {
  const { startScan, updateScanProgress, completeScan, getScanStatus, getDaysAgo } = useBlueprintStore();
  const { setActiveModule, openControlPanel, closeBlueprint } = useOnboardingStore();
  const { currentDecision, addDecision } = useDecisionQueueStore();

  const handleScan = async (scanType: string) => {
    console.log(`[Blueprint] Initiating ${scanType} scan...`);

    // Structure scan - analyze project structure and show decision
    if (scanType === 'structure') {
      const { activeProject } = useActiveProjectStore.getState();
      if (!activeProject) {
        console.error('[Blueprint] No active project for structure scan');
        return;
      }

      startScan(scanType);

      try {
        // Step 1: Analyze structure via API
        const response = await fetch('/api/structure-scan/trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: activeProject.id,
            projectPath: activeProject.path,
            projectType: activeProject.type || 'nextjs',
            projectName: activeProject.name,
          }),
        });

        const result = await response.json();
        completeScan();

        if (!result.success) {
          console.error('[Blueprint] Structure scan failed:', result.error);
          return;
        }

        const violations = result.violations || [];

        if (violations.length === 0) {
          console.log('[Blueprint] No structure violations found - project structure is compliant!');
          return;
        }

        // Step 2: Add decision to queue
        console.log(`[Blueprint] Found ${violations.length} violations - adding to decision queue`);
        addDecision({
          type: 'structure-scan',
          title: 'Structure Violations Detected',
          description: `Found ${violations.length} structure violation${violations.length > 1 ? 's' : ''} in ${activeProject.name}`,
          count: violations.length,
          severity: violations.length > 10 ? 'error' : violations.length > 5 ? 'warning' : 'info',
          projectId: activeProject.id,
          projectPath: activeProject.path,
          projectType: activeProject.type || 'nextjs',
          data: { violations },

          // Accept: Save requirements
          onAccept: async () => {
            console.log('[Blueprint] User accepted - saving requirements...');
            const saveResponse = await fetch('/api/structure-scan/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                violations,
                projectPath: activeProject.path,
                projectId: activeProject.id,
              }),
            });

            const saveData = await saveResponse.json();
            if (!saveData.success) {
              throw new Error(saveData.error || 'Failed to save requirements');
            }

            console.log(`[Blueprint] ✅ Saved ${saveData.requirementFiles.length} requirement files`);
          },

          // Reject: Log rejection
          onReject: async () => {
            console.log('[Blueprint] User rejected structure scan');
            // Rejection is logged by the API in the save endpoint
          },
        });
      } catch (error) {
        completeScan();
        console.error('[Blueprint] Structure scan error:', error);
      }
      return;
    }

    // Special handling for photo scan - executes all 5 module screenshots
    if (scanType === 'photo') {
      startScan(scanType);

      try {
        const response = await fetch('/api/tester/screenshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ executeAll: true }), // Capture all 5 modules
        });

        if (!response.ok) {
          throw new Error('Screenshot failed');
        }

        const result = await response.json();
        console.log('[Blueprint] Screenshot completed:', result);
        completeScan();
      } catch (error) {
        console.error('[Blueprint] Screenshot error:', error);
        completeScan();
      }
      return;
    }

    // Start the scan for other types
    startScan(scanType);

    // Simulate progress over 5 seconds (1 second = 20%)
    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      updateScanProgress(progress);

      if (progress >= 100) {
        clearInterval(interval);
        completeScan();
      }
    }, 1000);
  };

  const handleNavigate = (module: 'ideas' | 'tinder' | 'tasker' | 'reflector') => {
    console.log(`[Blueprint] Navigating to ${module}...`);
    setActiveModule(module);
    closeBlueprint();
    openControlPanel();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="relative w-full h-full bg-gradient-to-br from-gray-950 via-blue-950/30 to-gray-950 overflow-hidden"
    >
      {/* Background elements */}
      <BlueprintBackground />

      {/* Title - Top Left Corner */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="absolute top-6 left-8"
      >
        <h1 className="text-3xl font-bold text-cyan-300/90 tracking-wider font-mono">
          PROJECT BLUEPRINT
        </h1>
      </motion.div>

      {/* Corner labels */}
      <BlueprintCornerLabels />

      {/* Decision Panel - Top Center */}
      {currentDecision && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-5xl px-8">
          <DecisionPanel />
        </div>
      )}

      {/* Main content area */}
      <div className="relative h-full min-w-[1200px] flex items-center justify-center p-20">
        {/* 4-Column Grid Layout - Increased gap from 16 to 32 (100% increase) */}
        <div className="grid grid-cols-4 min-w-[1200px] gap-16 z-10">
          {BLUEPRINT_COLUMNS.map((column, index) => (
            <BlueprintColumn
              key={column.id}
              column={column}
              delay={0.4 + index * 0.1}
              onScan={handleScan}
              onNavigate={handleNavigate}
              getScanStatus={getScanStatus}
              getDaysAgo={getDaysAgo}
            />
          ))}
        </div>

        {/* Connection lines between columns */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: -1 }}>
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(59, 130, 246, 0)" />
              <stop offset="50%" stopColor="rgba(59, 130, 246, 0.2)" />
              <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
            </linearGradient>
          </defs>
          <motion.line
            x1="25%" y1="50%" x2="50%" y2="50%"
            stroke="url(#lineGradient)"
            strokeWidth="1"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: 1 }}
          />
          <motion.line
            x1="50%" y1="50%" x2="75%" y2="50%"
            stroke="url(#lineGradient)"
            strokeWidth="1"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: 1.2 }}
          />
        </svg>
      </div>
    </motion.div>
  );
}
