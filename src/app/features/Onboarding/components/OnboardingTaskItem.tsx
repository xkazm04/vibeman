'use client';

import { motion } from 'framer-motion';
import { Caveat } from 'next/font/google';

const caveat = Caveat({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
});

/**
 * Theme variants for the onboarding task item
 * - amber: Used in OnboardingPanel (warm, paper-like appearance)
 * - cyan: Used in StarterTasks (cool, modern appearance)
 */
export type OnboardingTaskTheme = 'amber' | 'cyan';

export interface OnboardingTaskItemTask {
  id: string;
  label: string;
  description?: string;
  completed: boolean;
}

export interface OnboardingTaskItemProps {
  task: OnboardingTaskItemTask;
  index: number;
  isNextTask: boolean;
  isFutureTask: boolean;
  theme?: OnboardingTaskTheme;
  onClick?: () => void;
  animationDelay?: number;
}

/**
 * Unified Onboarding Task Item Component
 *
 * Renders a single onboarding task with:
 * - Animated checkbox with checkmark
 * - Task label with hand-drawn font
 * - Optional description
 * - Strikethrough animation when completed
 * - Highlight effect for the next task
 * - Configurable theme (amber or cyan)
 */
export default function OnboardingTaskItem({
  task,
  index,
  isNextTask,
  isFutureTask,
  theme = 'amber',
  onClick,
  animationDelay = 0.3,
}: OnboardingTaskItemProps) {
  const isClickable = !!onClick;

  // Theme-based styling
  const themeStyles = {
    amber: {
      borderCompleted: 'border-green-400/70',
      borderIncomplete: 'border-amber-200/40',
      textCompleted: 'text-gray-500',
      textIncomplete: 'text-amber-100/90',
      textShadow: '0 1px 10px rgba(251, 191, 36, 0.2)',
      highlightGradient: 'from-cyan-400/20 via-blue-400/15 to-cyan-500/20',
      highlightBlur: 'from-cyan-400/10 via-blue-400/5 to-cyan-500/10',
      underlineGradient: 'from-transparent via-amber-200/30 to-transparent',
      useDiamond: true,
    },
    cyan: {
      borderCompleted: 'border-green-400/70',
      borderIncomplete: 'border-cyan-200/40',
      textCompleted: 'text-gray-500',
      textIncomplete: 'text-cyan-100/90',
      textShadow: '0 1px 10px rgba(34, 211, 238, 0.3)',
      highlightGradient: 'from-cyan-400/10 via-blue-400/10 to-cyan-500/10',
      highlightBlur: '',
      underlineGradient: 'from-transparent via-cyan-200/30 to-transparent',
      useDiamond: false,
    },
  };

  const styles = themeStyles[theme];
  const baseDelay = animationDelay + index * 0.1;

  return (
    <motion.div
      initial={{ opacity: 0, x: isClickable ? -30 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: baseDelay }}
      className={`relative ${isClickable ? 'cursor-pointer' : ''}`}
      style={{
        opacity: isFutureTask ? 0.4 : 1,
        transition: 'opacity 0.3s ease',
      }}
      onClick={onClick}
      data-testid={`onboarding-task-${task.id}`}
    >
      {/* Highlight for next task */}
      {isNextTask && (
        <motion.div
          initial={{ opacity: 0, scale: styles.useDiamond ? 0.8 : 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: baseDelay + 0.2 }}
          className={`absolute ${styles.useDiamond ? '-inset-3' : '-inset-4'} -z-10`}
        >
          {styles.useDiamond ? (
            <>
              <div
                className={`absolute inset-0 bg-gradient-to-br ${styles.highlightGradient} blur-md`}
                style={{
                  clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                }}
              />
              <div
                className={`absolute inset-0 bg-gradient-to-br ${styles.highlightBlur}`}
                style={{
                  clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                }}
              />
            </>
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-r ${styles.highlightGradient} rounded-lg blur-sm`} />
          )}
        </motion.div>
      )}

      <div className={`flex items-${isClickable ? 'start' : 'center'} gap-${isClickable ? '4' : '3'} ${isClickable ? 'hover:opacity-80 transition-opacity' : ''}`}>
        {/* Checkbox - hand-drawn style */}
        <div className={`relative flex-shrink-0 ${isClickable ? 'mt-1' : ''}`}>
          <div
            className={`w-6 h-6 border-2 rounded-sm transition-all duration-300 ${
              task.completed
                ? `${styles.borderCompleted} bg-green-400/10`
                : `${styles.borderIncomplete} bg-transparent`
            }`}
            style={{
              transform: `rotate(${(index % 5) * 1.2 - 2}deg)`,
            }}
          >
            {task.completed && (
              <motion.svg
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: isClickable ? 0 : baseDelay }}
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

        {/* Task label and description */}
        <div className="relative flex-1">
          <div className="relative">
            <span
              className={`${caveat.className} text-2xl transition-all duration-300 ${
                task.completed ? styles.textCompleted : styles.textIncomplete
              }`}
              style={{
                textShadow: task.completed ? 'none' : styles.textShadow,
              }}
            >
              {task.label}
            </span>

            {/* Strikethrough line for completed tasks */}
            {task.completed && (
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.6, delay: isClickable ? 0 : baseDelay + 0.1 }}
                className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-500 origin-left"
                style={{
                  transform: `translateY(-50%) rotate(${(index % 3) * 0.8 - 1}deg)`,
                }}
              />
            )}
          </div>

          {/* Description for incomplete tasks */}
          {!task.completed && task.description && (
            <motion.p
              initial={{ opacity: 0, y: isClickable ? 0 : -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: baseDelay + 0.2 }}
              className="text-xs text-gray-400/90 mt-1 font-sans"
            >
              {task.description}
            </motion.p>
          )}
        </div>
      </div>

      {/* Hand-drawn underline for incomplete tasks (non-clickable variant only) */}
      {!isClickable && !task.completed && (
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 0.3 }}
          transition={{ duration: 0.5, delay: baseDelay + 0.2 }}
          className={`h-px bg-gradient-to-r ${styles.underlineGradient} mt-1 origin-left`}
        />
      )}
    </motion.div>
  );
}
