/**
 * Goal Hub Layout
 * Main orchestration view for goal-driven development
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  Sparkles,
  ListChecks,
  Activity,
  Plus,
  Loader2,
  X,
} from 'lucide-react';
import { useGoalHubStore } from '@/stores/goalHubStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { loadRequirements } from '@/app/Claude/lib/requirementApi';
import GoalPanel from './components/GoalPanel';
import HypothesisTracker from './components/HypothesisTracker';
import ActivityFeed from './components/ActivityFeed';
import BreakdownPanel from './components/BreakdownPanel';
import GoalAddPanel from '@/app/features/Onboarding/sub_GoalDrawer/GoalAddPanel';
import GoalProgress from './components/GoalProgress';

type TabType = 'hypotheses' | 'breakdown' | 'activity';

export default function GoalHubLayout() {
  const [activeTab, setActiveTab] = useState<TabType>('hypotheses');
  const [isGoalPanelOpen, setIsGoalPanelOpen] = useState(false);
  const [breakdownStatus, setBreakdownStatus] = useState<Record<string, boolean>>({});

  const activeProject = useActiveProjectStore((state) => state.activeProject);
  const {
    activeGoal,
    goals,
    hypotheses,
    hypothesisCounts,
    isLoading,
    isLoadingHypotheses,
    error,
    loadGoals,
    setActiveGoal,
    clearError,
  } = useGoalHubStore();

  // Load goals when project changes
  useEffect(() => {
    if (activeProject?.id) {
      loadGoals(activeProject.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject?.id]);

  // Auto-select first goal if none selected (only when goals change, not on activeGoal change)
  useEffect(() => {
    if (!activeGoal && goals.length > 0) {
      // Find first in-progress or open goal
      const activeOrOpen = goals.find(
        (g) => g.status === 'in_progress' || g.status === 'open'
      );
      if (activeOrOpen) {
        setActiveGoal(activeOrOpen);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goals.length]);

  // Check for breakdown requirement files
  const checkBreakdownStatus = useCallback(async () => {
    if (!activeProject?.path || goals.length === 0) return;

    try {
      const requirements = await loadRequirements(activeProject.path);
      const status: Record<string, boolean> = {};

      goals.forEach((goal) => {
        // Breakdown files are named: goal-breakdown-{goalId.slice(0,8)}
        const prefix = `goal-breakdown-${goal.id.slice(0, 8)}`;
        status[goal.id] = requirements.some((r) => r.startsWith(prefix));
      });

      setBreakdownStatus(status);
    } catch (error) {
      console.error('Failed to check breakdown status:', error);
    }
  }, [activeProject?.path, goals]);

  // Check breakdown status when goals change
  useEffect(() => {
    checkBreakdownStatus();
  }, [checkBreakdownStatus]);

  const tabs: Array<{ id: TabType; label: string; icon: typeof ListChecks }> = [
    { id: 'hypotheses', label: 'Hypotheses', icon: ListChecks },
    { id: 'breakdown', label: 'Breakdown', icon: Sparkles },
    { id: 'activity', label: 'Activity', icon: Activity },
  ];

  if (!activeProject) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-300 mb-2">
            Select a Project
          </h2>
          <p className="text-gray-500">
            Choose a project to start managing goals
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-xl border border-cyan-500/30">
                <Target className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  Goal Hub
                </h1>
                <p className="text-sm text-gray-500">
                  {activeProject.name} - Goal-driven development
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsGoalPanelOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 rounded-lg font-medium transition-all"
            >
              <Plus className="w-4 h-4" />
              New Goal
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-red-500/10 border-b border-red-500/30 px-6 py-3"
          >
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <p className="text-red-400 text-sm">{error}</p>
              <button
                onClick={clearError}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-6">
            {/* Left Panel - Goals List */}
            <div className="col-span-3">
              <GoalPanel
                goals={goals}
                activeGoal={activeGoal}
                breakdownStatus={breakdownStatus}
                onSelectGoal={setActiveGoal}
                onNewGoal={() => setIsGoalPanelOpen(true)}
              />
            </div>

            {/* Main Panel */}
            <div className="col-span-9">
              {activeGoal ? (
                <div className="space-y-6">
                  {/* Goal Header with Progress */}
                  <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            activeGoal.status === 'in_progress'
                              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                              : activeGoal.status === 'done'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : 'bg-gray-500/20 text-gray-400 border border-gray-500/40'
                          }`}>
                            {activeGoal.status === 'in_progress' ? 'In Progress' :
                             activeGoal.status === 'done' ? 'Complete' : 'Open'}
                          </span>
                          {activeGoal.targetDate && (
                            <span className="text-xs text-gray-500">
                              Target: {new Date(activeGoal.targetDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">
                          {activeGoal.title}
                        </h2>
                        {activeGoal.description && (
                          <p className="text-gray-400">{activeGoal.description}</p>
                        )}
                      </div>
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
                        <HypothesisTracker
                          hypotheses={hypotheses}
                          isLoading={isLoadingHypotheses}
                          projectPath={activeProject.path}
                        />
                      </motion.div>
                    )}

                    {activeTab === 'breakdown' && (
                      <motion.div
                        key="breakdown"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                      >
                        <BreakdownPanel
                          projectPath={activeProject.path}
                          projectId={activeProject.id}
                          onBreakdownCreated={checkBreakdownStatus}
                        />
                      </motion.div>
                    )}

                    {activeTab === 'activity' && (
                      <motion.div
                        key="activity"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                      >
                        <ActivityFeed projectId={activeProject.id} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex items-center justify-center py-20 bg-gray-900/30 border border-gray-800 rounded-xl">
                  <div className="text-center">
                    <Target className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-300 mb-2">
                      No Active Goal
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Select a goal from the list or create a new one
                    </p>
                    <button
                      onClick={() => setIsGoalPanelOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg mx-auto"
                    >
                      <Plus className="w-4 h-4" />
                      Create Goal
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* New Goal Drawer */}
      <AnimatePresence>
        {isGoalPanelOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={() => setIsGoalPanelOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-0 h-full w-full max-w-xl bg-gray-900/95 backdrop-blur-xl border-l border-gray-700/50 shadow-2xl overflow-y-auto"
            >
              <div className="relative p-8">
                <button
                  onClick={() => setIsGoalPanelOpen(false)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-gray-800/50 hover:bg-gray-700/50 transition-colors z-10"
                >
                  <X className="w-5 h-5 text-gray-400 hover:text-white" />
                </button>
                <GoalAddPanel
                  projectId={activeProject.id}
                  onSubmit={async (newGoal) => {
                    try {
                      const response = await fetch('/api/goals', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          ...newGoal,
                          projectId: activeProject.id,
                        }),
                      });

                      if (response.ok) {
                        const data = await response.json();
                        // Reload goals and set the new one as active
                        await loadGoals(activeProject.id);
                        if (data.goal) {
                          setActiveGoal(data.goal);
                        }
                      }
                    } catch (err) {
                      // Error handling
                      console.error('Failed to create goal:', err);
                    }
                  }}
                  onClose={() => setIsGoalPanelOpen(false)}
                  projectPath={activeProject.path}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
