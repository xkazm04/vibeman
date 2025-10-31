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
  location: 'coder' | 'ideas' | 'tinder' | 'tasker' | 'reflector';
}

interface ControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBlueprint: () => void;
}

export default function ControlPanel({ isOpen, onClose, onOpenBlueprint }: ControlPanelProps) {
  const { completedSteps, isStepCompleted, setActiveModule, closeControlPanel } = useOnboardingStore();

  // Build tasks from store
  const tasks: OnboardingTask[] = [
    {
      id: 'create-project',
      label: 'Create a project',
      description: 'Set up your first project to start building',
      completed: isStepCompleted('create-project'),
      location: 'coder'
    },
    {
      id: 'generate-docs',
      label: 'Generate documentation',
      description: 'Use AI to analyze and document your codebase',
      completed: isStepCompleted('generate-docs'),
      location: 'coder'
    },
    {
      id: 'compose-context',
      label: 'Compose a context',
      description: 'Group related files together for better organization',
      completed: isStepCompleted('compose-context'),
      location: 'coder'
    },
    {
      id: 'scan-ideas',
      label: 'Scan for ideas',
      description: 'Let AI specialists discover improvement opportunities',
      completed: isStepCompleted('scan-ideas'),
      location: 'ideas'
    },
    {
      id: 'let-code',
      label: 'Let it Code',
      description: 'Start implementing ideas with AI assistance',
      completed: isStepCompleted('let-code'),
      location: 'tasker'
    },
  ];

  const nextTaskIndex = tasks.findIndex(task => !task.completed);

  const handleTaskClick = (task: OnboardingTask) => {
    setActiveModule(task.location);
    closeControlPanel();
  };

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

          {/* Drawer Panel - Slides from left */}
          <motion.div
            initial={{ x: '-100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0 }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 250,
              mass: 0.8,
            }}
            className="fixed left-0 top-0 bottom-0 z-50 w-full max-w-md"
          >
            {/* Drawer content */}
            <div className="relative h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-r-2 border-cyan-500/30 shadow-2xl shadow-cyan-500/20 overflow-y-auto">
              {/* Blueprint pattern background */}
              <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                  backgroundImage: 'url(/patterns/bg_blueprint.jpg)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />

              <div className="relative p-8">
                {/* Close button */}
                <button
                  onClick={() => {
                    onClose();
                    closeControlPanel();
                  }}
                  className="absolute top-4 right-4 p-2 rounded-full bg-gray-700/50 hover:bg-gray-600/50 transition-colors z-10"
                >
                  <X className="w-4 h-4 text-gray-400 hover:text-white" />
                </button>

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
                        onClick={() => handleTaskClick(task)}
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

                {/* Divider */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.8 }}
                  className="h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent my-8"
                />

                {/* Blueprint Access Button - Hand-written style */}
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onOpenBlueprint}
                  className="group relative w-full py-8 flex items-center justify-center"
                >
                  {/* Hand-written text */}
                  <div className="relative">
                    <motion.h2
                      className={`${caveat.className} text-6xl font-bold text-cyan-300/80 group-hover:text-cyan-200 transition-all duration-300`}
                      style={{
                        textShadow: '0 0 20px rgba(34, 211, 238, 0.3)',
                        transform: 'rotate(-2deg)',
                      }}
                      whileHover={{
                        textShadow: '0 0 30px rgba(34, 211, 238, 0.6)',
                        letterSpacing: '0.05em',
                      }}
                    >
                      BLUEPRINT
                    </motion.h2>

                    {/* Underline accent */}
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: 1.1, duration: 0.6 }}
                      className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent origin-left"
                      style={{
                        transform: 'rotate(-1deg)',
                      }}
                    />
                  </div>

                  {/* Animated arrow */}
                  <motion.div
                    animate={{ x: [0, 8, 0] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="absolute right-8 text-4xl text-cyan-400/60 group-hover:text-cyan-400 transition-colors"
                  >
                    →
                  </motion.div>

                  {/* Glow effect on hover */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent rounded-xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  />
                </motion.button>

                {/* Decorative elements */}
                <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-cyan-200/20 rounded-tl-lg" />
                <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-cyan-200/20 rounded-br-lg" />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
