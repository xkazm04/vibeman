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
      <div className="flex items-center justify-center py-20 bg-gray-900/30 border border-gray-800 rounded-xl">
        <div className="text-center">
          <Target className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No Active Goal</h3>
          <p className="text-gray-500 mb-4">Select a goal from the list or create a new one</p>
          <button
            onClick={onNewGoal}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg mx-auto"
          >
            <Plus className="w-4 h-4" />
            Create Goal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Goal Header with Progress */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  goal.status === 'in_progress'
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                    : goal.status === 'done'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-gray-500/20 text-gray-400 border border-gray-500/40'
                }`}
              >
                {goal.status === 'in_progress' ? 'In Progress' : goal.status === 'done' ? 'Complete' : 'Open'}
              </span>
              {goal.targetDate && (
                <span className="text-xs text-gray-500">
                  Target: {new Date(goal.targetDate).toLocaleDateString()}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{goal.title}</h2>
            {goal.description && <p className="text-gray-400">{goal.description}</p>}
          </div>

          {goal.status !== 'done' && (
            <button
              onClick={() => onCompleteGoal(goal.id)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium transition-all text-white"
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

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.id === 'hypotheses' && hypothesisCounts.total > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-800 rounded">
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
