/**
 * ManualStandup Component
 * Daily review for all projects with context-based goal creation
 */

'use client';

import { lazy, Suspense, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  CheckCircle,
  Play,
  Loader2,
} from 'lucide-react';
import type { DailyReviewDecision } from '../lib/dailyReviewTypes';
import { useDailyReview } from '../hooks/useDailyReview';
import { useProjectContexts, type Context } from '../hooks/useProjectContexts';
import { ContextGroupsView } from './ContextGroupsView';
import { GoalForm } from './GoalForm';
import { ServerControlBar } from './ServerControlBar';

// Lazy load completion summary
const CompletionSummary = lazy(() => import('./ManualStandupSummary'));

interface Project {
  id: string;
  name: string;
  path: string;
  type?: string;
}

interface ManualStandupProps {
  projects: Project[];
}

const DECISION_OPTIONS: Array<{
  value: DailyReviewDecision;
  label: string;
  icon: typeof Plus;
  color: string;
  bg: string;
}> = [
  {
    value: 'new_goal',
    label: 'New Goal',
    icon: Plus,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/30',
  },
  {
    value: 'goal_update',
    label: 'Goal Update',
    icon: RefreshCw,
    color: 'text-blue-400',
    bg: 'bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/30',
  },
  {
    value: 'no_change',
    label: 'No Change',
    icon: CheckCircle,
    color: 'text-gray-400',
    bg: 'bg-gray-700/50 hover:bg-gray-700/70 border-gray-600/30',
  },
];

function StartReviewButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg border border-purple-500/30 transition-colors"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Play className="w-4 h-4" />
      <span className="text-sm font-medium">Start Daily Review</span>
    </motion.button>
  );
}

