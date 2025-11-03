'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BlueprintBackground from './components/BlueprintBackground';
import BlueprintCornerLabels from './components/BlueprintCornerLabels';
import BlueprintColumn from './components/BlueprintColumn';
import DecisionPanel from './components/DecisionPanel';
import BlueprintKeyboardShortcuts from './components/BlueprintKeyboardShortcuts';
import ContextSelector from './components/ContextSelector';
import ScanProgressBars from './components/ScanProgressBars';
import { TaskProgressPanel } from './components/TaskProgressPanel';
import { BadgeGallery } from './components/BadgeGallery';
import { useBlueprintStore } from './store/blueprintStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useDecisionQueueStore } from '@/stores/decisionQueueStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useBadgeStore } from '@/stores/badgeStore';
import { useBlueprintKeyboardShortcuts } from './hooks/useBlueprintKeyboardShortcuts';

export default function DarkBlueprint() {
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [showContextSelector, setShowContextSelector] = useState(false);
  const [pendingScanId, setPendingScanId] = useState<string | null>(null);
  const [showBadgeGallery, setShowBadgeGallery] = useState(false);
  const { startScan, updateScanProgress, completeScan, failScan, getDaysAgo, loadScanEvents, columns } = useBlueprintStore();
  const { setActiveModule, openControlPanel, closeBlueprint } = useOnboardingStore();
  const { currentDecision, addDecision, queue } = useDecisionQueueStore();
  const { activeProject } = useActiveProjectStore();
  const { awardBadge, getProgress, earnedBadges } = useBadgeStore();

  // Check if onboarding is complete (no more decisions and has some badges)
  useEffect(() => {
    if (!currentDecision && queue.length === 0 && earnedBadges.length >= 3) {
      // Award the completion badge
      awardBadge('blueprint-master');
      // Show the gallery after a short delay
      setTimeout(() => setShowBadgeGallery(true), 1000);
    }
  }, [currentDecision, queue.length, earnedBadges.length, awardBadge]);

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
      return;
    }

    // Select the scan
    setSelectedScanId(scanId);

    // If context is needed, show context selector
    if (buttonConfig.contextNeeded) {
      setPendingScanId(scanId);
      setShowContextSelector(true);
      return;
    }

    // Otherwise, add pre-scan decision to queue
    addDecision({
      type: 'pre-scan',
      title: `Execute ${buttonLabel} Scan?`,
      description: `Click Accept to start the ${buttonLabel.toLowerCase()} scan for this project.`,
      severity: 'info',
      data: { scanId },
      onAccept: async () => {
        setSelectedScanId(null); // Clear selection
        await handleScan(scanId); // Execute scan
      },
      onReject: async () => {
        setSelectedScanId(null); // Clear selection
      },
    });
  };

  const handleContextSelect = (contextId: string, contextName: string) => {
    setShowContextSelector(false);

    if (!pendingScanId) return;

    const scanId = pendingScanId;

    // Find button config
    let buttonLabel = scanId;
    for (const column of columns) {
      const button = column.buttons.find(b => b.id === scanId);
      if (button) {
        buttonLabel = button.label;
        break;
      }
    }

    // Add pre-scan decision with context info
    addDecision({
      type: 'pre-scan',
      title: `Execute ${buttonLabel} Scan?`,
      description: `Context: "${contextName}"\n\nClick Accept to start the ${buttonLabel.toLowerCase()} scan for this context.`,
      severity: 'info',
      data: { scanId, contextId },
      onAccept: async () => {
        setSelectedScanId(null); // Clear selection
        setPendingScanId(null);
        await handleScan(scanId, contextId); // Execute scan with contextId
      },
      onReject: async () => {
        setSelectedScanId(null); // Clear selection
        setPendingScanId(null);
      },
    });
  };

  const handleScan = async (scanId: string, contextId?: string) => {
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
      return;
    }

    // Check if scan handler is defined
    if (!buttonConfig.scanHandler) {
      return;
    }

    // Start scan
    startScan(scanId);

    // Execute scan in background (non-blocking)
    // This allows user to continue working and multiple scans to run concurrently
    (async () => {
      try {
        // Execute scan (with contextId if needed)
        let result;
        if (buttonConfig.contextNeeded && contextId) {
          // For context-dependent scans, call with contextId
          if (scanId === 'selectors') {
            const { executeSelectorsScan } = await import('./lib/blueprintSelectorsScan');
            result = await executeSelectorsScan(contextId);
          } else if (scanId === 'photo') {
            const { executePhotoScan } = await import('./lib/blueprintPhotoScan');
            result = await executePhotoScan(contextId);
          } else {
            result = await buttonConfig.scanHandler.execute();
          }
        } else {
          result = await buttonConfig.scanHandler.execute();
        }

        // Handle failure
        if (!result.success) {
          const errorMsg = result.error || 'Scan failed';
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
          addDecision(decisionData);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        failScan(errorMsg);

        // Show error in decision panel
        addDecision({
          type: 'scan-error',
          title: `${buttonConfig.label} Scan Failed`,
          description: `An error occurred while scanning:\n\n${errorMsg}\n\nPlease check the console for more details.`,
          count: 0,
          severity: 'error',
          projectId: activeProject?.id || '',
          projectPath: activeProject?.path || '',
          data: { scanId, error: errorMsg },
          onAccept: async () => {
            // Error acknowledged
          },
          onReject: async () => {
            // Error dismissed
          },
        });
      }
    })();

    // Return immediately - scan runs in background
  };

  const createScanEvent = async (eventTitle: string, scanId: string) => {
    if (!activeProject) return;

    try {
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
        return;
      }

      const result = await response.json();

      if (result.success) {
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
      // Silent error handling
    }
  };

  const handleNavigate = (module: 'ideas' | 'tinder' | 'tasker' | 'reflector') => {
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

  const bg = "/patterns/bg_blueprint.jpg";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="relative w-full h-full bg-gradient-to-br from-gray-950 via-blue-950/30 to-gray-950 overflow-hidden"
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

      {/* Scan Progress Bars - Top of screen */}
      <ScanProgressBars />

      {/* Decision Panel - Top Center */}
      {currentDecision && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-5xl px-8">
          <DecisionPanel />
        </div>
      )}

      {/* Context Selector Modal */}
      {showContextSelector && activeProject && (
        <ContextSelector
          projectId={activeProject.id}
          onSelect={handleContextSelect}
          onClose={() => {
            setShowContextSelector(false);
            setPendingScanId(null);
            setSelectedScanId(null);
          }}
        />
      )}

      {/* Task Progress Panel */}
      <TaskProgressPanel />

      {/* Badge Gallery - Full Screen Completion View */}
      <AnimatePresence>
        {showBadgeGallery && (
          <BadgeGallery
            onClose={() => {
              setShowBadgeGallery(false);
              closeBlueprint();
            }}
          />
        )}
      </AnimatePresence>

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
