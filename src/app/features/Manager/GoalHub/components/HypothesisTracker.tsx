/**
 * Hypothesis Tracker Component
 * Single-column list view for managing hypotheses grouped by status
 */

'use client';

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  Plus,
  CheckCircle2,
  Clock,
  Circle,
  Loader2,
  Filter,
} from 'lucide-react';
import { useGoalHubStore } from '@/stores/goalHubStore';
import HypothesisRow from './HypothesisRow';
import NewHypothesisModal from './NewHypothesisModal';
import type { GoalHypothesis } from '@/app/db/models/goal-hub.types';

interface HypothesisTrackerProps {
  hypotheses: GoalHypothesis[];
  isLoading: boolean;
  projectPath: string;
}

export default function HypothesisTracker({
  hypotheses,
  isLoading,
  projectPath,
}: HypothesisTrackerProps) {
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isCompletingAll, setIsCompletingAll] = useState(false);

  const { activeGoal, loadHypotheses } = useGoalHubStore();

  const handleCompleteAll = async () => {
    if (!activeGoal) return;
    if (!confirm('Mark all hypotheses as completed?')) return;

    setIsCompletingAll(true);
    try {
      const response = await fetch('/api/goal-hub/hypotheses/complete-goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId: activeGoal.id }),
      });

      if (response.ok) {
        await loadHypotheses(activeGoal.id);
      }
    } catch (error) {
      console.error('Failed to complete all hypotheses:', error);
    } finally {
      setIsCompletingAll(false);
    }
  };

  // Group hypotheses by status
  const grouped = {
    in_progress: hypotheses.filter((h) => h.status === 'in_progress'),
    unverified: hypotheses.filter((h) => h.status === 'unverified'),
    done: hypotheses.filter((h) => h.status === 'verified' || h.status === 'completed'),
  };

  // Filter by category if selected
  const filteredGrouped = filterCategory
    ? {
        in_progress: grouped.in_progress.filter((h) => h.category === filterCategory),
        unverified: grouped.unverified.filter((h) => h.category === filterCategory),
        done: grouped.done.filter((h) => h.category === filterCategory),
      }
    : grouped;

  // Count incomplete
  const incompleteCount = grouped.unverified.length + grouped.in_progress.length;

  // Get unique categories
  const categories = Array.from(new Set(hypotheses.map((h) => h.category)));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filterCategory || ''}
                onChange={(e) => setFilterCategory(e.target.value || null)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-cyan-500"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Complete All */}
          {incompleteCount > 0 && (
            <button
              onClick={handleCompleteAll}
              disabled={isCompletingAll}
              className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg text-sm font-medium transition-colors"
            >
              {isCompletingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Complete All ({incompleteCount})
            </button>
          )}

          {/* Add Hypothesis */}
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>

      {/* Content */}
      {hypotheses.length === 0 ? (
        <div className="text-center py-16 bg-gradient-to-b from-gray-900/50 to-gray-900/30 border border-gray-800 border-dashed rounded-xl">
          <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Circle className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-300 mb-2">
            No Hypotheses Yet
          </h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            Generate a breakdown using the Breakdown tab to create hypotheses automatically,
            or add them manually below.
          </p>
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 rounded-lg font-medium shadow-lg shadow-cyan-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add First Hypothesis
          </button>
        </div>
      ) : (
        /* Single Column List */
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 space-y-4 max-h-[600px] overflow-y-auto">
          {/* In Progress Section */}
          {filteredGrouped.in_progress.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Clock className="w-3 h-3" />
                In Progress ({filteredGrouped.in_progress.length})
              </h4>
              <div className="space-y-1">
                {filteredGrouped.in_progress.map((hypothesis) => (
                  <HypothesisRow
                    key={hypothesis.id}
                    hypothesis={hypothesis}
                    projectPath={projectPath}
                  />
                ))}
              </div>
            </div>
          )}

          {/* To Do Section */}
          {filteredGrouped.unverified.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Circle className="w-3 h-3" />
                To Do ({filteredGrouped.unverified.length})
              </h4>
              <div className="space-y-1">
                {filteredGrouped.unverified.map((hypothesis) => (
                  <HypothesisRow
                    key={hypothesis.id}
                    hypothesis={hypothesis}
                    projectPath={projectPath}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Done Section */}
          {filteredGrouped.done.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3" />
                Done ({filteredGrouped.done.length})
              </h4>
              <div className="space-y-1">
                {filteredGrouped.done.map((hypothesis) => (
                  <HypothesisRow
                    key={hypothesis.id}
                    hypothesis={hypothesis}
                    projectPath={projectPath}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* New Hypothesis Modal */}
      <AnimatePresence>
        {isNewModalOpen && (
          <NewHypothesisModal onClose={() => setIsNewModalOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
