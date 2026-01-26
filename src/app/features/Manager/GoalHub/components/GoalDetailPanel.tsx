/**
 * GoalDetailPanel Component
 * Displays active goal details with context targets
 */

'use client';

import { motion } from 'framer-motion';
import { Target, Plus, CheckCircle2 } from 'lucide-react';
import type { Goal } from '@/types';
import ContextTargetsList from '@/components/ContextComponents/ContextTargetsList';

interface GoalDetailPanelProps {
  goal: Goal | null;
  projectId: string;
  onCompleteGoal: (goalId: string) => void;
  onNewGoal: () => void;
}

export default function GoalDetailPanel({
  goal,
  projectId,
  onCompleteGoal,
  onNewGoal,
}: GoalDetailPanelProps) {
  if (!goal) {
    return (
      <div className="relative overflow-hidden flex items-center justify-center py-24 bg-gradient-to-b from-gray-900/60 to-gray-900/30 backdrop-blur-sm border border-gray-800/80 rounded-2xl">
        {/* Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.02)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

        <div className="relative text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-gray-700/50 shadow-xl">
            <Target className="w-10 h-10 text-gray-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-200 mb-3">No Active Goal</h3>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto">Select a goal from the list or create a new one to get started</p>
          <button
            onClick={onNewGoal}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 rounded-xl font-medium shadow-xl shadow-cyan-500/20 transition-all hover:shadow-cyan-500/30 hover:-translate-y-0.5"
          >
            <Plus className="w-5 h-5" />
            Create Goal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Goal Header */}
      <div className="relative overflow-hidden bg-gray-900/60 backdrop-blur-sm border border-gray-800/80 rounded-2xl shadow-xl">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />

        <div className="relative p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wide ${
                    goal.status === 'in_progress'
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                      : goal.status === 'done'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                      : 'bg-gray-700/50 text-gray-400 border border-gray-600/40'
                  }`}
                >
                  {goal.status === 'in_progress' ? 'In Progress' : goal.status === 'done' ? 'Complete' : 'Open'}
                </span>
                {goal.targetDate && (
                  <span className="text-xs text-gray-500 px-2 py-1 bg-gray-800/50 rounded-lg border border-gray-700/50">
                    Target: {new Date(goal.targetDate).toLocaleDateString()}
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">{goal.title}</h2>
              {goal.description && <p className="text-gray-400 leading-relaxed">{goal.description}</p>}
            </div>

            {goal.status !== 'done' && (
              <button
                onClick={() => onCompleteGoal(goal.id)}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 rounded-xl font-medium transition-all text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:-translate-y-0.5"
                title="Mark goal as complete"
              >
                <CheckCircle2 className="w-4 h-4" />
                Complete Goal
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Context Targets */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/80 rounded-2xl p-6 shadow-xl"
      >
        <ContextTargetsList
          projectId={projectId}
          compact={false}
          defaultCollapsed={false}
        />
      </motion.div>
    </div>
  );
}
