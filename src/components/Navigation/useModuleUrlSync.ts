'use client';

/**
 * useModuleUrlSync — keeps the active module (store state) in sync with the URL
 * `?module=` query param so the browser Back/Forward buttons, bookmarking, and
 * deep links work for top-level navigation.
 *
 * The store remains the single source of truth; this only mirrors it to the URL
 * and adopts the URL on back/forward + initial deep-link load.
 *
 * - URL → store: a `?module=` that differs from the store updates the store
 *   (handles Back/Forward and shared links).
 * - store → URL: a module change updates the URL. The first sync (no param yet)
 *   uses replace() so it doesn't add a spurious history entry on load; later,
 *   user-driven switches use push() so Back steps through modules.
 */

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOnboardingStore, type AppModule } from '@/stores/onboardingStore';

const VALID_MODULES: ReadonlySet<string> = new Set<AppModule>([
  'overview', 'coder', 'contexts', 'ideas', 'tinder', 'tasker',
  'reflector', 'manager', 'halloffame', 'blueprint', 'explorer',
]);

function isValidModule(value: string | null): value is AppModule {
  return value != null && VALID_MODULES.has(value);
}

export function useModuleUrlSync(): void {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeModule = useOnboardingStore((s) => s.activeModule);
  const setActiveModule = useOnboardingStore((s) => s.setActiveModule);

  const urlModule = searchParams.get('module');

  // URL → store: adopt deep links and Back/Forward navigation.
  useEffect(() => {
    if (isValidModule(urlModule) && urlModule !== activeModule) {
      setActiveModule(urlModule);
    }
    // Intentionally keyed on the URL only; store changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlModule]);

  // store → URL: reflect the current module in the address bar.
  useEffect(() => {
    if (activeModule === urlModule) return;
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set('module', activeModule);
    // First sync (no param yet) replaces to avoid a spurious history entry;
    // subsequent user-driven switches push so Back steps through modules.
    const navigate = urlModule == null ? router.replace : router.push;
    navigate(`/?${params.toString()}`, { scroll: false });
    // Keyed on the module so each switch fires exactly once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModule]);
}

/**
 * Null-rendering component that runs useModuleUrlSync. Mount inside a <Suspense>
 * boundary because useSearchParams() requires one in the App Router.
 */
export function ModuleUrlSync(): null {
  useModuleUrlSync();
  return null;
}
