'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useRefactorStore } from '@/stores/refactorStore';
import { Check, Settings, Scan, Lightbulb, Eye, Package, Play, BarChart3 } from 'lucide-react';

const steps = [
  { id: 'settings', label: 'Configure', description: 'Setup scan scope', icon: Settings },
  { id: 'scan', label: 'Analyze', description: 'Scanning codebase', icon: Scan },
  { id: 'plan', label: 'Plan', description: 'AI strategy', icon: Lightbulb },
  { id: 'review', label: 'Review', description: 'Verify findings', icon: Eye },
  { id: 'package', label: 'Package', description: 'Group changes', icon: Package },
  { id: 'execute', label: 'Execute', description: 'Apply fixes', icon: Play },
  { id: 'results', label: 'Results', description: 'View summary', icon: BarChart3 },
] as const;

export default function WizardProgress() {
  const { currentStep, analysisProgress, analysisStatus } = useRefactorStore();
  const currentIndex = steps.findIndex(s => s.id === currentStep);

  // Calculate overall progress
  const overallProgress = Math.round((currentIndex / (steps.length - 1)) * 100);

  return (
    <div className="space-y-6" data-testid="wizard-progress">
      {/* Header with progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium text-white/40 uppercase tracking-widest">Journey</h3>
          <span className="text-xs font-mono text-cyan-400/60">{overallProgress}%</span>
        </div>

        {/* Overall progress bar */}
        <div className="h-1 bg-black/50 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500"
            initial={{ width: '0%' }}
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Step list */}
      <div className="relative">
        {/* Animated connecting line */}
        <div className="absolute left-[18px] top-6 bottom-6 w-[2px] bg-gradient-to-b from-white/5 via-white/10 to-white/5 rounded-full" />

        {/* Completed progress overlay */}
        <motion.div
          className="absolute left-[18px] top-6 w-[2px] bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"
          initial={{ height: 0 }}
          animate={{
            height: currentIndex > 0 ? `${(currentIndex / (steps.length - 1)) * 100}%` : 0
          }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />

        <div className="space-y-1">
          {steps.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isPending = index > currentIndex;
            const Icon = step.icon;

            // Determine if this step is running (only scan step can show progress)
            const isRunning = isCurrent && step.id === 'scan' && (analysisStatus === 'scanning' || analysisStatus === 'analyzing');

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`relative flex items-center gap-3 py-3 px-2 rounded-lg transition-all duration-300
                  ${isCurrent ? 'bg-gradient-to-r from-cyan-500/10 to-transparent' : ''}
                  ${isPending ? 'opacity-40' : 'opacity-100'}
                `}
              >
                {/* Step Indicator */}
                <div className="relative z-10 flex-shrink-0">
                  <motion.div
                    initial={false}
                    animate={{
                      backgroundColor: isCompleted ? '#06b6d4' : 'rgba(0,0,0,0.8)',
                      borderColor: isCompleted ? '#06b6d4' : isCurrent ? '#06b6d4' : 'rgba(255,255,255,0.1)',
                      scale: isCurrent ? 1.1 : 1,
                    }}
                    transition={{ duration: 0.2 }}
                    className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center
                      ${isCurrent ? 'shadow-[0_0_20px_rgba(6,182,212,0.4)]' : ''}
                    `}
                  >
                    {isCompleted ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', bounce: 0.5 }}
                      >
                        <Check className="w-4 h-4 text-black" strokeWidth={3} />
                      </motion.div>
                    ) : isCurrent ? (
                      <div className="relative">
                        <Icon className="w-4 h-4 text-cyan-400" />
                        {isRunning && (
                          <motion.div
                            className="absolute -inset-2 border-2 border-cyan-400/50 rounded-xl"
                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          />
                        )}
                      </div>
                    ) : (
                      <Icon className="w-4 h-4 text-white/30" />
                    )}
                  </motion.div>
                </div>

                {/* Label and description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className={`text-sm font-medium truncate ${
                      isCurrent ? 'text-cyan-400' : isCompleted ? 'text-white' : 'text-white/50'
                    }`}>
                      {step.label}
                    </h4>
                    {isRunning && (
                      <motion.div
                        className="flex gap-0.5"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <span className="w-1 h-1 bg-cyan-400 rounded-full" />
                        <span className="w-1 h-1 bg-cyan-400 rounded-full" />
                        <span className="w-1 h-1 bg-cyan-400 rounded-full" />
                      </motion.div>
                    )}
                  </div>
                  <p className={`text-xs truncate ${
                    isCurrent ? 'text-cyan-400/60' : 'text-white/30'
                  }`}>
                    {isRunning ? `${analysisProgress}% complete` : step.description}
                  </p>
                </div>

                {/* Step number badge */}
                <div className={`flex-shrink-0 text-[10px] font-mono ${
                  isCompleted ? 'text-cyan-400/50' : isCurrent ? 'text-cyan-400' : 'text-white/20'
                }`}>
                  {String(index + 1).padStart(2, '0')}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Quick stats */}
      <AnimatePresence>
        {currentIndex > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="pt-4 border-t border-white/5"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/30">Steps completed</span>
              <span className="font-mono text-cyan-400">
                {currentIndex} / {steps.length}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
