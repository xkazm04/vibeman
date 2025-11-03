'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Caveat } from 'next/font/google';
import { useOnboardingStore } from '@/stores/onboardingStore';

const caveat = Caveat({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
});

export interface OnboardingTask {
  id: string;
  label: string;
  description?: string;
  completed: boolean;
}

interface OnboardingPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TaskItemProps {
  task: OnboardingTask;
  index: number;
  isNextTask: boolean;
  isFutureTask: boolean;
}

const TaskItem = ({ task, index, isNextTask, isFutureTask }: TaskItemProps) => {
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
};

export default function OnboardingPanel({ isOpen, onClose }: OnboardingPanelProps) {
  const { completedSteps, isStepCompleted } = useOnboardingStore();

  // Build tasks from store
  const tasks: OnboardingTask[] = [
    {
      id: 'create-project',
      label: 'Create a project',
      description: 'Set up your first project to start building',
      completed: isStepCompleted('create-project')
    },
    {
      id: 'generate-docs',
      label: 'Generate documentation',
      description: 'Use AI to analyze and document your codebase',
      completed: isStepCompleted('generate-docs')
    },
    {
      id: 'compose-context',
      label: 'Compose a context',
      description: 'Group related files together for better organization',
      completed: isStepCompleted('compose-context')
    },
    {
      id: 'scan-ideas',
      label: 'Scan for ideas',
      description: 'Let AI specialists discover improvement opportunities',
      completed: isStepCompleted('scan-ideas')
    },
    {
      id: 'let-code',
      label: 'Let it Code',
      description: 'Start implementing ideas with AI assistance',
      completed: isStepCompleted('let-code')
    },
  ];

  // Find the next incomplete task
  const nextTaskIndex = tasks.findIndex(task => !task.completed);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Onboarding Panel - Slides from top */}
          <motion.div
            initial={{ y: '-100%', opacity: 0 }}
            animate={{ y: 80, opacity: 1 }}
            exit={{ y: '-100%', opacity: 0 }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 200,
              mass: 0.8,
            }}
            className="fixed left-1/2 -translate-x-1/2 z-50 w-full max-w-md"
          >
            {/* Paper-like card */}
            <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-amber-200/20 rounded-lg shadow-2xl shadow-amber-500/10 p-8">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1 rounded-full bg-gray-700/50 hover:bg-gray-600/50 transition-colors"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-white" />
              </button>

              {/* Paper texture overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-amber-50/5 to-transparent rounded-lg pointer-events-none" />

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`${caveat.className} text-4xl text-amber-200/90 mb-6 font-semibold`}
                style={{ textShadow: '0 2px 10px rgba(251, 191, 36, 0.3)' }}
              >
                Getting Started
              </motion.h2>

              {/* Tasks list */}
              <div className="space-y-4">
                {tasks.map((task, index) => {
                  const isNextTask = index === nextTaskIndex;
                  const isFutureTask = nextTaskIndex !== -1 && index > nextTaskIndex;

                  return (
                    <TaskItem
                      key={task.id}
                      task={task}
                      index={index}
                      isNextTask={isNextTask}
                      isFutureTask={isFutureTask}
                    />
                  );
                })}
              </div>

              {/* Decorative corner elements */}
              <div className="absolute top-2 left-2 w-8 h-8 border-l-2 border-t-2 border-amber-200/20 rounded-tl-lg" />
              <div className="absolute bottom-2 right-2 w-8 h-8 border-r-2 border-b-2 border-amber-200/20 rounded-br-lg" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
