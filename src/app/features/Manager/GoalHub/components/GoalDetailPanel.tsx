/**
 * GoalDetailPanel Component
 * Displays active goal details with tabs for hypotheses, breakdown, activity
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Plus, ListChecks, Sparkles, Activity, CheckCircle2 } from 'lucide-react';
import type { ExtendedGoal } from '@/app/db/models/goal-hub.types';
import type { GoalHypothesis } from '@/app/db/models/goal-hub.types';
import GoalProgress from './GoalProgress';

type TabType = 'hypotheses' | 'breakdown' | 'activity';

interface GoalDetailPanelProps {
  goal: ExtendedGoal | null;
  hypotheses: GoalHypothesis[];
  hypothesisCounts: { total: number; verified: number; inProgress: number };
  isLoadingHypotheses: boolean;
  projectPath: string;
  projectId: string;
  onCompleteGoal: (goalId: string) => void;
  onNewGoal: () => void;
  onBreakdownCreated: () => void;
  HypothesisTracker: React.ComponentType<{
    hypotheses: GoalHypothesis[];
    isLoading: boolean;
    projectPath: string;
  }>;
  BreakdownPanel: React.ComponentType<{
    projectPath: string;
    projectId: string;
    onBreakdownCreated: () => void;
  }>;
  ActivityFeed: React.ComponentType<{ projectId: string }>;
}

const tabs: Array<{ id: TabType; label: string; icon: typeof ListChecks }> = [
  { id: 'hypotheses', label: 'Hypotheses', icon: ListChecks },
  { id: 'breakdown', label: 'Breakdown', icon: Sparkles },
  { id: 'activity', label: 'Activity', icon: Activity },
];

export default function GoalDetailPanel({
  goal,
  hypotheses,
  hypothesisCounts,
  isLoadingHypotheses,
  projectPath,
  projectId,
  onCompleteGoal,
  onNewGoal,
  onBreakdownCreated,
  HypothesisTracker,
  BreakdownPanel,
  ActivityFeed,
}: GoalDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('hypotheses');

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
      {/* Goal Header with Progress */}
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

          <GoalProgress
            total={hypothesisCounts.total}
            verified={hypothesisCounts.verified}
            inProgress={hypothesisCounts.inProgress}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-gray-900/60 backdrop-blur-sm border border-gray-800/80 rounded-xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${
                activeTab === tab.id
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50 border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.id === 'hypotheses' && hypothesisCounts.total > 0 && (
                <span className={`ml-1 px-2 py-0.5 text-[10px] font-medium rounded-full ${
                  activeTab === tab.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'bg-gray-800/80 text-gray-400 border border-gray-700/50'
                }`}>
                  {hypothesisCounts.verified}/{hypothesisCounts.total}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'hypotheses' && (
          <motion.div
            key="hypotheses"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <HypothesisTracker hypotheses={hypotheses} isLoading={isLoadingHypotheses} projectPath={projectPath} />
          </motion.div>
        )}

        {activeTab === 'breakdown' && (
          <motion.div
            key="breakdown"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <BreakdownPanel projectPath={projectPath} projectId={projectId} onBreakdownCreated={onBreakdownCreated} />
          </motion.div>
        )}

        {activeTab === 'activity' && (
          <motion.div
            key="activity"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ActivityFeed projectId={projectId} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
