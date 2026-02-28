'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CheckSquare, Square, Trash2, XCircle, Layers, RotateCcw } from 'lucide-react';
import type { AggregationCheckResult } from '../lib/ideaAggregator';

interface TaskColumnHeaderProps {
  projectId: string;
  projectName: string;
  allSelected: boolean;
  someSelected: boolean;
  selectedCount: number;
  selectableCount: number;
  selectedInColumnCount: number;
  clearableCount: number;
  failedCount: number;
  queuedCount: number;
  requirementsCount: number;
  aggregationCheck: AggregationCheckResult | null;
  isAggregating: boolean;
  onToggleProjectSelection: () => void;
  onAggregate: () => void;
  onBulkDeleteSelected: () => void;
  onClearCompleted: () => void;
  onResetAllFailed: () => void;
  onResetAllQueued: () => void;
  canBulkDelete: boolean;
  canReset: boolean;
}

/**
 * Inline delete button with 3-second armed confirmation state.
 * First click arms the button, second click within 3s confirms deletion.
 */
function InlineDeleteButton({
  count,
  onConfirm,
  projectId,
}: {
  count: number;
  onConfirm: () => void;
  projectId: string;
}) {
  const [armed, setArmed] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Auto-disarm after 3 seconds
  useEffect(() => {
    if (armed) {
      timerRef.current = setTimeout(() => setArmed(false), 3000);
    }
    return clearTimer;
  }, [armed, clearTimer]);

  // Disarm if count changes (selection changed)
  useEffect(() => {
    setArmed(false);
  }, [count]);

  const handleClick = useCallback(() => {
    if (armed) {
      clearTimer();
      setArmed(false);
      onConfirm();
    } else {
      setArmed(true);
    }
  }, [armed, onConfirm, clearTimer]);

  if (armed) {
    return (
      <button
        onClick={handleClick}
        className="text-red-300 text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-500/30 border border-red-500/50 transition-colors animate-pulse"
        title="Click again to confirm deletion"
        data-testid={`bulk-delete-confirm-btn-${projectId}`}
      >
        <Trash2 className="w-3 h-3" />
        <span>Confirm {count}?</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="text-red-400 hover:text-red-300 text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 transition-colors"
      title={`Delete ${count} selected`}
      data-testid={`bulk-delete-selected-btn-${projectId}`}
    >
      <Trash2 className="w-3 h-3" />
      <span>{count}</span>
    </button>
  );
}

export default function TaskColumnHeader({
  projectId,
  projectName,
  allSelected,
  someSelected,
  selectedCount,
  selectableCount,
  selectedInColumnCount,
  clearableCount,
  failedCount,
  queuedCount,
  requirementsCount,
  aggregationCheck,
  isAggregating,
  onToggleProjectSelection,
  onAggregate,
  onBulkDeleteSelected,
  onClearCompleted,
  onResetAllFailed,
  onResetAllQueued,
  canBulkDelete,
  canReset,
}: TaskColumnHeaderProps) {
  return (
    <div className="px-3 py-2 bg-gray-800/60 border-b border-gray-700/40">
      <div className="flex items-center justify-between gap-2">
        {/* Project name and selection toggle */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={onToggleProjectSelection}
            className="flex-shrink-0 text-gray-400 hover:text-emerald-400 transition-colors"
            title={allSelected ? 'Deselect all' : 'Select all'}
            disabled={selectableCount === 0}
            data-testid={`select-all-btn-${projectId}`}
          >
            {allSelected ? (
              <CheckSquare className="w-4 h-4 text-emerald-400" />
            ) : someSelected ? (
              <Square className="w-4 h-4 text-emerald-400/60" />
            ) : (
              <Square className="w-4 h-4" />
            )}
          </button>
          <h3 className="text-sm font-semibold text-gray-300 truncate" title={projectName}>
            {projectName}
          </h3>
        </div>

        {/* Action buttons: constructive (left) | cleanup (right) */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Constructive actions group */}
          <div className="flex items-center gap-1.5">
            {aggregationCheck?.canAggregate && (
              <button
                onClick={onAggregate}
                disabled={isAggregating}
                className="text-violet-400 hover:text-violet-300 text-[11px] flex items-center gap-1 px-2 py-0.5 rounded border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={`Aggregate ${aggregationCheck.aggregatableFiles} idea files`}
                data-testid={`aggregate-btn-${projectId}`}
              >
                <Layers className="w-3 h-3" />
                <span>{aggregationCheck.aggregatableFiles}</span>
              </button>
            )}

            {selectedCount > 0 && (
              <span className="text-[11px] text-emerald-400 font-mono">
                {selectedCount}/{selectableCount}
              </span>
            )}
            <span className="text-[11px] text-gray-500 font-mono">{requirementsCount}</span>
          </div>

          {/* Divider between groups */}
          {(failedCount > 0 || queuedCount > 0 || clearableCount > 0 || (selectedInColumnCount > 0 && canBulkDelete)) && (
            <div className="w-px h-4 bg-gray-600/50 mx-0.5" />
          )}

          {/* Cleanup / destructive actions group */}
          <div className="flex items-center gap-1">
            {failedCount > 0 && canReset && (
              <button
                onClick={onResetAllFailed}
                className="text-gray-400 hover:text-amber-300 text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-500/10 hover:bg-amber-500/15 transition-colors"
                title={`Reset ${failedCount} failed task${failedCount > 1 ? 's' : ''}`}
                data-testid={`reset-failed-btn-${projectId}`}
              >
                <RotateCcw className="w-3 h-3" />
                <span>{failedCount}</span>
              </button>
            )}

            {queuedCount > 0 && canReset && (
              <button
                onClick={onResetAllQueued}
                className="text-gray-400 hover:text-blue-300 text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-500/10 hover:bg-blue-500/15 transition-colors"
                title={`Reset ${queuedCount} queued task${queuedCount > 1 ? 's' : ''} to open`}
                data-testid={`reset-queued-btn-${projectId}`}
              >
                <RotateCcw className="w-3 h-3" />
                <span>{queuedCount}q</span>
              </button>
            )}

            {clearableCount > 0 && canBulkDelete && (
              <button
                onClick={onClearCompleted}
                className="text-gray-400 hover:text-gray-300 text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-500/10 hover:bg-gray-500/20 transition-colors"
                title="Clear completed and failed tasks"
                data-testid={`clear-completed-btn-${projectId}`}
              >
                <XCircle className="w-3 h-3" />
                <span>{clearableCount}</span>
              </button>
            )}

            {selectedInColumnCount > 0 && canBulkDelete && (
              <InlineDeleteButton
                count={selectedInColumnCount}
                onConfirm={onBulkDeleteSelected}
                projectId={projectId}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
