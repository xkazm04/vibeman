import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type OnboardingStep =
  | 'create-project'
  | 'generate-docs'
  | 'compose-context'
  | 'scan-ideas'
  | 'let-code';

interface OnboardingState {
  completedSteps: OnboardingStep[];
  currentStep: OnboardingStep | null;
  refreshTrigger: number; // Used to trigger re-checking

  // Actions
  completeStep: (step: OnboardingStep) => void;
  setCurrentStep: (step: OnboardingStep | null) => void;
  isStepCompleted: (step: OnboardingStep) => boolean;
  isStepActive: (step: OnboardingStep) => boolean;
  getNextIncompleteStep: () => OnboardingStep | null;
  resetOnboarding: () => void;
  triggerRefresh: () => void; // Manually trigger condition re-check
}

const STEP_ORDER: OnboardingStep[] = [
  'create-project',
  'generate-docs',
  'compose-context',
  'scan-ideas',
  'let-code'
];

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      completedSteps: [],
      currentStep: null,
      refreshTrigger: 0,

      completeStep: (step: OnboardingStep) => {
        const { completedSteps } = get();
        if (!completedSteps.includes(step)) {
          const newCompletedSteps = [...completedSteps, step];
          set({ completedSteps: newCompletedSteps });

          // Auto-update current step to next incomplete
          const nextStep = get().getNextIncompleteStep();
          set({ currentStep: nextStep });
        }
      },

      setCurrentStep: (step: OnboardingStep | null) => {
        set({ currentStep: step });
      },

      isStepCompleted: (step: OnboardingStep) => {
        return get().completedSteps.includes(step);
      },

      isStepActive: (step: OnboardingStep) => {
        const { currentStep, completedSteps } = get();

        // If no current step set, determine it
        if (currentStep === null) {
          const stepIndex = STEP_ORDER.indexOf(step);
          const allPreviousCompleted = STEP_ORDER
            .slice(0, stepIndex)
            .every(s => completedSteps.includes(s));
          const thisNotCompleted = !completedSteps.includes(step);

          return allPreviousCompleted && thisNotCompleted;
        }

        return currentStep === step;
      },

      getNextIncompleteStep: () => {
        const { completedSteps } = get();

        for (const step of STEP_ORDER) {
          if (!completedSteps.includes(step)) {
            return step;
          }
        }

        return null; // All steps completed
      },

      resetOnboarding: () => {
        set({ completedSteps: [], currentStep: 'create-project' });
      },

      triggerRefresh: () => {
        set((state) => ({ refreshTrigger: state.refreshTrigger + 1 }));
      }
    }),
    {
      name: 'onboarding-storage',
    }
  )
);

// Hook to check conditions and auto-complete steps
export function useOnboardingConditions() {
  const { completeStep, isStepCompleted } = useOnboardingStore();

  const checkAndCompleteStep = (
    step: OnboardingStep,
    condition: boolean
  ) => {
    if (condition && !isStepCompleted(step)) {
      completeStep(step);
    }
  };

  return { checkAndCompleteStep };
}
