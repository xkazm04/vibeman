'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wifi, WifiOff, Upload } from 'lucide-react';
import type { ProjectRequirement, TaskRunnerActions } from './lib/types';
import { CLIBatchPanel } from '@/components/cli';
import TaskMonitor from './components/TaskMonitor';
import { ConductorQABanner } from './components/ConductorQABanner';
import { useRemoteTaskRunner } from './hooks/useRemoteTaskRunner';

interface TaskRunnerHeaderProps {
  selectedCount: number;
  totalCount: number;
  processedCount: number;
  isRunning: boolean;
  error?: string;
  requirements: ProjectRequirement[];
  selectedRequirements: Set<string>;
  actions: TaskRunnerActions;
  getRequirementId: (req: ProjectRequirement) => string;
  /** Number of pending Conductor Q&A items (0 = banner hidden) */
  conductorQACount?: number;
}

export default function TaskRunnerHeader({
  selectedCount,
  totalCount,
  processedCount,
  isRunning,
  error,
  requirements,
  selectedRequirements,
  actions,
  getRequirementId,
  conductorQACount = 0,
}: TaskRunnerHeaderProps) {
  const { setRequirements, setIsRunning, setProcessedCount, setError } = actions;

  // Remote TaskRunner hook
  const {
    isRemoteAvailable,
    isRemoteMode,
    targetDeviceName,
    toggleRemoteMode,
  } = useRemoteTaskRunner();

  // Sync projects to Supabase
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const handleSyncProjects = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await fetch('/api/external-requirements/sync-projects', { method: 'POST' });
      const data = await res.json();
      setSyncFeedback(
        data.success
          ? `Synced ${data.synced} project${data.synced !== 1 ? 's' : ''}`
          : data.error || 'Sync failed'
      );
    } catch {
      setSyncFeedback('Network error');
    }
    setIsSyncing(false);
    setTimeout(() => setSyncFeedback(null), 3000);
  };

  const clearError = () => {
    setError(undefined);
  };

  return (
    <div className="relative space-y-3">
      {/* Conductor Q&A Banner — appears above Session Health when questions are pending */}
      <ConductorQABanner qaCount={conductorQACount} />

      {/* Session Health Monitor - Shows task status and orphaned sessions */}
      <TaskMonitor showOrphanCleanup={true} />

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-gradient-to-r from-red-500/10 to-red-600/5 border border-red-500/30 rounded-lg p-3 flex items-center justify-between backdrop-blur-sm shadow-sm shadow-red-500/10"
        >
          <div className="flex items-center gap-3">
            <X className="w-4 h-4 text-red-400" />
            <span className="text-red-400 text-sm font-medium">{error}</span>
          </div>
          <button
            onClick={clearError}
            className="text-red-400 hover:text-red-300 transition-all duration-200 hover:scale-110 active:scale-95 p-1 rounded hover:bg-red-500/10"
            data-testid="clear-error-btn"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}

      {/* Controls Row */}
      <div className="flex items-center justify-between">
        <div className="flex-1" />
        <div className="flex-1 flex justify-end gap-2">
          {/* Sync Projects to Supabase */}
          <button
            onClick={handleSyncProjects}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-gray-800/50 text-gray-400 hover:text-teal-400 hover:bg-teal-500/10 border border-gray-700/50 hover:border-teal-500/30 transition-all duration-200 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 active:scale-95"
            title={syncFeedback || 'Sync projects to Supabase for external requirements'}
            data-testid="sync-projects-btn"
          >
            <Upload className={`w-3.5 h-3.5 ${isSyncing ? 'animate-pulse' : ''}`} />
            <span>{syncFeedback || 'Sync'}</span>
          </button>

          {/* Remote Mode Toggle */}
          <AnimatePresence>
            {isRemoteAvailable && (
              <motion.button
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                onClick={toggleRemoteMode}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                  isRemoteMode
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                    : 'bg-gray-800/50 text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 border border-gray-700/50'
                } focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 active:scale-95`}
                title={isRemoteMode ? `Remote: ${targetDeviceName}` : 'Enable remote execution'}
              >
                {isRemoteMode ? (
                  <Wifi className="w-3.5 h-3.5" />
                ) : (
                  <WifiOff className="w-3.5 h-3.5" />
                )}
                <span className="truncate max-w-[100px]">
                  {isRemoteMode ? targetDeviceName || 'Remote' : 'Remote'}
                </span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* CLI Execution Panel */}
      <div className="relative bg-gradient-to-br from-gray-900/40 to-gray-950/30 backdrop-blur-sm border border-gray-800/30 rounded-lg p-4 shadow-lg shadow-black/10">
        <CLIBatchPanel
          selectedTaskIds={Array.from(selectedRequirements)}
          requirements={requirements}
          getRequirementId={getRequirementId}
          onClearSelection={() => actions.setSelectedRequirements(new Set())}
          onRequirementCompleted={(reqId) => {
            // Remove completed requirement from list
            setRequirements(prev => prev.filter(r => getRequirementId(r) !== reqId));
            // Remove from selected if was selected
            actions.setSelectedRequirements(prev => {
              const newSet = new Set(prev);
              newSet.delete(reqId);
              return newSet;
            });
          }}
          isRemoteMode={isRemoteMode}
        />
      </div>
    </div>
  );
}
