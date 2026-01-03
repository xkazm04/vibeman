'use client';

import dynamic from 'next/dynamic';
import { Spinner } from '@/components/ui/Spinner';

// Step loading spinner with label
const StepLoadingSpinner = ({ stepName }: { stepName: string }) => (
  <div
    className="flex flex-col items-center justify-center h-64"
    data-testid={`step-loading-${stepName.toLowerCase()}`}
  >
    <Spinner size="lg" variant="orbital" label={`Loading ${stepName}...`} />
  </div>
);

// Lazy load each step with custom loading states
export const LazySettingsStep = dynamic(
  () => import('../sub_WizardSteps/components/SettingsStep'),
  {
    loading: () => <StepLoadingSpinner stepName="Settings" />,
    ssr: false
  }
);

export const LazyScanStep = dynamic(
  () => import('../sub_WizardSteps/components/ScanStep'),
  {
    loading: () => <StepLoadingSpinner stepName="Analysis" />,
    ssr: false
  }
);

export const LazyPlanStep = dynamic(
  () => import('../sub_WizardSteps/components/PlanStep'),
  {
    loading: () => <StepLoadingSpinner stepName="Strategy" />,
    ssr: false
  }
);

export const LazyReviewStep = dynamic(
  () => import('../sub_WizardSteps/components/ReviewStep'),
  {
    loading: () => <StepLoadingSpinner stepName="Review" />,
    ssr: false
  }
);

export const LazyPackageStep = dynamic(
  () => import('../sub_WizardSteps/components/PackageStep'),
  {
    loading: () => <StepLoadingSpinner stepName="Packages" />,
    ssr: false
  }
);

export const LazyExecuteStep = dynamic(
  () => import('./ExecuteStep'),
  {
    loading: () => <StepLoadingSpinner stepName="Execute" />,
    ssr: false
  }
);

export const LazyResultsStep = dynamic(
  () => import('../sub_WizardSteps/components/ResultsStep'),
  {
    loading: () => <StepLoadingSpinner stepName="Results" />,
    ssr: false
  }
);

// Export step loading spinner for external use
export { StepLoadingSpinner };
