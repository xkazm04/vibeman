'use client';

import { motion } from 'framer-motion';
import { Caveat } from 'next/font/google';
import { OnboardingTask } from './OnboardingPanel';

const caveat = Caveat({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
});

interface GettingStartedItemProps {
  task: OnboardingTask;
  index: number;
  isNextTask: boolean;
  isFutureTask: boolean;
}

export default function GettingStartedItem({ task, index, isNextTask, isFutureTask }: GettingStartedItemProps) {
  return (
    <motion.div
      key={task.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 + index * 0.1 }}
      className="relative"
      style={{
        opacity: isFutureTask ? 0.4 : 1,
        transition: 'opacity 0.3s ease'
      }}
    >
      {/* Diamond gradient background for next task */}
      {isNextTask && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.5 + index * 0.1 }}
          className="absolute -inset-3 -z-10"
        >
          <div
            className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 via-blue-400/15 to-cyan-500/20 blur-md"
            style={{
              clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
            }}
          />
          <div
            className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-blue-400/5 to-cyan-500/10"
            style={{
              clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
            }}
          />
        </motion.div>
      )}

      <div className="flex items-center gap-3">
        {/* Checkbox - hand-drawn style */}
        <div className="relative flex-shrink-0">
          <div
            className={`w-6 h-6 border-2 rounded-sm transition-all duration-300 ${
              task.completed
                ? 'border-green-400/70 bg-green-400/10'
                : 'border-amber-200/40 bg-transparent'
            }`}
            style={{
              transform: `rotate(${Math.random() * 4 - 2}deg)`,
            }}
          >
            {task.completed && (
              <motion.svg
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
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
          <div>
            <span
              className={`${caveat.className} text-2xl transition-all duration-300 ${
                task.completed
                  ? 'text-gray-500'
                  : 'text-amber-100/90'
              }`}
              style={{
                textShadow: task.completed
                  ? 'none'
                  : '0 1px 10px rgba(251, 191, 36, 0.2)',
              }}
            >
              {task.label}
            </span>

            {/* Strikethrough line for completed tasks */}
            {task.completed && (
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.6, delay: 0.4 + index * 0.1 }}
                className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-500 origin-left"
                style={{
                  transform: `translateY(-50%) rotate(${Math.random() * 2 - 1}deg)`,
                }}
              />
            )}
          </div>

          {/* Description for incomplete tasks */}
          {!task.completed && task.description && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className="text-xs text-gray-400/80 mt-1 font-sans"
            >
              {task.description}
            </motion.p>
          )}
        </div>
      </div>

      {/* Hand-drawn underline for incomplete tasks */}
      {!task.completed && (
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 0.3 }}
          transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
          className="h-px bg-gradient-to-r from-transparent via-amber-200/30 to-transparent mt-1 origin-left"
        />
      )}
    </motion.div>
  );
}
