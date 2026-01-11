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
      {/* Toolbar Card */}
      <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/80 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Category Filter */}
            {categories.length > 0 && (
              <div className="flex items-center gap-2 bg-gray-800/60 rounded-lg px-3 py-1.5 border border-gray-700/50">
                <Filter className="w-4 h-4 text-cyan-400" />
                <select
                  value={filterCategory || ''}
                  onChange={(e) => setFilterCategory(e.target.value || null)}
                  className="bg-transparent text-sm text-gray-300 focus:outline-none cursor-pointer"
                >
                  <option value="" className="bg-gray-900">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat} className="bg-gray-900">
                      {cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="px-2 py-1 rounded-md bg-gray-800/60 border border-gray-700/50">
                {hypotheses.length} total
              </span>
              {incompleteCount > 0 && (
                <span className="px-2 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  {incompleteCount} pending
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Complete All */}
            {incompleteCount > 0 && (
              <button
                onClick={handleCompleteAll}
                disabled={isCompletingAll}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 rounded-lg text-sm font-medium transition-all shadow-lg shadow-purple-500/20 disabled:shadow-none"
              >
                {isCompletingAll ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Complete All
              </button>
            )}

            {/* Add Hypothesis */}
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 rounded-lg text-sm font-medium transition-all shadow-lg shadow-cyan-500/20"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {hypotheses.length === 0 ? (
        <div className="relative overflow-hidden text-center py-20 bg-gradient-to-b from-gray-900/60 to-gray-900/30 backdrop-blur-sm border border-gray-800/80 border-dashed rounded-2xl">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-gray-700/50 shadow-xl">
              <Circle className="w-10 h-10 text-gray-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-200 mb-3">
              No Hypotheses Yet
            </h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
              Generate a breakdown using the Breakdown tab to create hypotheses automatically,
              or add them manually.
            </p>
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 rounded-xl font-medium shadow-xl shadow-cyan-500/20 transition-all hover:shadow-cyan-500/30 hover:-translate-y-0.5"
            >
              <Plus className="w-5 h-5" />
              Add First Hypothesis
            </button>
          </div>
        </div>
      ) : (
        /* Single Column List */
        <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/80 rounded-2xl overflow-hidden shadow-xl">
          {/* Card Header */}
          <div className="px-5 py-4 border-b border-gray-800/60 bg-gray-900/40">
            <h3 className="text-xs font-mono font-medium text-cyan-400/80 uppercase tracking-wider">
              Hypothesis List
            </h3>
          </div>

          {/* Scrollable Content */}
          <div className="p-4 space-y-6 max-h-[550px] overflow-y-auto custom-scrollbar">
            {/* In Progress Section */}
            {filteredGrouped.in_progress.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <div className="p-1 rounded-md bg-cyan-500/10 border border-cyan-500/20">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <h4 className="text-xs font-medium text-cyan-400 uppercase tracking-wider">
                    In Progress
                  </h4>
                  <span className="ml-auto px-2 py-0.5 text-[10px] font-medium bg-cyan-500/10 text-cyan-400 rounded-full border border-cyan-500/20">
                    {filteredGrouped.in_progress.length}
                  </span>
                </div>
                <div className="space-y-2">
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
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <div className="p-1 rounded-md bg-gray-700/50 border border-gray-600/30">
                    <Circle className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                  <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    To Do
                  </h4>
                  <span className="ml-auto px-2 py-0.5 text-[10px] font-medium bg-gray-700/50 text-gray-400 rounded-full border border-gray-600/30">
                    {filteredGrouped.unverified.length}
                  </span>
                </div>
                <div className="space-y-2">
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
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <div className="p-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <h4 className="text-xs font-medium text-emerald-400 uppercase tracking-wider">
                    Done
                  </h4>
                  <span className="ml-auto px-2 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
                    {filteredGrouped.done.length}
                  </span>
                </div>
                <div className="space-y-2">
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
