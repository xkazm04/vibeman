/**
 * ConductorView — Main container for the autonomous development pipeline
 *
 * Composes all Conductor sub-components: pipeline visualization,
 * controls, metrics, balancing config, self-healing panel, and run history.
 */

'use client';

import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Workflow, Sparkles } from 'lucide-react';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import { useThemeStore } from '@/stores/themeStore';
import { useConductorStore } from '../../lib/conductor/conductorStore';
import { useConductorStatus } from '../../lib/conductor/useConductorStatus';
import PipelineFlowViz from './PipelineFlowViz';
import PipelineControls from './PipelineControls';
import MetricsBar from './MetricsBar';
import ProcessLog from './ProcessLog';
import HealingPanel from './HealingPanel';
import BalancingModal from './BalancingModal';
import RunHistoryTimeline from './RunHistoryTimeline';
import ConductorNerdView from './ConductorNerdView';
import type { PipelineStage } from '../../lib/conductor/types';

interface ConductorViewProps {
  projectId?: string | null;
}

export default function ConductorView({ projectId }: ConductorViewProps) {
  const activeProject = useClientProjectStore((state) => state.activeProject);
  const { getThemeColors } = useThemeStore();
  const colors = getThemeColors();
  const { currentRun, isRunning, processLog, startRun, nerdMode } = useConductorStore();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const effectiveProjectId = projectId || activeProject?.id || null;

  // Shared polling hook — always fetches on mount (discovers active runs
  // even when isRunning was false due to navigation), then polls every 3s
  useConductorStatus(true);

  const handleStart = useCallback(async () => {
    if (!effectiveProjectId) return;

    const runId = startRun(effectiveProjectId);

    try {
      await fetch('/api/conductor/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          projectId: effectiveProjectId,
          runId,
          config: useConductorStore.getState().config,
          projectPath: activeProject?.path || '',
          projectName: activeProject?.name || 'Project',
        }),
      });
    } catch (error) {
      console.error('Failed to start pipeline:', error);
      useConductorStore.getState().completePipeline('failed');
    }
  }, [effectiveProjectId, activeProject, startRun]);

  const handleStageClick = useCallback((stage: PipelineStage) => {
    // Future: open stage detail modal
    console.log('Stage clicked:', stage);
  }, []);

  // Empty state when no project is selected
  if (!effectiveProjectId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center" data-testid="conductor-no-project">
        <Workflow className="w-12 h-12 text-gray-700 mb-3" />
        <p className="text-sm text-gray-400">Select a project to use the Conductor pipeline</p>
        <p className="text-xs text-gray-600 mt-1">
          The pipeline requires an active project context
        </p>
      </div>
    );
  }

  // Nerd mode: stripped-down monospace view, no Framer Motion
  if (nerdMode) {
    return (
      <div className="space-y-4" data-testid="conductor-view">
        <PipelineControls
          projectId={effectiveProjectId}
          onStart={handleStart}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <ConductorNerdView projectId={effectiveProjectId} />
        <BalancingModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="conductor-view">
      {/* Header */}
      <motion.div
        className="flex items-center gap-3"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20
            flex items-center justify-center border border-gray-700`}
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-200">Conductor Pipeline</h2>
            <p className="text-[11px] text-gray-500">Autonomous development with self-healing</p>
          </div>
        </div>
      </motion.div>

      {/* Pipeline Controls */}
      <PipelineControls
        projectId={effectiveProjectId}
        onStart={handleStart}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Pipeline Flow Visualization */}
      <motion.div
        className="rounded-xl border border-gray-800 bg-gray-900/30 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <PipelineFlowViz run={currentRun} onStageClick={handleStageClick} />
      </motion.div>

      {/* Metrics Bar */}
      <MetricsBar metrics={currentRun?.metrics ?? null} isRunning={isRunning} />

      {/* Process Log + Self-Healing */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <ProcessLog entries={processLog} isRunning={isRunning} />
        <HealingPanel />
      </motion.div>

      {/* Run History Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <RunHistoryTimeline />
      </motion.div>

      {/* Settings Modal */}
      <BalancingModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
