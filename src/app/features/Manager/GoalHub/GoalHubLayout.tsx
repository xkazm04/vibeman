/**
 * Goal Hub Layout
 * Main orchestration view for goal-driven development
 */

'use client';

import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Loader2 } from 'lucide-react';
import { useGoalHubStore } from '@/stores/goalHubStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { loadRequirements } from '@/app/Claude/lib/requirementApi';
import { GoalProvider } from '@/contexts/GoalContext';

// Eagerly loaded components
import GoalHubHeader from './components/GoalHubHeader';
import SyncButtons from './components/SyncButtons';
import GoalListPanel from './components/GoalListPanel';
import GoalAddDrawer from './components/GoalAddDrawer';
import EmptyProjectState from './components/EmptyProjectState';
import AutomationTrigger from './components/AutomationTrigger';

// Lazy loaded components
const GoalDetailPanel = lazy(() => import('./components/GoalDetailPanel'));
const StandupPanel = lazy(() => import('./components/StandupPanel'));
const HypothesisTracker = lazy(() => import('./components/HypothesisTracker'));
const BreakdownPanel = lazy(() => import('./components/BreakdownPanel'));
const ActivityFeed = lazy(() => import('./components/ActivityFeed'));
const GoalReviewer = lazy(() => import('@/app/features/Onboarding/sub_GoalDrawer/GoalReviewer'));
const GoalModal = lazy(() => import('@/app/features/Goals/sub_GoalModal/GoalModal'));

type ViewMode = 'goals' | 'standup';

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
    </div>
  );
}

export default function GoalHubLayout() {
  const [viewMode, setViewMode] = useState<ViewMode>('goals');
  const [isGoalPanelOpen, setIsGoalPanelOpen] = useState(false);
  const [breakdownStatus, setBreakdownStatus] = useState<Record<string, boolean>>({});
  const [selectedGoalForModal, setSelectedGoalForModal] = useState<string | null>(null);

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
    completeGoal,
    clearError,
  } = useGoalHubStore();

  // Load goals when project changes
  useEffect(() => {
    if (activeProject?.id) {
      loadGoals(activeProject.id);
    }
  }, [activeProject?.id, loadGoals]);

  // Auto-select first goal if none selected
  useEffect(() => {
    if (!activeGoal && goals.length > 0) {
      const activeOrOpen = goals.find(
        (g) => g.status === 'in_progress' || g.status === 'open'
      );
      if (activeOrOpen) {
        setActiveGoal(activeOrOpen);
      }
    }
  }, [goals.length, activeGoal, setActiveGoal]);

  // Check for breakdown requirement files
  const checkBreakdownStatus = useCallback(async () => {
    if (!activeProject?.path || goals.length === 0) return;

    try {
      const requirements = await loadRequirements(activeProject.path);
      const status: Record<string, boolean> = {};

      goals.forEach((goal) => {
        const prefix = `goal-breakdown-${goal.id.slice(0, 8)}`;
        status[goal.id] = requirements.some((r) => r.startsWith(prefix));
      });

      setBreakdownStatus(status);
    } catch (error) {
      console.error('Failed to check breakdown status:', error);
    }
  }, [activeProject?.path, goals]);

  useEffect(() => {
    checkBreakdownStatus();
  }, [checkBreakdownStatus]);

  const handleGoalDetails = useCallback((goal: { id: string }) => {
    setSelectedGoalForModal(goal.id);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedGoalForModal(null);
  }, []);

  if (!activeProject) {
    return <EmptyProjectState />;
  }

  const selectedGoal = goals.find((g) => g.id === selectedGoalForModal);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <GoalHubHeader
        projectName={activeProject.name}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      >
        <AutomationTrigger
          projectId={activeProject.id}
          projectPath={activeProject.path}
          projectName={activeProject.name}
          onAutomationComplete={() => loadGoals(activeProject.id)}
        />
        <SyncButtons projectId={activeProject.id} />
        <button
          onClick={() => setIsGoalPanelOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 rounded-lg font-medium transition-all"
        >
          <Plus className="w-4 h-4" />
          New Goal
        </button>
      </GoalHubHeader>

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
              <button onClick={clearError} className="text-red-400 hover:text-red-300 text-sm">
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {isLoading ? (
          <LoadingSpinner />
        ) : viewMode === 'standup' ? (
          <Suspense fallback={<LoadingSpinner />}>
            <StandupPanel
              projectId={activeProject.id}
              projectName={activeProject.name}
              projectPath={activeProject.path}
              onGoalCreated={() => loadGoals(activeProject.id)}
            />
          </Suspense>
        ) : (
          <div className="grid grid-cols-12 gap-6">
            {/* Left Panel - Goals List */}
            <div className="col-span-3 space-y-4">
              <GoalListPanel
                goals={goals}
                activeGoal={activeGoal}
                breakdownStatus={breakdownStatus}
                onSelectGoal={setActiveGoal}
                onNewGoal={() => setIsGoalPanelOpen(true)}
                onGoalDetails={handleGoalDetails}
              />

              {/* Goal Reviewer Panel */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                <Suspense fallback={<LoadingSpinner />}>
                  <GoalProvider projectId={activeProject.id}>
                    <GoalReviewer projectId={activeProject.id} />
                  </GoalProvider>
                </Suspense>
              </div>
            </div>

            {/* Main Panel */}
            <div className="col-span-9">
              <Suspense fallback={<LoadingSpinner />}>
                <GoalDetailPanel
                  goal={activeGoal}
                  hypotheses={hypotheses}
                  hypothesisCounts={hypothesisCounts}
                  isLoadingHypotheses={isLoadingHypotheses}
                  projectPath={activeProject.path}
                  projectId={activeProject.id}
                  onCompleteGoal={completeGoal}
                  onNewGoal={() => setIsGoalPanelOpen(true)}
                  onBreakdownCreated={checkBreakdownStatus}
                  HypothesisTracker={HypothesisTracker}
                  BreakdownPanel={BreakdownPanel}
                  ActivityFeed={ActivityFeed}
                />
              </Suspense>
            </div>
          </div>
        )}
      </div>

      {/* Goal Add Drawer */}
      <GoalAddDrawer
        isOpen={isGoalPanelOpen}
        projectId={activeProject.id}
        projectPath={activeProject.path}
        onClose={() => setIsGoalPanelOpen(false)}
        onGoalCreated={async (goal) => {
          await loadGoals(activeProject.id);
          setActiveGoal(goal);
          setIsGoalPanelOpen(false);
        }}
      />

      {/* Goal Detail Modal (right-click) */}
      {selectedGoal && (
        <Suspense fallback={null}>
          <GoalModal
            mode="detail"
            goal={{
              id: selectedGoal.id,
              title: selectedGoal.title,
              description: selectedGoal.description || '',
              status: selectedGoal.status,
              projectId: activeProject.id,
              order: 0,
            }}
            isOpen={!!selectedGoalForModal}
            onClose={handleCloseModal}
            onSave={async (goalId, updates) => {
              try {
                const response = await fetch('/api/goals', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id: goalId, ...updates }),
                });
                if (response.ok) {
                  const data = await response.json();
                  await loadGoals(activeProject.id);
                  return data.goal || null;
                }
                return null;
              } catch {
                return null;
              }
            }}
            projectId={activeProject.id}
          />
        </Suspense>
      )}
    </div>
  );
}
