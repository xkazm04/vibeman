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
};

/**
 * Navigation adjacency — which modules are likely next from any given module.
 * Keeps prefetch scope tight (max 2-3 per module).
 */
const adjacency: Partial<Record<AppModule, AppModule[]>> = {
  overview: ['coder', 'ideas'],
  coder: ['overview', 'contexts'],
  ideas: ['tinder', 'overview'],
  tinder: ['ideas', 'tasker'],
  tasker: ['coder'],
  contexts: ['coder'],
  manager: ['coder'],
  reflector: ['overview'],
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
