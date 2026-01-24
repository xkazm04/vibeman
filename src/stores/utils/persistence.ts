/**
 * Store Persistence Utilities
 *
 * Standardized persistence configuration for Zustand stores.
 * Categories define persistence behavior:
 * - user_preference: Always persist (theme, layout, shortcuts)
 * - session_work: Persist for session (wizard progress, queue state)
 * - cache: Persist with TTL (fetched data, calculations)
 * - volatile: Never persist (loading states, errors)
 */

import { createJSONStorage, StateStorage, PersistOptions } from 'zustand/middleware';

/**
 * Persistence categories for state fields
 */
export type PersistenceCategory =
  | 'user_preference'  // Always persist: theme, layout, shortcuts
  | 'session_work'     // Persist for session: current task, wizard progress
  | 'cache'            // Persist with TTL: fetched data, calculations
  | 'volatile';        // Never persist: loading states, errors

/**
 * Persistence configuration options
 */
export interface PersistConfigOptions<T> {
  /** The persistence category for this store */
  category: PersistenceCategory;
  /** Function to select which state to persist (exclude volatile fields) */
  partialize?: (state: T) => Partial<T>;
  /** Time-to-live in milliseconds for cache category (default: 5 minutes) */
  ttl?: number;
  /** Version number for migrations */
  version?: number;
  /** Custom merge function for rehydration */
  merge?: (persistedState: unknown, currentState: T) => T;
  /** Migration function for version upgrades */
  migrate?: (persistedState: unknown, version: number) => Partial<T> | Promise<Partial<T>>;
  /** Callback after rehydration */
  onRehydrateStorage?: (state: T) => ((state?: T, error?: unknown) => void) | void;
}

/**
 * Storage prefix for all Vibeman stores
 */
const STORAGE_PREFIX = 'vibeman';

/**
 * Default TTL for cache category (5 minutes)
 */
const DEFAULT_CACHE_TTL = 5 * 60 * 1000;

/**
 * Create a standardized persistence configuration for a Zustand store
 *
 * @example
 * ```typescript
 * // User preference store - always persists
 * const useThemeStore = create(
 *   persist(
 *     (set, get) => ({ ... }),
 *     createPersistConfig('theme', {
 *       category: 'user_preference',
 *     })
 *   )
 * );
 *
 * // Session work store - persists wizard progress
 * const useRefactorStore = create(
 *   persist(
 *     (set, get) => ({ ... }),
 *     createPersistConfig('refactor', {
 *       category: 'session_work',
 *       partialize: (state) => ({
 *         currentStep: state.currentStep,
 *         selectedPackages: state.selectedPackages,
 *         // Excludes: loading, error, tempData
 *       }),
 *     })
 *   )
 * );
 *
 * // Cache store with TTL
 * const useIdeaStore = create(
 *   persist(
 *     (set, get) => ({ ... }),
 *     createPersistConfig('ideas', {
 *       category: 'cache',
 *       ttl: 5 * 60 * 1000, // 5 minutes
 *       partialize: (state) => ({
 *         ideas: state.ideas,
 *         lastFetched: state.lastFetched,
 *       }),
 *     })
 *   )
 * );
 * ```
 */
export function createPersistConfig<T>(
  name: string,
  options: PersistConfigOptions<T>
): PersistOptions<T, Partial<T>> {
  const { category, partialize, ttl, version = 1, merge, migrate, onRehydrateStorage } = options;

  const config: PersistOptions<T, Partial<T>> = {
    name: `${STORAGE_PREFIX}:${name}`,
    storage: createJSONStorage(() => localStorage),
    version,
    partialize: partialize ?? ((state: T) => state as Partial<T>),
  };

  // Add TTL support for cache category
  if (category === 'cache') {
    const cacheTtl = ttl ?? DEFAULT_CACHE_TTL;

    config.onRehydrateStorage = (state) => {
      return (rehydratedState, error) => {
        if (error) {
          console.error(`[Persistence] Error rehydrating ${name}:`, error);
          return;
        }

        // Check TTL for cache stores
        if (rehydratedState && 'lastFetched' in (rehydratedState as object)) {
          const lastFetched = (rehydratedState as { lastFetched?: number }).lastFetched;
          if (lastFetched && Date.now() - lastFetched > cacheTtl) {
            // Cache expired - clear the persisted data
            console.log(`[Persistence] Cache expired for ${name}, clearing`);
            localStorage.removeItem(`${STORAGE_PREFIX}:${name}`);
          }
        }

        // Call custom onRehydrateStorage if provided
        if (onRehydrateStorage) {
          const callback = onRehydrateStorage(state);
          if (callback) {
            callback(rehydratedState, error);
          }
        }
      };
    };
  } else if (onRehydrateStorage) {
    config.onRehydrateStorage = onRehydrateStorage;
  }

  if (merge) {
    config.merge = merge;
  }

  if (migrate) {
    config.migrate = migrate;
  }

  return config;
}

/**
 * Clear all session state from localStorage
 * Call this when switching projects or on logout
 */
export function clearSessionState(): void {
  const sessionStores = [
    'refactor-wizard-storage',
    'state-machine-storage',
    'debt-prediction-storage',
    'blueprint-execution-store',
  ];

  sessionStores.forEach(storeName => {
    const key = `${STORAGE_PREFIX}:${storeName}`;
    localStorage.removeItem(key);
    // Also try without prefix for backwards compatibility
    localStorage.removeItem(storeName);
  });

  console.log('[Persistence] Session state cleared');
}

/**
 * Clear all cache state from localStorage
 * Call this when data needs to be refreshed
 */
export function clearCacheState(): void {
  const cacheStores: string[] = [
    // Add cache store names here as needed
  ];

  cacheStores.forEach(storeName => {
    const key = `${STORAGE_PREFIX}:${storeName}`;
    localStorage.removeItem(key);
    localStorage.removeItem(storeName);
  });

  console.log('[Persistence] Cache state cleared');
}

/**
 * Clear all Vibeman localStorage data
 * Use with caution - this removes all persisted state
 */
export function clearAllPersistedState(): void {
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith(`${STORAGE_PREFIX}:`) || key.includes('-storage') || key.includes('-store'))) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach(key => localStorage.removeItem(key));
  console.log(`[Persistence] Cleared ${keysToRemove.length} persisted stores`);
}

/**
 * Get current storage usage for Vibeman stores
 */
export function getStorageUsage(): { totalBytes: number; stores: Record<string, number> } {
  const stores: Record<string, number> = {};
  let totalBytes = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith(`${STORAGE_PREFIX}:`) || key.includes('-storage') || key.includes('-store'))) {
      const value = localStorage.getItem(key);
      if (value) {
        const bytes = new Blob([value]).size;
        stores[key] = bytes;
        totalBytes += bytes;
      }
    }
  }

  return { totalBytes, stores };
}

/**
 * Type guard for checking if state has timestamp for TTL
 */
export function hasLastFetched(state: unknown): state is { lastFetched: number } {
  return (
    typeof state === 'object' &&
    state !== null &&
    'lastFetched' in state &&
    typeof (state as { lastFetched: unknown }).lastFetched === 'number'
  );
}

/**
 * Check if cached data is still valid
 */
export function isCacheValid(lastFetched: number | null | undefined, ttl: number = DEFAULT_CACHE_TTL): boolean {
  if (!lastFetched) return false;
  return Date.now() - lastFetched < ttl;
}
