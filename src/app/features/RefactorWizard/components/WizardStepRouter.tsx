'use client';

import { motion, AnimatePresence } from 'framer-motion';
import SettingsStep from '../sub_WizardSteps/components/SettingsStep';
import ScanStep from '../sub_WizardSteps/components/ScanStep';
import PlanStep from '../sub_WizardSteps/components/PlanStep';
import ReviewStep from '../sub_WizardSteps/components/ReviewStep';
import PackageStep from '../sub_WizardSteps/components/PackageStep';
import ExecuteStep from './ExecuteStep';
import ResultsStep from '../sub_WizardSteps/components/ResultsStep';

export type WizardStep = 'settings' | 'scan' | 'plan' | 'review' | 'package' | 'execute' | 'results';

export interface WizardStepRouterProps {
  currentStep: WizardStep;
}

const stepComponents: Record<WizardStep, React.ComponentType> = {
  settings: SettingsStep,
  scan: ScanStep,
  plan: PlanStep,
  review: ReviewStep,
  package: PackageStep,
  execute: ExecuteStep,
  results: ResultsStep,
};

export default function WizardStepRouter({ currentStep }: WizardStepRouterProps) {
  const StepComponent = stepComponents[currentStep];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="max-w-5xl mx-auto"
      >
        <StepComponent />
      </motion.div>
    </AnimatePresence>
  );
}
