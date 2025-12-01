'use client';

import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

// Step loading skeleton with animated loader
const StepLoadingSkeleton = ({ stepName }: { stepName: string }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="flex flex-col items-center justify-center h-64 gap-4"
    data-testid={`step-loading-${stepName.toLowerCase()}`}
  >
    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
    <span className="text-gray-400 text-sm">Loading {stepName}...</span>
  </motion.div>
);

// Lazy load each step with custom loading states
export const LazySettingsStep = dynamic(
  () => import('../sub_WizardSteps/components/SettingsStep'),
  {
    loading: () => <StepLoadingSkeleton stepName="Settings" />,
    ssr: false
  }
);

export const LazyScanStep = dynamic(
  () => import('../sub_WizardSteps/components/ScanStep'),
  {
    loading: () => <StepLoadingSkeleton stepName="Analysis" />,
    ssr: false
  }
);

export const LazyPlanStep = dynamic(
  () => import('../sub_WizardSteps/components/PlanStep'),
  {
    loading: () => <StepLoadingSkeleton stepName="Strategy" />,
    ssr: false
  }
);

export const LazyReviewStep = dynamic(
  () => import('../sub_WizardSteps/components/ReviewStep'),
  {
    loading: () => <StepLoadingSkeleton stepName="Review" />,
    ssr: false
  }
);

export const LazyPackageStep = dynamic(
  () => import('../sub_WizardSteps/components/PackageStep'),
  {
    loading: () => <StepLoadingSkeleton stepName="Packages" />,
    ssr: false
  }
);

export const LazyExecuteStep = dynamic(
  () => import('./ExecuteStep'),
  {
    loading: () => <StepLoadingSkeleton stepName="Execute" />,
    ssr: false
  }
);

export const LazyResultsStep = dynamic(
  () => import('../sub_WizardSteps/components/ResultsStep'),
  {
    loading: () => <StepLoadingSkeleton stepName="Results" />,
    ssr: false
  }
);

// Export step loading skeleton for external use
export { StepLoadingSkeleton };
