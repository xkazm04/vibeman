'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LazySettingsStep,
  LazyScanStep,
  LazyPlanStep,
  LazyReviewStep,
  LazyPackageStep,
  LazyExecuteStep,
  LazyResultsStep
} from './LazySteps';

export type WizardStep = 'settings' | 'scan' | 'plan' | 'review' | 'package' | 'execute' | 'results';

export interface WizardStepRouterProps {
  currentStep: WizardStep;
}

// Map steps to lazy-loaded components
const stepComponents: Record<WizardStep, React.ComponentType> = {
  settings: LazySettingsStep,
  scan: LazyScanStep,
  plan: LazyPlanStep,
  review: LazyReviewStep,
  package: LazyPackageStep,
  execute: LazyExecuteStep,
  results: LazyResultsStep,
};

// Step order for preloading
const stepOrder: WizardStep[] = ['settings', 'scan', 'plan', 'review', 'package', 'execute', 'results'];

// Enhanced animation variants with delayed entrance
const stepVariants = {
  initial: {
    opacity: 0,
    x: 30,
    scale: 0.98,
    filter: 'blur(4px)'
  },
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
      staggerChildren: 0.1
    }
  },
  exit: {
    opacity: 0,
    x: -30,
    scale: 0.98,
    filter: 'blur(4px)',
    transition: {
      duration: 0.3
    }
  }
};

export default function WizardStepRouter({ currentStep }: WizardStepRouterProps) {
  const StepComponent = stepComponents[currentStep];

  // Preload next step in background
  useEffect(() => {
    const currentIndex = stepOrder.indexOf(currentStep);
    const nextStep = stepOrder[currentIndex + 1];

    if (nextStep) {
      // Trigger preload of next step by dynamic import
      const preloadStep = async () => {
        switch (nextStep) {
          case 'settings':
            await import('../sub_WizardSteps/components/SettingsStep');
            break;
          case 'scan':
            await import('../sub_WizardSteps/components/ScanStep');
            break;
          case 'plan':
            await import('../sub_WizardSteps/components/PlanStep');
            break;
          case 'review':
            await import('../sub_WizardSteps/components/ReviewStep');
            break;
          case 'package':
            await import('../sub_WizardSteps/components/PackageStep');
            break;
          case 'execute':
            await import('./ExecuteStep');
            break;
          case 'results':
            await import('../sub_WizardSteps/components/ResultsStep');
            break;
        }
      };
      preloadStep();
    }
  }, [currentStep]);

  return (
    <div className="relative w-full h-full overflow-hidden max-w-5xl mx-auto" data-testid="wizard-step-router">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          variants={stepVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="w-full"
          data-testid={`wizard-step-${currentStep}`}
        >
          <StepComponent />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
