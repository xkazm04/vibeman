/**
 * GoalReviewer Component
 * Displays goals with status grouping, left-click selection, right-click modal
 */

'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Caveat } from 'next/font/google';
import { Target, CheckCircle2, Clock, Circle } from 'lucide-react';
import { Goal } from '@/types';
import { useGoalContext } from '@/contexts/GoalContext';
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

interface CompactGoalItemProps {
  goal: Goal;
  isActive: boolean;
  onSelect: (goal: Goal) => void;
  onContextMenu: (goal: Goal, event: React.MouseEvent) => void;
}

function CompactGoalItem({ goal, isActive, onSelect, onContextMenu }: CompactGoalItemProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-cyan-400" />;
      default:
        return <Circle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'border-emerald-500/40 bg-emerald-500/5';
      case 'in_progress':
        return 'border-cyan-500/40 bg-cyan-500/5';
      default:
        return 'border-gray-700 bg-gray-900/50';
    }
  };

  return (
    <button
      onClick={() => onSelect(goal)}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(goal, e);
      }}
      className={`w-full text-left py-1.5 px-2 rounded-lg border transition-colors ${
        isActive
          ? 'border-cyan-500 bg-cyan-500/10'
          : `${getStatusColor(goal.status)} hover:border-gray-600`
      }`}
    >
      <div className="flex items-center gap-2">
        {getStatusIcon(goal.status)}
        <h4 className={`text-sm font-medium truncate flex-1 ${isActive ? 'text-cyan-300' : 'text-white'}`}>
          {goal.title}
        </h4>
      </div>
    </button>
  );
}

export default function GoalReviewer({ projectId, onGoalSelect }: GoalReviewerProps) {
  const { goals, loading, createGoal, updateGoal, fetchGoals } = useGoalContext();
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCandidatesModal, setShowCandidatesModal] = useState(false);
  const [contextMenuGoal, setContextMenuGoal] = useState<Goal | null>(null);

  // Group goals by status
  const inProgressGoals = goals.filter((g) => g.status === 'in_progress');
  const openGoals = goals.filter((g) => g.status === 'open');
  const doneGoals = goals.filter((g) => g.status === 'done');

  const handleGoalSelect = useCallback((goal: Goal) => {
    setSelectedGoal(goal);
    if (onGoalSelect) {
      onGoalSelect(goal);
    }
  }, [onGoalSelect]);

  const handleContextMenu = useCallback((goal: Goal, _event: React.MouseEvent) => {
    setContextMenuGoal(goal);
    setShowDetailModal(true);
  }, []);

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

  const renderGoalGroup = (
    title: string,
    titleColor: string,
    groupGoals: Goal[]
  ) => {
    if (groupGoals.length === 0) return null;

    return (
      <div>
        <h4 className={`text-xs font-medium ${titleColor} uppercase tracking-wider mb-1.5`}>
          {title} ({groupGoals.length})
        </h4>
        <div className="space-y-1">
          {groupGoals.map((goal) => (
            <CompactGoalItem
              key={goal.id}
              goal={goal}
              isActive={selectedGoal?.id === goal.id}
              onSelect={handleGoalSelect}
              onContextMenu={handleContextMenu}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className={`${caveat.className} text-4xl text-cyan-200/90 mb-2 font-semibold`}
        style={{ textShadow: '0 2px 10px rgba(34, 211, 238, 0.5)' }}
      >
        Goal Reviewer
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="text-xs text-gray-400 mb-4 font-sans"
      >
        Left-click to select, right-click for details
      </motion.p>

      {/* Goals List with Status Grouping */}
      <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          </div>
        )}

        {!loading && goals.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800/40 border border-gray-700/40 border-dashed rounded-lg p-6 text-center"
          >
            <Target className="w-10 h-10 text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-400 mb-1">No goals yet</p>
            <p className="text-xs text-gray-500">Create your first goal</p>
          </motion.div>
        )}

        {!loading && (
          <>
            {renderGoalGroup('In Progress', 'text-cyan-400', inProgressGoals)}
            {renderGoalGroup('Open', 'text-gray-500', openGoals)}
            {renderGoalGroup('Completed', 'text-emerald-400', doneGoals)}
          </>
        )}
      </div>

      {/* Divider */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.6 }}
        className="h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent mb-4"
      />

      {/* Add New Goal Buttons */}
      <GoalAddButtons
        onAddGoal={() => setShowAddModal(true)}
        onShowAIGoals={() => setShowCandidatesModal(true)}
        onGoalSelect={onGoalSelect}
      />

      {/* Context Targets Section */}
      <ContextTargetsList projectId={projectId} />

      {/* Goal Detail Modal (right-click) */}
      {contextMenuGoal && (
        <GoalModal
          mode="detail"
          goal={contextMenuGoal}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setContextMenuGoal(null);
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
          fetchGoals();
        }}
      />
    </>
  );
}
