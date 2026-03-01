'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Play,
  Square,
  Settings,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Eye,
} from 'lucide-react';
import IdeasLoadingState from '@/app/features/Ideas/components/IdeasLoadingState';
import LifecyclePhaseIndicator from './components/LifecyclePhaseIndicator';
import LifecycleTimeline from './components/LifecycleTimeline';
import LifecycleConfigPanel from './components/LifecycleConfigPanel';
import SimulationPreviewPanel from './components/SimulationPreviewPanel';
import {
  LifecycleOrchestratorStatus,
  LifecycleCycle,
  LifecycleEvent,
  LifecycleConfig,
  LifecycleTrigger,
  SimulationPreview,
} from './lib/lifecycleTypes';

interface LifecycleDashboardProps {
  projectId: string;
  projectPath: string;
  onCycleComplete?: () => void;
}

export default function LifecycleDashboard({
  projectId,
  projectPath,
  onCycleComplete,
}: LifecycleDashboardProps) {
  const [status, setStatus] = useState<LifecycleOrchestratorStatus | null>(null);
  const [currentCycle, setCurrentCycle] = useState<LifecycleCycle | null>(null);
  const [events, setEvents] = useState<LifecycleEvent[]>([]);
  const [config, setConfig] = useState<Partial<LifecycleConfig>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showEvents, setShowEvents] = useState(true);
  const [simulationPreview, setSimulationPreview] = useState<SimulationPreview | null>(null);

  /**
   * Fetch lifecycle status
   */
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/lifecycle?includeEvents=true&eventLimit=50');
      if (!response.ok) {
        throw new Error('Failed to fetch lifecycle status');
      }
      const data = await response.json();

      setStatus(data.status);
      setCurrentCycle(data.currentCycle);
      setEvents(data.events || []);
      setConfig(data.config || {});
      setError(null);

      // Capture simulation preview from completed simulation cycles
      if (data.currentCycle?.is_simulation && data.currentCycle?.simulation_preview && data.currentCycle?.phase === 'completed') {
        setSimulationPreview(data.currentCycle.simulation_preview);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Initialize the lifecycle orchestrator
   */
  const initializeOrchestrator = useCallback(async () => {
    try {
      const response = await fetch('/api/lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'initialize',
          projectId,
          config: { project_id: projectId },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to initialize lifecycle');
      }

      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Initialization failed');
    }
  }, [projectId, fetchStatus]);

  /**
   * Start the lifecycle orchestrator
   */
  const startOrchestrator = async () => {
    try {
      // Initialize if not already done
      if (!status?.is_running && !config?.project_id) {
        await initializeOrchestrator();
      }

      const response = await fetch('/api/lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });

      if (!response.ok) {
        throw new Error('Failed to start lifecycle');
      }

      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Start failed');
    }
  };

  /**
   * Stop the lifecycle orchestrator
   */
  const stopOrchestrator = async () => {
    try {
      const response = await fetch('/api/lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      });

      if (!response.ok) {
        throw new Error('Failed to stop lifecycle');
      }

      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Stop failed');
    }
  };

  /**
   * Trigger a manual cycle
   */
  const triggerCycle = async (trigger: LifecycleTrigger = 'manual') => {
    try {
      // Ensure initialized and started
      if (!status?.is_running) {
        await startOrchestrator();
      }

      const response = await fetch('/api/lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'trigger',
          trigger,
          triggerMetadata: { projectPath },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to trigger cycle');
      }

      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Trigger failed');
    }
  };

  /**
   * Promote simulation to real deploy — disable simulation mode and re-trigger
   */
  const promoteSimulationToDeploy = async () => {
    try {
      await updateConfig({ simulation_mode: false, auto_deploy: true, deployment_targets: ['git_branch', 'pull_request'] });
      setSimulationPreview(null);
      await triggerCycle('manual');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to promote simulation');
    }
  };

  /**
   * Update configuration
   */
  const updateConfig = async (updates: Partial<LifecycleConfig>) => {
    try {
      const response = await fetch('/api/lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'configure',
          config: updates,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update configuration');
      }

      const data = await response.json();
      setConfig(data.config || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Configuration update failed');
    }
  };

  // Initial fetch and polling
  useEffect(() => {
    initializeOrchestrator();
  }, [initializeOrchestrator]);

  // Poll for updates when a cycle is running
  useEffect(() => {
    if (currentCycle && currentCycle.phase !== 'completed' && currentCycle.phase !== 'failed') {
      const interval = setInterval(fetchStatus, 2000);
      return () => clearInterval(interval);
    }
  }, [currentCycle, fetchStatus]);

  // Notify on cycle completion
  useEffect(() => {
    if (currentCycle?.phase === 'completed') {
      onCycleComplete?.();
    }
  }, [currentCycle?.phase, onCycleComplete]);

  if (isLoading) {
    return (
      <IdeasLoadingState size="md" label="Loading lifecycle..." data-testid="lifecycle-loading" />
    );
  }

  return (
    <div className="space-y-4" data-testid="lifecycle-dashboard">
      {/* Header with Controls */}
      <div className="bg-gray-800/40 border border-gray-700/40 rounded-lg p-4">
        <div className="flex items-center justify-between">
          {/* Title and Status */}
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-medium text-gray-200">
              Code Quality Lifecycle
            </span>
            {status?.is_running && (
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                Running
              </span>
            )}
            {(config as LifecycleConfig)?.simulation_mode && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/15 text-amber-400 text-xs rounded-full">
                <Eye className="w-3 h-3" />
                Simulation
              </span>
            )}
          </div>

          {/* Control Buttons */}
          <div className="flex items-center gap-2">
            {/* Manual Trigger */}
            <button
              onClick={() => triggerCycle('manual')}
              disabled={currentCycle !== null && !['completed', 'failed'].includes(currentCycle.phase)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 rounded-lg text-blue-400 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="lifecycle-trigger-btn"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Run Cycle</span>
            </button>

            {/* Start/Stop */}
            {status?.is_running ? (
              <button
                onClick={stopOrchestrator}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg text-red-400 text-sm transition-colors"
                data-testid="lifecycle-stop-btn"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                onClick={startOrchestrator}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 rounded-lg text-green-400 text-sm transition-colors"
                data-testid="lifecycle-start-btn"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Start</span>
              </button>
            )}

            {/* Settings Toggle */}
            <button
              onClick={() => setShowConfig(!showConfig)}
              className={`p-1.5 rounded-lg transition-colors ${
                showConfig
                  ? 'bg-gray-700/50 text-gray-300'
                  : 'hover:bg-gray-700/30 text-gray-400'
              }`}
              data-testid="lifecycle-settings-btn"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Current Cycle Status */}
        {currentCycle && (
          <div className="mt-4 pt-4 border-t border-gray-700/40">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-400">Current Cycle</span>
              <LifecyclePhaseIndicator
                phase={currentCycle.phase}
                progress={currentCycle.progress}
                compact
              />
            </div>

            {/* Simulation indicator for active cycle */}
            {currentCycle.is_simulation && (
              <div className="mb-2 flex items-center gap-1.5 text-xs text-amber-400">
                <Eye className="w-3 h-3" />
                <span>Simulation mode — no real changes will be made</span>
              </div>
            )}

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="h-2 bg-gray-700/50 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${
                    currentCycle.phase === 'failed'
                      ? 'bg-red-500'
                      : currentCycle.phase === 'completed'
                      ? 'bg-green-500'
                      : currentCycle.is_simulation
                      ? 'bg-amber-500'
                      : 'bg-blue-500'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${currentCycle.progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-xs text-gray-400">{currentCycle.current_step}</p>
            </div>

            {/* Cycle Stats */}
            <div className="mt-3 grid grid-cols-4 gap-2">
              <div className="text-center">
                <p className="text-lg font-semibold tabular-nums text-blue-400">
                  {currentCycle.scans_completed}/{currentCycle.scans_total}
                </p>
                <p className="text-xs text-gray-500">Scans</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold tabular-nums text-cyan-400">
                  {currentCycle.ideas_generated}
                </p>
                <p className="text-xs text-gray-500">Ideas</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold tabular-nums text-amber-400">
                  {currentCycle.ideas_resolved}
                </p>
                <p className="text-xs text-gray-500">Resolved</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold tabular-nums text-green-400">
                  {currentCycle.quality_gates_passed}/{currentCycle.quality_gates_total}
                </p>
                <p className="text-xs text-gray-500">Gates</p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats (when no active cycle) */}
        {!currentCycle && status && (
          <div className="mt-4 pt-4 border-t border-gray-700/40 grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="text-lg font-semibold tabular-nums text-blue-400">
                {status.active_cycles}
              </p>
              <p className="text-xs text-gray-500">Active</p>
            </div>
            <div>
              <p className="text-lg font-semibold tabular-nums text-green-400">
                {status.is_running ? 'On' : 'Off'}
              </p>
              <p className="text-xs text-gray-500">Status</p>
            </div>
            <div>
              <p className="text-lg font-semibold tabular-nums text-cyan-400">
                {status.last_cycle_at
                  ? new Date(status.last_cycle_at).toLocaleTimeString()
                  : '—'}
              </p>
              <p className="text-xs text-gray-500">Last Run</p>
            </div>
            <div>
              <p className="text-lg font-semibold tabular-nums text-amber-400">
                {status.next_scheduled_at
                  ? new Date(status.next_scheduled_at).toLocaleTimeString()
                  : '—'}
              </p>
              <p className="text-xs text-gray-500">Next Run</p>
            </div>
          </div>
        )}
      </div>

      {/* Configuration Panel */}
      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <LifecycleConfigPanel
              config={config}
              onConfigChange={updateConfig}
              disabled={
                currentCycle !== null &&
                !['completed', 'failed'].includes(currentCycle.phase)
              }
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Simulation Preview */}
      <AnimatePresence>
        {simulationPreview && (
          <SimulationPreviewPanel
            preview={simulationPreview}
            onDismiss={() => setSimulationPreview(null)}
            onPromoteToDeploy={promoteSimulationToDeploy}
          />
        )}
      </AnimatePresence>

      {/* Event Timeline */}
      <div className="bg-gray-800/40 border border-gray-700/40 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowEvents(!showEvents)}
          className="flex items-center justify-between w-full px-4 py-3 text-left"
          data-testid="lifecycle-events-toggle"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-300">Event Timeline</span>
            <span className="px-1.5 py-0.5 bg-gray-700/50 text-gray-400 text-xs rounded">
              {events.length}
            </span>
          </div>
          {showEvents ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </button>

        <AnimatePresence>
          {showEvents && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 pb-4 max-h-96 overflow-y-auto"
            >
              <LifecycleTimeline events={events} compact />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
