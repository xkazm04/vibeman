'use client';

import { motion } from 'framer-motion';
import { Caveat } from 'next/font/google';
import { Target } from 'lucide-react';
import { Goal } from '@/types';
import { useGoalContext } from '@/contexts/GoalContext';
import GoalsDetailModalContent from '@/app/features/Goals/sub_GoalModal/components/GoalsDetailModalContent';

const caveat = Caveat({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
});

interface GoalDetailPanelProps {
  goal: Goal;
  projectId: string;
  onClose: () => void;
}

export default function GoalDetailPanel({ goal, projectId, onClose }: GoalDetailPanelProps) {
  const { updateGoal, fetchGoals } = useGoalContext();

  const handleGoalSave = async (goalId: string, updates: Partial<Goal>) => {
    const result = await updateGoal(goalId, updates);
    // Refresh goals list after save
    fetchGoals();
    return result;
  };

  return (
    <>
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
            <Target className="w-5 h-5 text-cyan-400" />
          </div>
          <h2
            className={`${caveat.className} text-4xl text-cyan-200/90 font-semibold`}
            style={{ textShadow: '0 2px 10px rgba(34, 211, 238, 0.5)' }}
          >
            {goal.title}
          </h2>
        </div>
        <p className="text-sm text-gray-400 font-sans ml-14">
          Edit and manage goal information
        </p>
      </motion.div>

      {/* Divider */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.2 }}
        className="h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent mb-6"
      />

      {/* Goal Detail Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <GoalsDetailModalContent
          goal={goal}
          projectId={projectId}
          onSave={handleGoalSave}
          onClose={onClose}
        />
      </motion.div>
    </>
  );
}
