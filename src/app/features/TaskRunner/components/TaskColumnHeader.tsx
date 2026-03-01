'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, Square, Trash2, XCircle, Layers, RotateCcw, MoreHorizontal } from 'lucide-react';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click-outside or Escape
  useEffect(() => {
    if (!menuOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const hasConstructiveActions = Boolean(aggregationCheck?.canAggregate);
  const hasCleanupActions =
    (failedCount > 0 && canReset) ||
    (queuedCount > 0 && canReset) ||
    (clearableCount > 0 && canBulkDelete) ||
    (selectedInColumnCount > 0 && canBulkDelete);
  const hasMenuItems = hasConstructiveActions || hasCleanupActions;

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

        {/* Counts and overflow menu */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {selectedCount > 0 && (
            <span className="text-[11px] text-emerald-400 font-mono">
              {selectedCount}/{selectableCount}
            </span>
          )}
          <span className="text-[11px] text-gray-500 font-mono">{requirementsCount}</span>

          {/* Overflow menu trigger */}
          {hasMenuItems && (
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={`p-1 rounded transition-colors ${menuOpen ? 'bg-gray-700/60 text-gray-200' : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/30'}`}
                title="Actions"
                data-testid={`column-actions-btn-${projectId}`}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full right-0 mt-1 w-52 bg-gray-800 border border-gray-700/60 rounded-lg shadow-xl z-50 py-1 overflow-hidden"
                  >
                    {/* Actions section — constructive operations */}
                    {hasConstructiveActions && (
                      <>
                        <div className="px-3 pt-1.5 pb-1 text-[9px] uppercase tracking-wider text-gray-500 font-semibold">
                          Actions
                        </div>
                        {aggregationCheck?.canAggregate && (
                          <button
                            onClick={() => { onAggregate(); setMenuOpen(false); }}
                            disabled={isAggregating}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium text-violet-400 hover:bg-violet-500/10 border-l-2 border-violet-500/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            data-testid={`aggregate-btn-${projectId}`}
                          >
                            <Layers className="w-3.5 h-3.5" />
                            <span>Aggregate {aggregationCheck.aggregatableFiles} idea files</span>
                          </button>
                        )}
                      </>
                    )}

                    {/* Divider */}
                    {hasConstructiveActions && hasCleanupActions && (
                      <div className="my-1 border-t border-gray-700/40" />
                    )}

                    {/* Cleanup section — reset & removal operations */}
                    {hasCleanupActions && (
                      <>
                        <div className="px-3 pt-1.5 pb-1 text-[9px] uppercase tracking-wider text-gray-500 font-semibold">
                          Cleanup
                        </div>

                        {failedCount > 0 && canReset && (
                          <button
                            onClick={() => { onResetAllFailed(); setMenuOpen(false); }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-600/20 hover:text-amber-400 transition-colors"
                            data-testid={`reset-failed-btn-${projectId}`}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reset {failedCount} failed</span>
                          </button>
                        )}

                        {queuedCount > 0 && canReset && (
                          <button
                            onClick={() => { onResetAllQueued(); setMenuOpen(false); }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-600/20 hover:text-blue-400 transition-colors"
                            data-testid={`reset-queued-btn-${projectId}`}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reset {queuedCount} queued</span>
                          </button>
                        )}

                        {clearableCount > 0 && canBulkDelete && (
                          <button
                            onClick={() => { onClearCompleted(); setMenuOpen(false); }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-600/20 hover:text-gray-300 transition-colors"
                            data-testid={`clear-completed-btn-${projectId}`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Clear {clearableCount} completed</span>
                          </button>
                        )}

                        {selectedInColumnCount > 0 && canBulkDelete && (
                          <>
                            <div className="my-1 border-t border-gray-700/40" />
                            <button
                              onClick={() => { onBulkDeleteSelected(); setMenuOpen(false); }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                              data-testid={`bulk-delete-selected-btn-${projectId}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete {selectedInColumnCount} selected</span>
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
