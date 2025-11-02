'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Caveat } from 'next/font/google';
import { Target, Plus, Sparkles } from 'lucide-react';
import { Goal } from '@/types';
import { useGoalContext } from '@/contexts/GoalContext';
import GoalRow from './GoalRow';
import GoalsDetailModal from '@/app/features/Goals/sub_GoalModal/GoalsDetailModal';
import GoalsAddModal from '@/app/features/Goals/sub_GoalModal/components/GoalsAddModal';
import GoalCandidatesModal from '@/app/features/Goals/sub_GoalModal/components/GoalCandidatesModal';

const caveat = Caveat({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
});

interface GoalReviewerProps {
  projectId: string;
}

export default function GoalReviewer({ projectId }: GoalReviewerProps) {
  const { goals, loading, createGoal, updateGoal, fetchGoals } = useGoalContext();
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCandidatesModal, setShowCandidatesModal] = useState(false);

  const handleGoalClick = (goal: Goal) => {
    setSelectedGoal(goal);
    setShowDetailModal(true);
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
      <div className="grid grid-cols-2 gap-3">
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowAddModal(true)}
          data-testid="add-goal-manual-btn"
          className="group p-4 border-2 border-dashed border-gray-600/50 hover:border-cyan-500/50 rounded-lg transition-all flex items-center justify-center gap-2"
        >
          <div className="p-1.5 bg-cyan-500/10 rounded-lg border border-cyan-500/30 group-hover:bg-cyan-500/20 transition-colors">
            <Plus className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="text-sm font-medium text-gray-400 group-hover:text-cyan-400 transition-colors">
            Add Goal
          </span>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowCandidatesModal(true)}
          data-testid="generate-ai-goals-btn"
          className="group p-4 border-2 border-dashed border-purple-600/50 hover:border-purple-500/50 rounded-lg transition-all flex items-center justify-center gap-2"
        >
          <div className="p-1.5 bg-purple-500/10 rounded-lg border border-purple-500/30 group-hover:bg-purple-500/20 transition-colors">
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <span className="text-sm font-medium text-gray-400 group-hover:text-purple-400 transition-colors">
            AI Goals
          </span>
        </motion.button>
      </div>

      {/* Goal Detail Modal */}
      {selectedGoal && (
        <GoalsDetailModal
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
      <GoalsAddModal
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
