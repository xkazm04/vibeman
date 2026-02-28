import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type OnboardingStep =
  | 'create-project'
  | 'run-blueprint'
  | 'review-contexts'
  | 'generate-ideas'
  | 'evaluate-ideas'
  | 'run-task'
  | 'review-impl';

export type AppModule = 'overview' | 'coder' | 'contexts' | 'ideas' | 'tinder' | 'tasker' | 'reflector' | 'manager' | 'halloffame' | 'social' | 'zen' | 'blueprint' | 'questions' | 'integrations' | 'brain' | 'commander';

interface OnboardingState {
  // Project-specific completed steps: { projectId: [steps] }
  completedSteps: Record<string, OnboardingStep[]>;
  currentStep: OnboardingStep | null;
  refreshTrigger: number; // Used to trigger re-checking
  activeProjectId: string | null; // Track which project we're onboarding

  // Navigation state
  activeModule: AppModule;
  isControlPanelOpen: boolean;
  isBlueprintOpen: boolean;

  // Actions (now project-aware)
  completeStep: (step: OnboardingStep, projectId?: string) => void;
  setCurrentStep: (step: OnboardingStep | null) => void;
  isStepCompleted: (step: OnboardingStep, projectId?: string) => boolean;
  isStepActive: (step: OnboardingStep, projectId?: string) => boolean;
  getNextIncompleteStep: (projectId?: string) => OnboardingStep | null;
  resetOnboarding: (projectId?: string) => void;
  triggerRefresh: () => void; // Manually trigger condition re-check
  setActiveProjectId: (projectId: string | null) => void;
  getCompletedStepsForProject: (projectId: string) => OnboardingStep[];

  // Navigation actions
  setActiveModule: (module: AppModule) => void;
  openControlPanel: () => void;
  closeControlPanel: () => void;
  openBlueprint: () => void;
  closeBlueprint: () => void;
  toggleControlPanel: () => void;
}

const STEP_ORDER: OnboardingStep[] = [
  'create-project',
  'run-blueprint',
  'review-contexts',
  'generate-ideas',
  'evaluate-ideas',
  'run-task',
  'review-impl'
];

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      completedSteps: {},
      currentStep: null,
      refreshTrigger: 0,
      activeProjectId: null,

      // Navigation state
      activeModule: 'overview',
      isControlPanelOpen: false,
      isBlueprintOpen: false,

      setActiveProjectId: (projectId: string | null) => {
        set({ activeProjectId: projectId });
      },

      getCompletedStepsForProject: (projectId: string) => {
        return get().completedSteps[projectId] || [];
      },

      completeStep: (step: OnboardingStep, projectId?: string) => {
        const { completedSteps, activeProjectId } = get();
        const targetProjectId = projectId || activeProjectId;

        if (!targetProjectId) {
          console.warn('No project ID provided for completing step');
          return;
        }

        const projectSteps = completedSteps[targetProjectId] || [];
        if (!projectSteps.includes(step)) {
          const newProjectSteps = [...projectSteps, step];
          set({
            completedSteps: {
              ...completedSteps,
              [targetProjectId]: newProjectSteps,
            },
          });

          // Auto-update current step to next incomplete
          const nextStep = get().getNextIncompleteStep(targetProjectId);
          set({ currentStep: nextStep });
        }
      },

      setCurrentStep: (step: OnboardingStep | null) => {
        set({ currentStep: step });
      },

      isStepCompleted: (step: OnboardingStep, projectId?: string) => {
        const { completedSteps, activeProjectId } = get();
        const targetProjectId = projectId || activeProjectId;

        if (!targetProjectId) return false;

        const projectSteps = completedSteps[targetProjectId] || [];
        return projectSteps.includes(step);
      },

      isStepActive: (step: OnboardingStep, projectId?: string) => {
        const { currentStep, completedSteps, activeProjectId } = get();
        const targetProjectId = projectId || activeProjectId;

        if (!targetProjectId) return false;

        const projectSteps = completedSteps[targetProjectId] || [];

        // If no current step set, determine it
        if (currentStep === null) {
          const stepIndex = STEP_ORDER.indexOf(step);
          const allPreviousCompleted = STEP_ORDER
            .slice(0, stepIndex)
            .every(s => projectSteps.includes(s));
          const thisNotCompleted = !projectSteps.includes(step);

          return allPreviousCompleted && thisNotCompleted;
        }

        return currentStep === step;
      },

      getNextIncompleteStep: (projectId?: string) => {
        const { completedSteps, activeProjectId } = get();
        const targetProjectId = projectId || activeProjectId;

        if (!targetProjectId) return 'create-project';

        const projectSteps = completedSteps[targetProjectId] || [];

        for (const step of STEP_ORDER) {
          if (!projectSteps.includes(step)) {
            return step;
          }
        }

        return null; // All steps completed
      },

      resetOnboarding: (projectId?: string) => {
        const { completedSteps, activeProjectId } = get();
        const targetProjectId = projectId || activeProjectId;

        if (!targetProjectId) {
          // Reset all projects
          set({ completedSteps: {}, currentStep: 'create-project' });
          return;
        }

        // Reset specific project
        set({
          completedSteps: {
            ...completedSteps,
            [targetProjectId]: [],
          },
          currentStep: 'create-project',
        });
      },

      triggerRefresh: () => {
        set((state) => ({ refreshTrigger: state.refreshTrigger + 1 }));
      },

      // Navigation actions
      setActiveModule: (module: AppModule) => {
        set({ activeModule: module });
      },

      openControlPanel: () => {
        set({ isControlPanelOpen: true, isBlueprintOpen: false });
      },

      closeControlPanel: () => {
        set({ isControlPanelOpen: false });
      },

      openBlueprint: () => {
        set({ isBlueprintOpen: true, isControlPanelOpen: false });
      },

      closeBlueprint: () => {
        set({ isBlueprintOpen: false });
      },

      toggleControlPanel: () => {
        set((state) => ({ isControlPanelOpen: !state.isControlPanelOpen }));
      },
    }),
    {
      name: 'onboarding-storage',
    }
  )
);

// Hook to check conditions and auto-complete steps
export function useOnboardingConditions() {
  const { completeStep, isStepCompleted, activeProjectId } = useOnboardingStore();

  const checkAndCompleteStep = (
    step: OnboardingStep,
    condition: boolean,
    projectId?: string
  ) => {
    const targetProjectId = projectId || activeProjectId;
    if (condition && targetProjectId && !isStepCompleted(step, targetProjectId)) {
      completeStep(step, targetProjectId);
    }
  };

  return { checkAndCompleteStep };
}
