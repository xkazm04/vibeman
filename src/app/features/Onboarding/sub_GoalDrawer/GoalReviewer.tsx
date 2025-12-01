'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Caveat } from 'next/font/google';
import { Target } from 'lucide-react';
import { Goal } from '@/types';
import { useGoalContext } from '@/contexts/GoalContext';
import GoalRow from './GoalRow';
import GoalAddButtons from './GoalAddButtons';
import { ContextTargetsList } from '@/components/ContextComponents';
import GoalModal from '@/app/features/Goals/sub_GoalModal/GoalModal';
import GoalCandidatesModal from '@/app/features/Goals/sub_GoalModal/components/GoalCandidatesModal';

const caveat = Caveat({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
});

interface GoalReviewerProps {
  projectId: string;
  onGoalSelect?: (goal: Goal | 'add') => void;
}

export default function GoalReviewer({ projectId, onGoalSelect }: GoalReviewerProps) {
  const { goals, loading, createGoal, updateGoal, fetchGoals } = useGoalContext();
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCandidatesModal, setShowCandidatesModal] = useState(false);

  const handleGoalClick = (goal: Goal) => {
    if (onGoalSelect) {
      // If onGoalSelect callback is provided, use it (Blueprint layout mode)
      onGoalSelect(goal);
    } else {
      // Otherwise, show modal (standalone mode)
      setSelectedGoal(goal);
      setShowDetailModal(true);
    }
  };

  const handleGoalSave = async (goalId: string, updates: Partial<Goal>) => {
    const result = await updateGoal(goalId, updates);
    return result;
  };

  const handleAddGoal = async (newGoal: Omit<Goal, 'id' | 'order' | 'projectId'>) => {
    const result = await createGoal({
      ...newGoal,
      projectId,
    });

    if (result) {
      setShowAddModal(false);
    }
  };

  return (
    <>
      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className={`${caveat.className} text-5xl text-cyan-200/90 mb-2 font-semibold`}
        style={{ textShadow: '0 2px 10px rgba(34, 211, 238, 0.5)' }}
      >
        Goal Reviewer
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="text-sm text-gray-400 mb-6 font-sans"
      >
        Review project goals and track idea implementation progress
      </motion.p>

      {/* Goals List */}
      <div className="space-y-3 mb-6">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          </div>
        )}

        {!loading && goals.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800/40 border border-gray-700/40 border-dashed rounded-lg p-8 text-center"
          >
            <Target className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-400 mb-1">No goals yet</p>
            <p className="text-xs text-gray-500">
              Create your first goal to start tracking progress
            </p>
          </motion.div>
        )}

        {!loading && goals.map((goal, index) => (
          <GoalRow
            key={goal.id}
            goal={goal}
            onClick={() => handleGoalClick(goal)}
            delay={index * 0.05}
          />
        ))}
      </div>

      {/* Divider */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.6 }}
        className="h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent mb-6"
      />

      {/* Add New Goal Buttons */}
      <GoalAddButtons
        onAddGoal={() => setShowAddModal(true)}
        onShowAIGoals={() => setShowCandidatesModal(true)}
        onGoalSelect={onGoalSelect}
      />

      {/* Context Targets Section */}
      <ContextTargetsList projectId={projectId} />

      {/* Goal Detail Modal - Only show if not using onGoalSelect callback */}
      {!onGoalSelect && selectedGoal && (
        <GoalModal
          mode="detail"
          goal={selectedGoal}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedGoal(null);
            // Refresh goals after closing
            fetchGoals();
          }}
          onSave={handleGoalSave}
          projectId={projectId}
        />
      )}

      {/* Add Goal Modal */}
      <GoalModal
        mode="add"
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddGoal}
      />

      {/* AI Goal Candidates Modal */}
      <GoalCandidatesModal
        isOpen={showCandidatesModal}
        onClose={() => setShowCandidatesModal(false)}
        onGoalCreated={() => {
          // Refresh goals when a candidate is accepted
          fetchGoals();
        }}
      />
    </>
  );
}
