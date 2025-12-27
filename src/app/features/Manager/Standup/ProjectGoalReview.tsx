/**
 * ProjectGoalReview Component
 * Single project step in the standup wizard
 * Shows Open/In-Progress goals for review and allows adding new goals
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Goal } from '@/types';
import GoalAddPanel from '@/app/features/Onboarding/sub_GoalDrawer/GoalAddPanel';
import { useProjectGoals } from './hooks';
import { ProjectHeader } from './components/ProjectHeader';
import { GoalsSummary } from './components/GoalsSummary';
import { GoalsList } from './components/GoalsList';

interface ProjectGoalReviewProps {
  projectId: string;
  projectName: string;
  projectPath: string;
  projectType?: string;
  onConfirm: () => void;
  isLastStep: boolean;
}

export default function ProjectGoalReview({
  projectId,
  projectName,
  projectPath,
  projectType,
}: ProjectGoalReviewProps) {
  const [showAddPanel, setShowAddPanel] = useState(false);

  const {
    goals,
    openGoals,
    inProgressGoals,
    isLoading,
    expandedGoalId,
    editingGoalId,
    editingStatus,
    setExpandedGoalId,
    startEditing,
    cancelEditing,
    setEditingStatus,
    saveStatus,
    addGoal,
  } = useProjectGoals(projectId);

  const handleAddGoal = async (goalData: Omit<Goal, 'id' | 'order' | 'projectId'>) => {
    await addGoal(goalData, projectPath);
    setShowAddPanel(false);
  };

  const handleToggleExpand = (goalId: string) => {
    setExpandedGoalId(expandedGoalId === goalId ? null : goalId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Project Header */}
      <ProjectHeader
        projectName={projectName}
        projectPath={projectPath}
        projectType={projectType}
        projectId={projectId}
        onAddGoal={() => setShowAddPanel(true)}
      />

      {/* Goals Summary */}
      <GoalsSummary
        openCount={openGoals.length}
        inProgressCount={inProgressGoals.length}
      />

      {/* Goals List */}
      <GoalsList
        goals={goals}
        openGoals={openGoals}
        inProgressGoals={inProgressGoals}
        expandedGoalId={expandedGoalId}
        editingGoalId={editingGoalId}
        editingStatus={editingStatus}
        onToggleExpand={handleToggleExpand}
        onStartEdit={startEditing}
        onCancelEdit={cancelEditing}
        onStatusChange={setEditingStatus}
        onSaveStatus={saveStatus}
        onAddGoal={() => setShowAddPanel(true)}
      />

      {/* Add Goal Panel */}
      <AnimatePresence>
        {showAddPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddPanel(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-gray-900 rounded-2xl border border-gray-700/50 p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <GoalAddPanel
                projectId={projectId}
                projectPath={projectPath}
                onSubmit={handleAddGoal}
                onClose={() => setShowAddPanel(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
