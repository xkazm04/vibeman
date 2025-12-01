/**
 * ManagerHeader Component
 * Header section with action buttons, filters, and stats for the Manager module
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, LayoutGrid, Network, Filter } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';
import { toast } from 'sonner';
import { batchAcceptImplementations } from '@/lib/tools';
import type { EnrichedImplementationLog } from '../lib/types';

export type ViewMode = 'cards' | 'map';

interface ManagerHeaderProps {
  implementationLogs: EnrichedImplementationLog[];
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  filterByProject: boolean;
  setFilterByProject: (value: boolean) => void;
  onLogsAccepted: () => void;
  onNewTask: () => void;
  loading: boolean;
  hasActiveProject: boolean;
}

export default function ManagerHeader({
  implementationLogs,
  viewMode,
  setViewMode,
  filterByProject,
  setFilterByProject,
  onLogsAccepted,
  onNewTask,
  loading,
  hasActiveProject,
}: ManagerHeaderProps) {
  const [isAcceptingAll, setIsAcceptingAll] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { getThemeColors } = useThemeStore();
  const colors = getThemeColors();

  const handleAcceptAll = async () => {
    if (implementationLogs.length === 0) return;

    // Show confirmation for more than 5 logs
    if (implementationLogs.length > 5 && !showConfirmDialog) {
      setShowConfirmDialog(true);
      return;
    }

    setShowConfirmDialog(false);
    setIsAcceptingAll(true);

    try {
      const logIds = implementationLogs.map(log => log.id);
      const result = await batchAcceptImplementations(logIds);

      if (result.success) {
        toast.success(`Accepted all ${result.acceptedCount} implementation logs`);
        onLogsAccepted();
      } else {
        toast.success(`Accepted ${result.acceptedCount} logs, ${result.failedIds.length} failed`);
        onLogsAccepted();
      }
    } catch (error) {
      toast.error('Failed to accept logs');
      console.error('Error accepting all logs:', error);
    } finally {
      setIsAcceptingAll(false);
    }
  };

  const cancelConfirm = () => {
    setShowConfirmDialog(false);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-center justify-between"
        data-testid="manager-header"
      >
        <div className="flex items-center gap-4">
          {/* New Task Button */}
          <button
            onClick={onNewTask}
            className={`px-4 py-2 rounded-lg ${colors.bgHover} border ${colors.borderHover} ${colors.textDark} hover:opacity-80 transition-all font-medium flex items-center gap-2 text-sm`}
            data-testid="new-task-btn"
          >
            <span className="text-lg">+</span> New Task
          </button>

          {/* Accept All Button */}
          <button
            onClick={handleAcceptAll}
            disabled={isAcceptingAll || implementationLogs.length === 0}
            className={`px-4 py-2 rounded-lg bg-emerald-600 text-white
              hover:bg-emerald-500 transition-all font-medium flex items-center gap-2 text-sm
              disabled:opacity-50 disabled:cursor-not-allowed`}
            data-testid="accept-all-btn"
          >
            {isAcceptingAll ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Accept All ({implementationLogs.length})
          </button>

          {/* View Toggle */}
          <div className="flex rounded-lg overflow-hidden border border-gray-700">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-2 flex items-center gap-1 text-sm transition-all ${
                viewMode === 'cards'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
              data-testid="view-cards-btn"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-2 flex items-center gap-1 text-sm transition-all ${
                viewMode === 'map'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
              data-testid="view-map-btn"
            >
              <Network className="w-4 h-4" />
            </button>
          </div>

          {/* Project Filter Toggle */}
          {hasActiveProject && (
            <button
              onClick={() => setFilterByProject(!filterByProject)}
              className={`px-3 py-1.5 rounded text-xs flex items-center gap-1.5 transition-all ${
                filterByProject
                  ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-600/50'
                  : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
              }`}
              data-testid="filter-project-btn"
            >
              <Filter className="w-3 h-3" />
              {filterByProject ? 'Current Project' : 'All Projects'}
            </button>
          )}
        </div>

        {/* Compact Inline Stats */}
        {!loading && implementationLogs.length > 0 && (
          <div className="flex items-center gap-4" data-testid="manager-stats">
            {[
              { label: 'Total', value: implementationLogs.length, color: 'cyan' },
              { label: 'Projects', value: new Set(implementationLogs.map(l => l.project_id)).size, color: 'emerald' },
              { label: 'With Context', value: implementationLogs.filter(l => l.context_id).length, color: 'amber' },
              { label: 'Needs Review', value: implementationLogs.length, color: 'purple' },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{stat.label}:</span>
                <span className={`text-lg font-bold text-${stat.color}-400 font-mono`}>{stat.value}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={cancelConfirm}
          data-testid="confirm-dialog-overlay"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md mx-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
            data-testid="confirm-dialog"
          >
            <h3 className="text-lg font-semibold text-white mb-2">
              Accept All Implementations?
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              You are about to accept <span className="text-cyan-400 font-bold">{implementationLogs.length}</span> implementation logs.
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelConfirm}
                className="px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-all text-sm"
                data-testid="confirm-cancel-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-all text-sm flex items-center gap-2"
                data-testid="confirm-accept-btn"
              >
                <CheckCircle2 className="w-4 h-4" />
                Accept All
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
