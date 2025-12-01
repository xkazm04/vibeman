'use client';

import { motion } from 'framer-motion';
import { Caveat } from 'next/font/google';
import { StarterTasksProps } from '../lib/types';
import OnboardingTaskItem from '../../components/OnboardingTaskItem';

const caveat = Caveat({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
});

/**
 * Starter Tasks List Component
 * Displays onboarding tasks with progress tracking using the unified OnboardingTaskItem
 */
export default function StarterTasks({ tasks, onTaskClick }: StarterTasksProps) {
  const nextTaskIndex = tasks.findIndex(task => !task.completed);

  return (
    <>
      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className={`${caveat.className} text-5xl text-cyan-200/90 mb-2 font-semibold`}
        style={{ textShadow: '0 2px 10px rgba(34, 211, 238, 0.5)' }}
        data-testid="starter-tasks-title"
      >
        Getting Started
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="text-sm text-gray-400 mb-8 font-sans"
      >
        Complete these tasks to unlock the full potential of your development workflow.
      </motion.p>

      {/* Tasks list */}
      <div className="space-y-5 mb-8" data-testid="starter-tasks-list">
        {tasks.map((task, index) => {
          const isNextTask = index === nextTaskIndex;
          const isFutureTask = nextTaskIndex !== -1 && index > nextTaskIndex;

          return (
            <OnboardingTaskItem
              key={task.id}
              task={task}
              index={index}
              isNextTask={isNextTask}
              isFutureTask={isFutureTask}
              theme="cyan"
              onClick={() => onTaskClick(task)}
              animationDelay={0.4}
            />
          );
        })}
      </div>
    </>
  );
}
