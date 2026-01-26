/**
 * Goal Hub Layout
 * Main orchestration view for goal-driven development
 */

'use client';

import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Loader2 } from 'lucide-react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { GoalProvider, useGoalContext } from '@/contexts/GoalContext';

// Eagerly loaded components
import GoalHubHeader from './components/GoalHubHeader';
import SyncButtons from './components/SyncButtons';
import GoalAddDrawer from './components/GoalAddDrawer';
import EmptyProjectState from './components/EmptyProjectState';
import AutomationTrigger from './components/AutomationTrigger';

// Lazy loaded components
const GoalDetailPanel = lazy(() => import('./components/GoalDetailPanel'));
const StandupPanel = lazy(() => import('./components/StandupPanel'));
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

function GoalHubContent({ projectId, projectName, projectPath }: { projectId: string; projectName: string; projectPath: string }) {
  const [viewMode, setViewMode] = useState<ViewMode>('goals');
  const [isGoalPanelOpen, setIsGoalPanelOpen] = useState(false);
  const [selectedGoalForModal, setSelectedGoalForModal] = useState<string | null>(null);

  const {
    activeGoal,
    goals,
    loading: isLoading,
    error,
    fetchGoals,
    setActiveGoal,
    completeGoal,
    clearError,
  } = useGoalContext();

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
  }, [goals.length, activeGoal, setActiveGoal, goals]);

  const handleCloseModal = useCallback(() => {
    setSelectedGoalForModal(null);
  }, []);

  const handleCompleteGoal = useCallback(async (goalId: string) => {
    await completeGoal(goalId);
  }, [completeGoal]);

  const selectedGoal = goals.find((g) => g.id === selectedGoalForModal);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <GoalHubHeader
        projectName={projectName}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      >
        <AutomationTrigger
          projectId={projectId}
          projectPath={projectPath}
          projectName={projectName}
          onAutomationComplete={() => fetchGoals()}
        />
        <SyncButtons projectId={projectId} />
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
              projectId={projectId}
              projectName={projectName}
              projectPath={projectPath}
              onGoalCreated={() => fetchGoals()}
            />
          </Suspense>
        ) : (
          <div className="grid grid-cols-12 gap-6">
            {/* Left Panel - Goal Reviewer */}
            <div className="col-span-3">
              <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/80 rounded-2xl p-4 shadow-xl">
                <Suspense fallback={<LoadingSpinner />}>
                  <GoalReviewer
                    projectId={projectId}
                    onGoalSelect={(goal) => {
                      if (goal !== 'add') {
                        const foundGoal = goals.find((g) => g.id === goal.id);
                        if (foundGoal) {
                          setActiveGoal(foundGoal);
                        }
                      } else {
                        setIsGoalPanelOpen(true);
                      }
                    }}
                  />
                </Suspense>
              </div>
            </div>

            {/* Main Panel */}
            <div className="col-span-9">
              <Suspense fallback={<LoadingSpinner />}>
                <GoalDetailPanel
                  goal={activeGoal}
                  projectId={projectId}
                  onCompleteGoal={handleCompleteGoal}
                  onNewGoal={() => setIsGoalPanelOpen(true)}
                />
              </Suspense>
            </div>
          </div>
        )}
      </div>

      {/* Goal Add Drawer */}
      <GoalAddDrawer
        isOpen={isGoalPanelOpen}
        projectId={projectId}
        projectPath={projectPath}
        onClose={() => setIsGoalPanelOpen(false)}
        onGoalCreated={async () => {
          await fetchGoals();
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
              projectId: projectId,
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
                  await fetchGoals();
                  return data.goal || null;
                }
                return null;
              } catch {
                return null;
              }
            }}
            projectId={projectId}
          />
        </Suspense>
      )}
    </div>
  );
}

export default function GoalHubLayout() {
  const activeProject = useActiveProjectStore((state) => state.activeProject);

  if (!activeProject) {
    return <EmptyProjectState />;
  }

  return (
    <GoalProvider projectId={activeProject.id}>
      <GoalHubContent
        projectId={activeProject.id}
        projectName={activeProject.name}
        projectPath={activeProject.path}
      />
    </GoalProvider>
  );
}
