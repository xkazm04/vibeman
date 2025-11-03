import { useEffect, useState } from 'react';
import { useOnboardingStore } from '@/stores/onboardingStore';
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
  stepId: string,
  isStepCompleted: (id: string) => boolean,
  completeStep: (id: string) => void
): void {
  if (condition && !isStepCompleted(stepId)) {
    completeStep(stepId);
  }
}

/**
 * Hook to check all onboarding conditions and auto-complete steps
 */
export function useOnboardingAutoComplete() {
  const { completeStep, isStepCompleted, refreshTrigger } = useOnboardingStore();
  const { projects } = useProjectConfigStore();
  const { activeProject } = useActiveProjectStore();

  const [hasContexts, setHasContexts] = useState(false);
  const [hasIdeas, setHasIdeas] = useState(false);
  const [hasImplementedIdeas, setHasImplementedIdeas] = useState(false);
  const [hasHighMd, setHasHighMd] = useState(false);

  // Check Step 1: Create a project
  useEffect(() => {
    completeStepIfNeeded(projects.length > 0, 'create-project', isStepCompleted, completeStep);
  }, [projects.length, completeStep, isStepCompleted]);

  // Check Step 2: Generate documentation (high.md exists)
  useEffect(() => {
    const checkHighMd = async () => {
      if (!activeProject?.path) return;

      try {
        const response = await fetch('/api/disk/check-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filePath: `${activeProject.path}/context/high.md`
          })
        });

        const data = await response.json();
        const exists = data.exists === true;
        setHasHighMd(exists);

        completeStepIfNeeded(exists, 'generate-docs', isStepCompleted, completeStep);
      } catch {
        // Silently fail - file check is non-critical
      }
    };

    checkHighMd();
  }, [activeProject?.path, completeStep, isStepCompleted]);

  // Check Step 3: Compose a context (runs on mount and when refreshTrigger changes)
  useEffect(() => {
    const checkContexts = async () => {
      try {
        const response = await fetch('/api/contexts');
        const data = await response.json() as ContextsResponse;

        if (data.success && data.data.contexts) {
          const hasAny = data.data.contexts.length > 0;
          setHasContexts(hasAny);

          completeStepIfNeeded(hasAny, 'compose-context', isStepCompleted, completeStep);
        }
      } catch {
        // Silently fail - context check is non-critical
      }
    };

    checkContexts();
  }, [completeStep, isStepCompleted, refreshTrigger]);

  // Check Step 4: Scan for ideas (runs on mount and when refreshTrigger changes)
  useEffect(() => {
    const checkIdeas = async () => {
      try {
        const response = await fetch('/api/ideas');
        const data = await response.json() as IdeasResponse;

        if (data.success && data.ideas) {
          const hasAny = data.ideas.length > 0;
          setHasIdeas(hasAny);

          completeStepIfNeeded(hasAny, 'scan-ideas', isStepCompleted, completeStep);

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
  }, [completeStep, isStepCompleted, refreshTrigger]);

  return {
    hasProjects: projects.length > 0,
    hasHighMd,
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
    isGenerateDocsActive: isStepActive('generate-docs'),
    isComposeContextActive: isStepActive('compose-context'),
    isScanIdeasActive: isStepActive('scan-ideas'),
    isLetCodeActive: isStepActive('let-code'),
  };
}
