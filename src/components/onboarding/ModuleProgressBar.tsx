'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, Circle, ArrowRight } from 'lucide-react';
import { useOnboardingStore, OnboardingStep, AppModule } from '@/stores/onboardingStore';

interface ModuleProgressBarProps {
  projectId: string;
  className?: string;
  compact?: boolean;
}

// Map modules to their associated onboarding steps
const MODULE_STEPS: Record<AppModule, OnboardingStep | null> = {
  coder: 'create-project',
  blueprint: 'run-blueprint',
  contexts: 'review-contexts',
  ideas: 'generate-ideas',
  tinder: 'evaluate-ideas',
  tasker: 'run-task',
  manager: 'review-impl',
  reflector: null,
  refactor: null,
  halloffame: null,
  social: null,
  composer: null,
  zen: null,
  questions: null,
  integrations: null,
};

const STEP_LABELS: Record<OnboardingStep, string> = {
  'create-project': 'Register Project',
  'run-blueprint': 'Run Blueprint',
  'review-contexts': 'Review Contexts',
  'generate-ideas': 'Generate Ideas',
  'evaluate-ideas': 'Evaluate Ideas',
  'run-task': 'Run Task',
  'review-impl': 'Review Implementation',
};

const STEP_ORDER: OnboardingStep[] = [
  'create-project',
  'run-blueprint',
  'review-contexts',
  'generate-ideas',
  'evaluate-ideas',
  'run-task',
  'review-impl',
];

/**
 * ModuleProgressBar - Shows Getting Started progress in module headers
 * Displays the current step and overall progress for the active project
 */
export default function ModuleProgressBar({
  projectId,
  className = '',
  compact = false,
}: ModuleProgressBarProps) {
  const { getCompletedStepsForProject, getNextIncompleteStep, activeModule } = useOnboardingStore();

  const completedSteps = getCompletedStepsForProject(projectId);
  const nextStep = getNextIncompleteStep(projectId);
  const currentModuleStep = MODULE_STEPS[activeModule];

  // Calculate progress
  const progress = useMemo(() => {
    const completed = completedSteps.length;
    const total = STEP_ORDER.length;
    return {
      completed,
      total,
      percentage: Math.round((completed / total) * 100),
      isComplete: completed === total,
    };
  }, [completedSteps]);

  // Get current step index for display
  const currentStepIndex = nextStep ? STEP_ORDER.indexOf(nextStep) + 1 : STEP_ORDER.length;

  // Don't show if all steps complete
  if (progress.isComplete) {
    return null;
  }

  // Compact version for tight spaces
  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex items-center gap-1">
          {STEP_ORDER.map((step, index) => {
            const isCompleted = completedSteps.includes(step);
            const isCurrent = step === nextStep;
            return (
              <div
                key={step}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  isCompleted
                    ? 'bg-green-400'
                    : isCurrent
                      ? 'bg-cyan-400 animate-pulse'
                      : 'bg-gray-600'
                }`}
                title={STEP_LABELS[step]}
              />
            );
          })}
        </div>
        <span className="text-xs text-gray-500">
          {currentStepIndex}/{progress.total}
        </span>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Header with step info */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-500">GETTING STARTED</span>
          <span className="text-xs text-cyan-400">
            Step {currentStepIndex} of {progress.total}
          </span>
        </div>
        <span className="text-xs text-gray-500">{progress.percentage}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-800 rounded-full overflow-hidden mb-2">
        <motion.div
          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress.percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Current step indicator */}
      {nextStep && (
        <div className="flex items-center gap-2 text-xs">
          <Circle className="w-3 h-3 text-cyan-400 fill-cyan-400/30" />
          <span className="text-gray-300">{STEP_LABELS[nextStep]}</span>
          {currentModuleStep === nextStep && (
            <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-[10px]">
              CURRENT MODULE
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * ModuleProgressDots - Ultra-compact dot-based progress indicator
 */
export function ModuleProgressDots({
  projectId,
  className = '',
}: {
  projectId: string;
  className?: string;
}) {
  const { getCompletedStepsForProject, getNextIncompleteStep } = useOnboardingStore();
  const completedSteps = getCompletedStepsForProject(projectId);
  const nextStep = getNextIncompleteStep(projectId);

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {STEP_ORDER.map((step) => {
        const isCompleted = completedSteps.includes(step);
        const isCurrent = step === nextStep;

        return (
          <motion.div
            key={step}
            className={`w-2 h-2 rounded-full ${
              isCompleted
                ? 'bg-green-400'
                : isCurrent
                  ? 'bg-cyan-400'
                  : 'bg-gray-700'
            }`}
            animate={isCurrent ? { scale: [1, 1.2, 1] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
            title={`${STEP_LABELS[step]}${isCompleted ? ' (Complete)' : isCurrent ? ' (Current)' : ''}`}
          />
        );
      })}
    </div>
  );
}

/**
 * ModuleProgressRing - Circular progress indicator
 */
export function ModuleProgressRing({
  projectId,
  size = 32,
  className = '',
}: {
  projectId: string;
  size?: number;
  className?: string;
}) {
  const { getCompletedStepsForProject } = useOnboardingStore();
  const completedSteps = getCompletedStepsForProject(projectId);

  const progress = completedSteps.length / STEP_ORDER.length;
  const circumference = 2 * Math.PI * (size / 2 - 2);
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 2}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-gray-700"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 2}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-medium text-cyan-400">
          {completedSteps.length}/{STEP_ORDER.length}
        </span>
      </div>
    </div>
  );
}
