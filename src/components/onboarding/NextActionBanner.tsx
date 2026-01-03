'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { useOnboardingStore, OnboardingStep, AppModule } from '@/stores/onboardingStore';

interface NextActionBannerProps {
  projectId: string;
  justCompletedStep?: OnboardingStep;
  className?: string;
  onDismiss?: () => void;
}

// Define step details with navigation targets
const STEP_DETAILS: Record<
  OnboardingStep,
  {
    completedMessage: string;
    nextAction: string;
    targetModule: AppModule;
    icon: string;
  }
> = {
  'create-project': {
    completedMessage: 'Project registered!',
    nextAction: 'Run blueprint scan to analyze your project',
    targetModule: 'blueprint',
    icon: '📋',
  },
  'run-blueprint': {
    completedMessage: 'Blueprint scan complete!',
    nextAction: 'Review and organize generated contexts',
    targetModule: 'contexts',
    icon: '🔍',
  },
  'review-contexts': {
    completedMessage: 'Contexts organized!',
    nextAction: 'Generate improvement ideas',
    targetModule: 'ideas',
    icon: '📦',
  },
  'generate-ideas': {
    completedMessage: 'Ideas generated!',
    nextAction: 'Swipe through ideas to select the best ones',
    targetModule: 'tinder',
    icon: '💡',
  },
  'evaluate-ideas': {
    completedMessage: 'Ideas evaluated!',
    nextAction: 'Execute your first requirement',
    targetModule: 'tasker',
    icon: '👍',
  },
  'run-task': {
    completedMessage: 'Task executed!',
    nextAction: 'Review the implementation before merging',
    targetModule: 'manager',
    icon: '🚀',
  },
  'review-impl': {
    completedMessage: 'Implementation reviewed!',
    nextAction: 'All done! Explore more features',
    targetModule: 'reflector',
    icon: '✅',
  },
};

/**
 * NextActionBanner - Shows contextual next action after completing a step
 * Appears briefly after completing onboarding steps to guide users
 */
export default function NextActionBanner({
  projectId,
  justCompletedStep,
  className = '',
  onDismiss,
}: NextActionBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const { setActiveModule, getNextIncompleteStep, isStepCompleted } = useOnboardingStore();

  const nextStep = getNextIncompleteStep(projectId);

  // If step just completed, show celebration + next action
  if (justCompletedStep && !dismissed) {
    const details = STEP_DETAILS[justCompletedStep];
    const nextStepDetails = nextStep ? STEP_DETAILS[nextStep] : null;
    const isAllComplete = !nextStep;

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`relative bg-gradient-to-r from-green-500/20 to-cyan-500/20
                     border border-green-500/30 rounded-lg p-4 ${className}`}
        >
          {/* Dismiss button */}
          <button
            onClick={() => {
              setDismissed(true);
              onDismiss?.();
            }}
            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Completion message */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-green-400 font-medium">{details.completedMessage}</p>
              {isAllComplete && (
                <p className="text-xs text-gray-400">You've completed all onboarding steps!</p>
              )}
            </div>
          </div>

          {/* Next action */}
          {nextStepDetails && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{nextStepDetails.icon}</span>
                <span className="text-sm text-gray-300">{details.nextAction}</span>
              </div>
              <button
                onClick={() => {
                  setActiveModule(nextStepDetails.targetModule);
                  setDismissed(true);
                  onDismiss?.();
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30
                         text-cyan-400 rounded-lg text-sm transition-colors"
              >
                Go to {nextStepDetails.targetModule}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {isAllComplete && (
            <div className="flex items-center gap-2 text-sm text-purple-400">
              <Sparkles className="w-4 h-4" />
              <span>Explore advanced features to supercharge your workflow</span>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    );
  }

  return null;
}

/**
 * InlineNextAction - Compact inline next action hint
 */
export function InlineNextAction({
  projectId,
  className = '',
}: {
  projectId: string;
  className?: string;
}) {
  const { getNextIncompleteStep, setActiveModule, getCompletedStepsForProject } = useOnboardingStore();
  const nextStep = getNextIncompleteStep(projectId);
  const completedSteps = getCompletedStepsForProject(projectId);

  if (!nextStep || completedSteps.length === 0) {
    return null;
  }

  const details = STEP_DETAILS[nextStep];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`flex items-center gap-2 text-xs ${className}`}
    >
      <span className="text-gray-500">Next:</span>
      <button
        onClick={() => setActiveModule(details.targetModule)}
        className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors"
      >
        <span>{details.nextAction}</span>
        <ArrowRight className="w-3 h-3" />
      </button>
    </motion.div>
  );
}

/**
 * StepCompletionToast - Toast notification when step completes
 */
export function StepCompletionToast({
  step,
  onClose,
}: {
  step: OnboardingStep;
  onClose: () => void;
}) {
  const details = STEP_DETAILS[step];

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      className="fixed bottom-4 right-4 bg-gray-900 border border-green-500/30 rounded-lg p-4 shadow-xl z-50"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
          <Check className="w-6 h-6 text-green-400" />
        </div>
        <div>
          <p className="font-medium text-white">{details.completedMessage}</p>
          <p className="text-xs text-gray-400">{details.nextAction}</p>
        </div>
        <button
          onClick={onClose}
          className="ml-4 p-1 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
