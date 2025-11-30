'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FolderOpen, Sparkles, Target, ChevronRight, Check } from 'lucide-react';

export type ContextStep = 'files' | 'description' | 'target';

interface StepConfig {
  id: ContextStep;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  keyHint: string;
}

const STEPS: StepConfig[] = [
  {
    id: 'files',
    label: 'File Selection',
    shortLabel: 'Files',
    description: 'Choose context files',
    icon: FolderOpen,
    keyHint: '1',
  },
  {
    id: 'description',
    label: 'Description Generation',
    shortLabel: 'Description',
    description: 'AI-generated overview',
    icon: Sparkles,
    keyHint: '2',
  },
  {
    id: 'target',
    label: 'Target Definition',
    shortLabel: 'Target',
    description: 'Define goals & fulfillment',
    icon: Target,
    keyHint: '3',
  },
];

interface BreadcrumbNavProps {
  currentStep: ContextStep;
  onStepChange: (step: ContextStep) => void;
  completedSteps: Set<ContextStep>;
  /** Whether each step can be navigated to */
  enabledSteps?: Partial<Record<ContextStep, boolean>>;
  className?: string;
}

export default function BreadcrumbNav({
  currentStep,
  onStepChange,
  completedSteps,
  enabledSteps = { files: true, description: true, target: true },
  className = '',
}: BreadcrumbNavProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Number keys 1-3 for direct step navigation
      if (event.key >= '1' && event.key <= '3') {
        const stepIndex = parseInt(event.key) - 1;
        const step = STEPS[stepIndex];
        if (step && enabledSteps[step.id] !== false) {
          onStepChange(step.id);
          event.preventDefault();
        }
        return;
      }

      // Arrow keys for sequential navigation
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        const nextIndex = Math.min(currentIndex + 1, STEPS.length - 1);
        const nextStep = STEPS[nextIndex];
        if (nextStep && enabledSteps[nextStep.id] !== false) {
          onStepChange(nextStep.id);
          event.preventDefault();
        }
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        const prevIndex = Math.max(currentIndex - 1, 0);
        const prevStep = STEPS[prevIndex];
        if (prevStep && enabledSteps[prevStep.id] !== false) {
          onStepChange(prevStep.id);
          event.preventDefault();
        }
      }
    },
    [currentIndex, enabledSteps, onStepChange]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Attach keyboard listener to the container when focused
    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Also listen for global keyboard shortcuts when container is focused
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      // Only respond if the breadcrumb container or its children are focused
      if (
        containerRef.current?.contains(document.activeElement) ||
        document.activeElement === containerRef.current
      ) {
        handleKeyDown(event);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleKeyDown]);

  return (
    <nav
      ref={containerRef}
      role="navigation"
      aria-label="Context creation steps"
      tabIndex={0}
      className={`focus:outline-none focus:ring-2 focus:ring-cyan-500/30 rounded-xl ${className}`}
      data-testid="breadcrumb-nav"
    >
      {/* Screen reader only: current step announcement */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Current step: {STEPS[currentIndex].label}, step {currentIndex + 1} of {STEPS.length}
      </div>

      <div className="flex items-center justify-between bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-xl p-2">
        {/* Progress bar background */}
        <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-transparent"
            initial={{ width: '0%' }}
            animate={{ width: `${((currentIndex + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>

        <ol className="relative flex items-center gap-2 w-full" role="list">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = completedSteps.has(step.id);
            const isCurrent = step.id === currentStep;
            const isEnabled = enabledSteps[step.id] !== false;
            const isPast = index < currentIndex;
            const isFuture = index > currentIndex;

            return (
              <li key={step.id} className="flex items-center flex-1" role="listitem">
                <button
                  onClick={() => isEnabled && onStepChange(step.id)}
                  disabled={!isEnabled}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-disabled={!isEnabled}
                  title={`${step.label}: ${step.description} (Press ${step.keyHint})`}
                  className={`
                    relative flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-cyan-500/50
                    ${
                      isCurrent
                        ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                        : isEnabled
                          ? 'hover:bg-gray-800/50 cursor-pointer'
                          : 'opacity-40 cursor-not-allowed'
                    }
                    ${isCompleted && !isCurrent ? 'text-cyan-400' : ''}
                  `}
                  data-testid={`breadcrumb-step-${step.id}`}
                >
                  {/* Step indicator */}
                  <div
                    className={`
                      relative flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200
                      ${
                        isCurrent
                          ? 'bg-cyan-500/20 border border-cyan-500/50'
                          : isCompleted
                            ? 'bg-cyan-500/30 border border-cyan-500/40'
                            : isPast
                              ? 'bg-gray-700/50 border border-gray-600/50'
                              : 'bg-gray-800/50 border border-gray-700/50'
                      }
                    `}
                  >
                    {isCompleted && !isCurrent ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', bounce: 0.5 }}
                      >
                        <Check className="w-3.5 h-3.5 text-cyan-400" strokeWidth={3} />
                      </motion.div>
                    ) : (
                      <Icon
                        className={`w-3.5 h-3.5 ${
                          isCurrent ? 'text-cyan-400' : isPast ? 'text-gray-400' : 'text-gray-500'
                        }`}
                      />
                    )}
                    {/* Pulse animation for current step */}
                    {isCurrent && (
                      <motion.div
                        className="absolute inset-0 border border-cyan-400/50 rounded-lg"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </div>

                  {/* Step text */}
                  <div className="flex flex-col items-start min-w-0">
                    <span
                      className={`text-sm font-medium truncate ${
                        isCurrent ? 'text-cyan-400' : isCompleted ? 'text-cyan-400/80' : isFuture ? 'text-gray-500' : 'text-gray-300'
                      }`}
                    >
                      {step.shortLabel}
                    </span>
                    <span
                      className={`text-[10px] truncate ${
                        isCurrent ? 'text-cyan-400/60' : 'text-gray-600'
                      }`}
                    >
                      {step.description}
                    </span>
                  </div>

                  {/* Keyboard hint badge */}
                  <span
                    className={`
                      hidden sm:flex items-center justify-center w-4 h-4 text-[10px] font-mono rounded
                      ${isCurrent ? 'bg-cyan-500/20 text-cyan-400' : 'bg-gray-800/60 text-gray-500'}
                    `}
                  >
                    {step.keyHint}
                  </span>
                </button>

                {/* Chevron separator */}
                {index < STEPS.length - 1 && (
                  <ChevronRight
                    className={`w-4 h-4 mx-1 flex-shrink-0 ${
                      isPast || isCurrent ? 'text-cyan-500/50' : 'text-gray-700'
                    }`}
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>

        {/* Step counter */}
        <div
          className="flex-shrink-0 ml-2 px-2 py-1 text-[10px] font-mono text-cyan-400/60 bg-gray-800/40 rounded-md"
          aria-hidden="true"
        >
          {currentIndex + 1}/{STEPS.length}
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      <div
        className="mt-1 text-[10px] text-gray-600 text-center"
        aria-hidden="true"
      >
        Use ← → or 1-3 keys to navigate
      </div>
    </nav>
  );
}

export { STEPS };
export type { StepConfig };
