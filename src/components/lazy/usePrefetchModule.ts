'use client';

import { useEffect, useRef } from 'react';
import type { AppModule } from '@/stores/onboardingStore';

/**
 * Maps each module to its dynamic import function.
 * These are the same imports used by createLazyFeature in page.tsx —
 * calling them triggers webpack chunk prefetch without rendering.
 */
const moduleImportMap: Partial<Record<AppModule, () => Promise<unknown>>> = {
  coder: () => import('@/app/features/Goals/GoalsLayout'),
  contexts: () => import('@/app/features/Context/ContextLayout'),
  ideas: () => import('@/app/features/Ideas/IdeasLayout'),
  tinder: () => import('@/app/features/tinder/TinderLayout'),
  tasker: () => import('@/app/features/TaskRunner/TaskRunnerLayout'),
  reflector: () => import('@/app/features/reflector/ReflectorLayout'),
  manager: () => import('@/app/features/Manager/ManagerLayout'),
  halloffame: () => import('@/app/features/HallOfFame/HallOfFameLayout'),
  social: () => import('@/app/features/Social/SocialLayout'),
  zen: () => import('@/app/zen/ZenLayout'),
  questions: () => import('@/app/features/Questions/QuestionsLayout'),
  integrations: () => import('@/app/features/Integrations/IntegrationsLayout'),
  brain: () => import('@/app/features/Brain/BrainLayout'),
  commander: () => import('@/app/features/Commander/CommanderLayout'),
  conductor: () => import('@/app/features/Conductor/ConductorLayout'),
  views: () => import('@/app/features/Views/ViewsLayout'),
};

/**
 * Navigation adjacency — which modules are likely next from any given module.
 * Keeps prefetch scope tight (max 2-3 per module).
 */
const adjacency: Partial<Record<AppModule, AppModule[]>> = {
  overview: ['coder', 'ideas'],
  coder: ['overview', 'contexts', 'conductor'],
  ideas: ['tinder', 'overview'],
  tinder: ['ideas', 'tasker'],
  tasker: ['coder', 'conductor'],
  contexts: ['coder', 'questions'],
  brain: ['commander', 'reflector'],
  commander: ['brain'],
  conductor: ['coder', 'tasker'],
  manager: ['coder', 'integrations'],
  reflector: ['brain', 'overview'],
  views: ['overview'],
};

/**
 * Prefetches neighbor module chunks during browser idle time.
 * Fires once per active module change, using requestIdleCallback.
 */
export function usePrefetchModules(activeModule: AppModule) {
  const prefetched = useRef(new Set<AppModule>());

  useEffect(() => {
    const neighbors = adjacency[activeModule] ?? [];
    const toPrefetch = neighbors.filter(
      (m) => !prefetched.current.has(m) && moduleImportMap[m]
    );

    if (toPrefetch.length === 0) return;

    const doLoad = () => {
      for (const mod of toPrefetch) {
        moduleImportMap[mod]?.();
        prefetched.current.add(mod);
      }
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const id = window.requestIdleCallback(doLoad);
      return () => window.cancelIdleCallback(id);
    }

    const id = setTimeout(doLoad, 200);
    return () => clearTimeout(id);
  }, [activeModule]);
}
