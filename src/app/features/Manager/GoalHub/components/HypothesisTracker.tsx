/**
 * Hypothesis Tracker Component
 * Kanban-style view for managing hypotheses
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  CheckCircle2,
  Clock,
  Circle,
  Loader2,
  Filter,
  LayoutGrid,
  List,
} from 'lucide-react';
import { useGoalHubStore } from '@/stores/goalHubStore';
import HypothesisCard from './HypothesisCard';
import NewHypothesisModal from './NewHypothesisModal';
import type { GoalHypothesis, HypothesisStatus } from '@/app/db/models/goal-hub.types';

interface HypothesisTrackerProps {
  hypotheses: GoalHypothesis[];
  isLoading: boolean;
  projectPath: string;
}

type ViewMode = 'kanban' | 'list';

export default function HypothesisTracker({
  hypotheses,
  isLoading,
  projectPath,
}: HypothesisTrackerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  const { createHypothesis } = useGoalHubStore();

  // Group hypotheses by status
  const grouped = {
    unverified: hypotheses.filter((h) => h.status === 'unverified'),
    in_progress: hypotheses.filter((h) => h.status === 'in_progress'),
    verified: hypotheses.filter((h) => h.status === 'verified'),
  };

  // Filter by category if selected
  const filteredGrouped = filterCategory
    ? {
        unverified: grouped.unverified.filter((h) => h.category === filterCategory),
        in_progress: grouped.in_progress.filter((h) => h.category === filterCategory),
        verified: grouped.verified.filter((h) => h.category === filterCategory),
      }
    : grouped;

  // Get unique categories
  const categories = Array.from(new Set(hypotheses.map((h) => h.category)));

  const columns: Array<{
    status: HypothesisStatus;
    title: string;
    icon: typeof Circle;
    color: string;
    bgColor: string;
  }> = [
    {
      status: 'unverified',
      title: 'To Verify',
      icon: Circle,
      color: 'text-gray-400',
      bgColor: 'bg-gray-800/50',
    },
    {
      status: 'in_progress',
      title: 'In Progress',
      icon: Clock,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
    },
    {
      status: 'verified',
      title: 'Verified',
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
  ];

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
          {/* View Toggle */}
          <div className="flex items-center bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded ${
                viewMode === 'kanban'
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded ${
                viewMode === 'list'
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Add Hypothesis */}
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Hypothesis
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
      ) : viewMode === 'kanban' ? (
        /* Kanban View */
        <div className="grid grid-cols-3 gap-4">
          {columns.map((column) => {
            const Icon = column.icon;
            const items = filteredGrouped[column.status as keyof typeof filteredGrouped];

            return (
              <div
                key={column.status}
                className={`${column.bgColor} border border-gray-800 rounded-xl p-4`}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Icon className={`w-4 h-4 ${column.color}`} />
                  <h4 className={`font-medium ${column.color}`}>{column.title}</h4>
                  <span className="ml-auto text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                    {items.length}
                  </span>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  <AnimatePresence>
                    {items.map((hypothesis) => (
                      <motion.div
                        key={hypothesis.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                      >
                        <HypothesisCard
                          hypothesis={hypothesis}
                          projectPath={projectPath}
                          compact
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="space-y-3">
          <AnimatePresence>
            {hypotheses.map((hypothesis) => (
              <motion.div
                key={hypothesis.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <HypothesisCard hypothesis={hypothesis} projectPath={projectPath} />
              </motion.div>
            ))}
          </AnimatePresence>
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
