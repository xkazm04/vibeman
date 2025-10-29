import { useEffect, useState } from 'react';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';

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
    if (projects.length > 0 && !isStepCompleted('create-project')) {
      completeStep('create-project');
    }
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

        if (exists && !isStepCompleted('generate-docs')) {
          completeStep('generate-docs');
        }
      } catch (error) {
        console.error('Error checking high.md:', error);
      }
    };

    checkHighMd();
  }, [activeProject?.path, completeStep, isStepCompleted]);

  // Check Step 3: Compose a context (runs on mount and when refreshTrigger changes)
  useEffect(() => {
    const checkContexts = async () => {
      try {
        const response = await fetch('/api/contexts');
        const data = await response.json();

        if (data.success && data.data.contexts) {
          const hasAny = data.data.contexts.length > 0;
          setHasContexts(hasAny);

          if (hasAny && !isStepCompleted('compose-context')) {
            completeStep('compose-context');
          }
        }
      } catch (error) {
        console.error('Error checking contexts:', error);
      }
    };

    checkContexts();
  }, [completeStep, isStepCompleted, refreshTrigger]);

  // Check Step 4: Scan for ideas (runs on mount and when refreshTrigger changes)
  useEffect(() => {
    const checkIdeas = async () => {
      try {
        const response = await fetch('/api/ideas');
        const data = await response.json();

        if (data.success && data.ideas) {
          const hasAny = data.ideas.length > 0;
          setHasIdeas(hasAny);

          if (hasAny && !isStepCompleted('scan-ideas')) {
            completeStep('scan-ideas');
          }

          // Also check for implemented ideas (Step 5)
          const implemented = data.ideas.filter(
            (idea: any) => idea.status === 'implemented'
          );
          const hasImpl = implemented.length > 0;
          setHasImplementedIdeas(hasImpl);

          if (hasImpl && !isStepCompleted('let-code')) {
            completeStep('let-code');
          }
        }
      } catch (error) {
        console.error('Error checking ideas:', error);
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
