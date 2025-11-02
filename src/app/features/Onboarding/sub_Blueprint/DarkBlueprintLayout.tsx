'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import BlueprintBackground from './components/BlueprintBackground';
import BlueprintCornerLabels from './components/BlueprintCornerLabels';
import BlueprintColumn from './components/BlueprintColumn';
import DecisionPanel from './components/DecisionPanel';
import BlueprintKeyboardShortcuts from './components/BlueprintKeyboardShortcuts';
import { useBlueprintStore } from './store/blueprintStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useDecisionQueueStore } from '@/stores/decisionQueueStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useBlueprintKeyboardShortcuts } from './hooks/useBlueprintKeyboardShortcuts';

export default function DarkBlueprint() {
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const { startScan, updateScanProgress, completeScan, failScan, getScanStatus, getDaysAgo, loadScanEvents, columns } = useBlueprintStore();
  const { setActiveModule, openControlPanel, closeBlueprint } = useOnboardingStore();
  const { currentDecision, addDecision } = useDecisionQueueStore();
  const { activeProject } = useActiveProjectStore();

  // Load scan events when active project changes
  useEffect(() => {
    if (!activeProject) return;

    // Build event title map from config
    const eventTitles: Record<string, string> = {};
    for (const column of columns) {
      for (const button of column.buttons) {
        if (button.eventTitle) {
          eventTitles[button.id] = button.eventTitle;
        }
      }
    }

    loadScanEvents(activeProject.id, eventTitles);
  }, [activeProject, loadScanEvents, columns]);

  const handleSelectScan = (scanId: string) => {
    // If already selected, deselect
    if (selectedScanId === scanId) {
      setSelectedScanId(null);
      return;
    }

    // Find button config
    let buttonConfig = null;
    let buttonLabel = scanId;
    for (const column of columns) {
      const button = column.buttons.find(b => b.id === scanId);
      if (button) {
        buttonConfig = button;
        buttonLabel = button.label;
        break;
      }
    }

    if (!buttonConfig) {
      console.error(`[Blueprint] No button config found for: ${scanId}`);
      return;
    }

    // Select the scan
    setSelectedScanId(scanId);

    // Add pre-scan decision to queue
    addDecision({
      type: 'pre-scan',
      title: `Execute ${buttonLabel} Scan?`,
      description: `Click Accept to start the ${buttonLabel.toLowerCase()} scan for this project.`,
      severity: 'info',
      data: { scanId },
      onAccept: async () => {
        console.log(`[Blueprint] User confirmed ${scanId} scan`);
        setSelectedScanId(null); // Clear selection
        await handleScan(scanId); // Execute scan
      },
      onReject: async () => {
        console.log(`[Blueprint] User cancelled ${scanId} scan`);
        setSelectedScanId(null); // Clear selection
      },
    });
  };

  const handleScan = async (scanId: string) => {
    console.log(`[Blueprint] Initiating ${scanId} scan...`);

    // Find button config by scanning all columns
    let buttonConfig = null;
    for (const column of columns) {
      const button = column.buttons.find(b => b.id === scanId);
      if (button) {
        buttonConfig = button;
        break;
      }
    }

    if (!buttonConfig) {
      console.error(`[Blueprint] No button config found for scan: ${scanId}`);
      return;
    }

    // Check if scan handler is defined
    if (!buttonConfig.scanHandler) {
      console.warn(`[Blueprint] Scan handler not implemented for: ${scanId}`);
      return;
    }

    // Start scan
    startScan(scanId);

    try {
      // Execute scan
      const result = await buttonConfig.scanHandler.execute();

      // Handle failure
      if (!result.success) {
        const errorMsg = result.error || 'Scan failed';
        console.error(`[Blueprint] ${scanId} scan failed:`, errorMsg);
        failScan(errorMsg);
        return;
      }

      // Mark as complete
      completeScan();

      // Create event for successful scan
      if (buttonConfig.eventTitle && activeProject) {
        await createScanEvent(buttonConfig.eventTitle, scanId);
      }

      // Build decision data
      const decisionData = buttonConfig.scanHandler.buildDecision(result);

      // If decision data exists, add to queue
      if (decisionData) {
        console.log(`[Blueprint] Adding decision to queue for ${scanId}`);
        addDecision(decisionData);
      } else {
        console.log(`[Blueprint] ${scanId} scan completed - no decision needed`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Blueprint] ${scanId} scan error:`, error);
      failScan(errorMsg);
    }
  };

  const createScanEvent = async (eventTitle: string, scanId: string) => {
    if (!activeProject) return;

    try {
      console.log(`[Blueprint] Creating event: ${eventTitle}`);

      const response = await fetch('/api/blueprint/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: activeProject.id,
          title: eventTitle,
          description: `Scan completed successfully`,
          type: 'success',
          agent: 'blueprint',
          message: `${scanId} scan executed via Blueprint`,
        }),
      });

      if (!response.ok) {
        console.error('[Blueprint] Failed to create event');
        return;
      }

      const result = await response.json();

      if (result.success) {
        console.log(`[Blueprint] ✅ Event created: ${eventTitle}`);

        // Reload scan events to update days ago
        const eventTitles: Record<string, string> = {};
        for (const column of columns) {
          for (const button of column.buttons) {
            if (button.eventTitle) {
              eventTitles[button.id] = button.eventTitle;
            }
          }
        }
        await loadScanEvents(activeProject.id, eventTitles);
      }
    } catch (error) {
      console.error('[Blueprint] Error creating event:', error);
    }
  };

  const handleNavigate = (module: 'ideas' | 'tinder' | 'tasker' | 'reflector') => {
    console.log(`[Blueprint] Navigating to ${module}...`);
    setActiveModule(module);
    closeBlueprint();
    openControlPanel();
  };

  // Keyboard shortcuts
  useBlueprintKeyboardShortcuts({
    onVisionScan: () => handleSelectScan('vision'),
    onContextsScan: () => handleSelectScan('contexts'),
    onStructureScan: () => handleSelectScan('structure'),
    onBuildScan: () => handleSelectScan('build'),
    onPhotoScan: () => handleSelectScan('photo'),
    onClose: closeBlueprint,
  });

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

      {/* Corner labels */}
      <BlueprintCornerLabels />

      {/* Keyboard shortcuts help */}
      <BlueprintKeyboardShortcuts />

      {/* Decision Panel - Top Center */}
      {currentDecision && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-5xl px-8">
          <DecisionPanel />
        </div>
      )}

      {/* Main content area */}
      <div className="relative h-full min-w-[1200px] flex items-center justify-center p-20">
        {/* Dynamic Column Grid Layout - Renders columns from store configuration */}
        <div className="grid grid-cols-4 min-w-[1200px] gap-10 z-10">
          {columns.map((column, index) => (
            <BlueprintColumn
              key={column.id}
              column={column}
              delay={0.4 + index * 0.1}
              selectedScanId={selectedScanId}
              onSelectScan={handleSelectScan}
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