export function ManualStandup({ projects }: ManualStandupProps) {
  const {
    currentProject,
    isComplete,
    hasStarted,
    summary,
    startReview,
    submitDecision,
    goNext,
    goPrevious,
    canGoNext,
    canGoPrevious,
    state,
  } = useDailyReview({ projects });

  const [isVisible, setIsVisible] = useState(true);
  const [selectedDecision, setSelectedDecision] = useState<DailyReviewDecision | null>(null);
  const [selectedContext, setSelectedContext] = useState<Context | null>(null);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch contexts for current project
  const { groupedContexts, isLoading: contextsLoading } = useProjectContexts(
    currentProject?.projectId ?? null
  );

  // Reset form when project changes
  useEffect(() => {
    setSelectedDecision(null);
    setSelectedContext(null);
    setGoalTitle('');
    setGoalDescription('');
    setFormError(null);
  }, [currentProject?.projectId]);

  // Hide when complete
  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => setIsVisible(false), 5000);
      return () => clearTimeout(timer);
    }
    setIsVisible(true);
  }, [isComplete]);

  const handleDecisionClick = (decision: DailyReviewDecision) => {
    if (decision === 'new_goal') {
      setSelectedDecision('new_goal');
    } else {
      // For goal_update and no_change, submit immediately
      setSelectedDecision(null);
      setSelectedContext(null);
      submitDecision(decision);
    }
  };

  const handleContextSelect = (context: Context) => {
    setSelectedContext(context);
    setFormError(null);
  };

  const handleGoalSubmit = useCallback(async (title: string, description: string) => {
    if (!selectedContext || !currentProject) {
      setFormError('Please select a context');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      // Create goal via API
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject.projectId,
          contextId: selectedContext.id,
          title,
          description,
          status: 'open',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create goal');
      }

      // Success - submit the decision and move on
      setSelectedDecision(null);
      setSelectedContext(null);
      setGoalTitle('');
      setGoalDescription('');
      submitDecision('new_goal');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create goal');
    } finally {
      setIsSubmitting(false);
    }
  }, [currentProject, selectedContext, submitDecision]);

  const handleCancelGoal = () => {
    setSelectedDecision(null);
    setSelectedContext(null);
    setGoalTitle('');
    setGoalDescription('');
    setFormError(null);
  };

  const handleSaveGoal = () => {
    if (!goalTitle.trim() || !goalDescription.trim()) {
      setFormError('Title and description are required');
      return;
    }
    if (!selectedContext) {
      setFormError('Please select a context');
      return;
    }
    handleGoalSubmit(goalTitle.trim(), goalDescription.trim());
  };

  // Don't render if complete and hidden
  if (!isVisible && isComplete) {
    return null;
  }

  // No projects
  if (projects.length === 0) {
    return null;
  }

  // Not started - show start button
  if (!hasStarted) {
    return (
      <div className="bg-gray-900/50 rounded-xl border border-gray-700/50 p-6">
        <div className="flex flex-col items-center justify-center py-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Daily Project Review</h3>
          <p className="text-xs text-gray-500 mb-4 text-center max-w-xs">
            Review each project and decide if you need to create new goals or update existing ones.
          </p>
          <StartReviewButton onClick={startReview} />
        </div>
      </div>
    );
  }

  // Completed - show summary
  if (isComplete && summary) {
    return (
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: isVisible ? 1 : 0 }}
        className="bg-gray-900/50 rounded-xl border border-emerald-500/30 p-4"
      >
        <Suspense fallback={<div className="h-20 animate-pulse bg-gray-800/50 rounded" />}>
          <CompletionSummary summary={summary} />
        </Suspense>
      </motion.div>
    );
  }

  // Active review
  if (!currentProject || !state) return null;

  const currentIndex = state.currentIndex;
  const totalProjects = state.projects.length;
  const showGoalForm = selectedDecision === 'new_goal';

  // Find the full project data to get the type
  const fullProject = projects.find(p => p.id === currentProject.projectId);

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-700/50 overflow-hidden">
      {/* Header with project name and navigation arrows */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
        <button
          onClick={goPrevious}
          disabled={!canGoPrevious}
          className={`p-1.5 rounded transition-colors ${
            canGoPrevious
              ? 'hover:bg-gray-700/50 text-gray-300'
              : 'text-gray-600 cursor-not-allowed'
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 text-center">
          <h3 className="text-sm font-medium text-gray-200">{currentProject.projectName}</h3>
          <p className="text-xs text-gray-500">
            {currentIndex + 1} of {totalProjects} projects
          </p>
        </div>

        <button
          onClick={goNext}
          disabled={!canGoNext}
          className={`p-1.5 rounded transition-colors ${
            canGoNext
              ? 'hover:bg-gray-700/50 text-gray-300'
              : 'text-gray-600 cursor-not-allowed'
          }`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Server Control Bar */}
      <ServerControlBar
        projectId={currentProject.projectId}
        projectPath={fullProject?.path || ''}
        projectType={fullProject?.type}
      />

      {/* Context groups view */}
      <div className="p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentProject.projectId}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <ContextGroupsView
              groupedContexts={groupedContexts}
              selectedContextId={selectedContext?.id ?? null}
              onSelectContext={handleContextSelect}
              isLoading={contextsLoading}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Goal form (appears when New Goal is selected) */}
      <AnimatePresence>
        {showGoalForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-2"
          >
            <div className="bg-gray-800/60 rounded-lg border border-emerald-500/30 p-3 space-y-3">
              {/* Title Input */}
              <input
                type="text"
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                placeholder="Goal title *"
                disabled={isSubmitting}
                className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700/50 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              />

              {/* Description Input */}
              <textarea
                value={goalDescription}
                onChange={(e) => setGoalDescription(e.target.value)}
                placeholder="Goal description *"
                disabled={isSubmitting}
                rows={2}
                className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700/50 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-none"
              />

              {/* Selected context indicator */}
              {selectedContext && (
                <p className="text-xs text-emerald-400">
                  Context: {selectedContext.name}
                </p>
              )}

              {/* Error */}
              {formError && (
                <p className="text-xs text-red-400">{formError}</p>
              )}

              {/* Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleCancelGoal}
                  disabled={isSubmitting}
                  className="flex-1 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-300 bg-gray-700/50 hover:bg-gray-700/70 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveGoal}
                  disabled={isSubmitting || !goalTitle.trim() || !goalDescription.trim() || !selectedContext}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-emerald-400 bg-emerald-500/20 hover:bg-emerald-500/30 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Save Goal
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decision options */}
      <div className="px-4 pb-4">
        <div className="flex gap-2">
          {DECISION_OPTIONS.map((option) => {
            const isSelected = selectedDecision === option.value || currentProject.decision === option.value;
            return (
              <button
                key={option.value}
                onClick={() => handleDecisionClick(option.value)}
                disabled={isSubmitting}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border transition-all ${
                  isSelected
                    ? `${option.bg} ${option.color} ring-1 ring-offset-1 ring-offset-gray-900`
                    : `${option.bg} ${option.color}`
                } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <option.icon className="w-4 h-4" />
                <span className="text-xs font-medium">{option.label}</span>
              </button>
            );
          })}
        </div>

        {/* Progress indicator */}
        <div className="mt-3 flex gap-1">
          {state.projects.map((p, idx) => (
            <div
              key={p.projectId}
              className={`flex-1 h-1 rounded-full transition-colors ${
                p.decision !== null
                  ? 'bg-emerald-500'
                  : idx === currentIndex
                  ? 'bg-purple-500'
                  : 'bg-gray-700'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default ManualStandup;
