'use client';

import { motion } from 'framer-motion';
import { Caveat } from 'next/font/google';
import { StarterTasksProps } from '../lib/types';

const caveat = Caveat({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
});

/**
 * Starter Tasks List Component
 * Displays onboarding tasks with progress tracking
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
      <div className="space-y-5 mb-8">
        {tasks.map((task, index) => {
          const isNextTask = index === nextTaskIndex;
          const isFutureTask = nextTaskIndex !== -1 && index > nextTaskIndex;

          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className="relative cursor-pointer"
              style={{
                opacity: isFutureTask ? 0.4 : 1,
                transition: 'opacity 0.3s ease'
              }}
              onClick={() => onTaskClick(task)}
              data-testid={`task-${task.id}`}
            >
              {/* Highlight for next task */}
              {isNextTask && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute -inset-4 bg-gradient-to-r from-cyan-400/10 via-blue-400/10 to-cyan-500/10 rounded-lg blur-sm -z-10"
                />
              )}

              <div className="flex items-start gap-4 hover:opacity-80 transition-opacity">
                {/* Checkbox */}
                <div className="relative flex-shrink-0 mt-1">
                  <div
                    className={`w-6 h-6 border-2 rounded-sm transition-all duration-300 ${
                      task.completed
                        ? 'border-green-400/70 bg-green-400/10'
                        : 'border-cyan-200/40 bg-transparent'
                    }`}
                    style={{
                      transform: `rotate(${Math.random() * 4 - 2}deg)`,
                    }}
                  >
                    {task.completed && (
                      <motion.svg
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0 w-full h-full p-1"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <motion.path
                          d="M5 13l4 4L19 7"
                          stroke="#4ade80"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </motion.svg>
                    )}
                  </div>
                </div>

                {/* Task content */}
                <div className="flex-1">
                  <div className="relative">
                    <span
                      className={`${caveat.className} text-2xl transition-all duration-300 ${
                        task.completed
                          ? 'text-gray-500'
                          : 'text-cyan-100/90'
                      }`}
                      style={{
                        textShadow: task.completed
                          ? 'none'
                          : '0 1px 10px rgba(34, 211, 238, 0.3)',
                      }}
                    >
                      {task.label}
                    </span>

                    {/* Strikethrough for completed */}
                    {task.completed && (
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.6 }}
                        className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-500 origin-left"
                      />
                    )}
                  </div>

                  {/* Description */}
                  {!task.completed && task.description && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className="text-xs text-gray-400/90 mt-1 font-sans"
                    >
                      {task.description}
                    </motion.p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </>
  );
}
