'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Caveat } from 'next/font/google';
import { useOnboardingStore } from '@/stores/onboardingStore';
import GettingStartedItem from './GettingStartedItem';

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

export default function OnboardingPanel({ isOpen, onClose }: OnboardingPanelProps) {
  const { isStepCompleted, activeProjectId } = useOnboardingStore();

  // Build tasks from store - now project-specific
  const tasks: OnboardingTask[] = [
    {
      id: 'create-project',
      label: 'Register a project',
      description: 'Connect your codebase to start analyzing',
      completed: isStepCompleted('create-project', activeProjectId ?? undefined)
    },
    {
      id: 'run-blueprint',
      label: 'Run blueprint scan',
      description: 'Analyze project structure and auto-create contexts',
      completed: isStepCompleted('run-blueprint', activeProjectId ?? undefined)
    },
    {
      id: 'review-contexts',
      label: 'Review contexts',
      description: 'Organize your code into logical feature groups',
      completed: isStepCompleted('review-contexts', activeProjectId ?? undefined)
    },
    {
      id: 'generate-ideas',
      label: 'Generate ideas',
      description: 'AI agents analyze code for improvements',
      completed: isStepCompleted('generate-ideas', activeProjectId ?? undefined)
    },
    {
      id: 'evaluate-ideas',
      label: 'Evaluate ideas',
      description: 'Swipe to accept or reject suggested improvements',
      completed: isStepCompleted('evaluate-ideas', activeProjectId ?? undefined)
    },
    {
      id: 'run-task',
      label: 'Run first task',
      description: 'Execute an accepted idea with Claude Code',
      completed: isStepCompleted('run-task', activeProjectId ?? undefined)
    },
    {
      id: 'review-impl',
      label: 'Review implementation',
      description: 'Accept or reject AI-generated code changes',
      completed: isStepCompleted('review-impl', activeProjectId ?? undefined)
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
                    <GettingStartedItem
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
