import { useEffect, useState } from 'react';
import { useOnboardingStore, type OnboardingStep } from '@/stores/onboardingStore';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';

interface Idea {
  status: string;
}

interface IdeasResponse {
  success: boolean;
  ideas?: Idea[];
}

interface ContextsResponse {
  success: boolean;
  data: {
    contexts: unknown[];
  };
}

/**
 * Generic function to complete a step if condition is met
 */
function completeStepIfNeeded(
  condition: boolean,
  stepId: OnboardingStep,
  isStepCompleted: (id: OnboardingStep) => boolean,
  completeStep: (id: OnboardingStep) => void
): void {
  if (condition && !isStepCompleted(stepId)) {
    completeStep(stepId);
  }
}

/**
 * Hook to check all onboarding conditions and auto-complete steps
 * Now project-specific: tracks progress for the active project only
 */
export function useOnboardingAutoComplete() {
  const { completeStep, isStepCompleted, refreshTrigger, setActiveProjectId } = useOnboardingStore();
  const { projects } = useProjectConfigStore();
  const { activeProject } = useActiveProjectStore();

  const [hasContexts, setHasContexts] = useState(false);
  const [hasIdeas, setHasIdeas] = useState(false);
  const [hasImplementedIdeas, setHasImplementedIdeas] = useState(false);
  const [hasGoals, setHasGoals] = useState(false);

  // Sync active project ID to onboarding store
  useEffect(() => {
    if (activeProject?.id) {
      setActiveProjectId(activeProject.id);
    }
  }, [activeProject?.id, setActiveProjectId]);

  // Check Step 1: Create a project (global check, not project-specific)
  useEffect(() => {
    if (projects.length > 0 && activeProject?.id) {
      completeStepIfNeeded(true, 'create-project', isStepCompleted, completeStep);
    }
  }, [projects.length, activeProject?.id, completeStep, isStepCompleted]);

  // Check Step 2: Set up goals (goals exist for project)
  useEffect(() => {
    const checkGoals = async () => {
      if (!activeProject?.id) return;

      try {
        const response = await fetch(`/api/goals?projectId=${activeProject.id}`);
        const data = await response.json();

        if (data.success && data.goals) {
          const hasAny = data.goals.length > 0;
          setHasGoals(hasAny);

          completeStepIfNeeded(hasAny, 'set-up-goals', isStepCompleted, completeStep);
        }
      } catch {
        // Silently fail - goal check is non-critical
      }
    };

    checkGoals();
  }, [activeProject?.id, completeStep, isStepCompleted, refreshTrigger]);

  // Check Step 3: Scan context (project-specific, runs on mount and when refreshTrigger changes)
  useEffect(() => {
    const checkContexts = async () => {
      if (!activeProject?.id) return;

      try {
        // Filter contexts by active project
        const response = await fetch(`/api/contexts?projectId=${activeProject.id}`);
        const data = await response.json() as ContextsResponse;

        if (data.success && data.data.contexts) {
          const hasAny = data.data.contexts.length > 0;
          setHasContexts(hasAny);

          completeStepIfNeeded(hasAny, 'scan-context', isStepCompleted, completeStep);
        }
      } catch {
        // Silently fail - context check is non-critical
      }
    };

    checkContexts();
  }, [activeProject?.id, completeStep, isStepCompleted, refreshTrigger]);

  // Check Step 4: Generate ideas (project-specific, runs on mount and when refreshTrigger changes)
  useEffect(() => {
    const checkIdeas = async () => {
      if (!activeProject?.id) return;

      try {
        // Filter ideas by active project
        const response = await fetch(`/api/ideas?projectId=${activeProject.id}`);
        const data = await response.json() as IdeasResponse;

        if (data.ideas) {
          const hasAny = data.ideas.length > 0;
          setHasIdeas(hasAny);

          completeStepIfNeeded(hasAny, 'generate-ideas', isStepCompleted, completeStep);

          // Also check for implemented ideas (Step 5)
          const implemented = data.ideas.filter(
            (idea: Idea) => idea.status === 'implemented'
          );
          const hasImpl = implemented.length > 0;
          setHasImplementedIdeas(hasImpl);

          completeStepIfNeeded(hasImpl, 'let-code', isStepCompleted, completeStep);
        }
      } catch {
        // Silently fail - idea check is non-critical
      }
    };

    checkIdeas();
  }, [activeProject?.id, completeStep, isStepCompleted, refreshTrigger]);

  return {
    hasProjects: projects.length > 0,
    hasGoals,
    hasContexts,
    hasIdeas,
    hasImplementedIdeas
  };
}

/**
 * Hook to get the current active step for glowing
 */
export function useActiveOnboardingStep() {
  const { isStepActive } = useOnboardingStore();

  return {
    isCreateProjectActive: isStepActive('create-project'),
    isSetUpGoalsActive: isStepActive('set-up-goals'),
    isScanContextActive: isStepActive('scan-context'),
    isGenerateIdeasActive: isStepActive('generate-ideas'),
    isLetCodeActive: isStepActive('let-code'),
  };
}
