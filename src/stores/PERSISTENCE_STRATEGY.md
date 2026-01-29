# Store Persistence Strategy

This document defines the persistence strategy for all Zustand stores in the Vibeman application. Each store is classified into one of four categories based on what data should survive page refreshes and session changes.

## Persistence Categories

### 1. Always Persist (`user_preference`)
User preferences and settings that should survive indefinitely across sessions.

### 2. Session Persist (`session_work`)
Work-in-progress state that should survive page refresh but may be cleared on project switch or explicit reset.

### 3. Cache Persist (`cache`)
Fetched data with TTL that improves performance but should be refreshed periodically.

### 4. Never Persist (`volatile`)
Ephemeral state that should reset on every page load - loading states, errors, transient UI state.

---

## Store Classification

### Always Persist (user_preference)

| Store | Persisted Fields | Storage Key |
|-------|------------------|-------------|
| `themeStore` | `theme` | `app-theme-storage` |
| `badgeStore` | `earnedBadges` | `badge-storage` |
| `userConfigStore` | `basePath`, `useBasePath` | `user-config-store` |
| `onboardingStore` | `completedSteps`, `currentStep`, `activeProjectId`, `activeModule` | `onboarding-storage` |
| `serverProjectStore` | `projects` | `server-project-store` |
| `clientProjectStore` | `activeProject`, `activeContext`, `selectedProjectId`, `showPreview` | `client-project-store` |
| `annetteActionsStore` | `selectedProvider` | `annette-actions-storage` |
| `workflowStore` | `history` (last 10), `recentEntities` | `workflow-storage` |

### Session Persist (session_work)

| Store | Persisted Fields | Storage Key |
|-------|------------------|-------------|
| `refactorStore` | `wizardPlan`, `selectedScanGroups`, `packages`, `selectedPackages`, `packageFilter`, `filterCategory`, `filterSeverity`, `savedSpecs`, `recentSpecs` | `refactor-wizard-storage` |
| `stateMachineStore` | `configs`, `instances` | `state-machine-storage` |
| `blueprintExecutionStore` | `settings`, `executionHistory` | `blueprint-execution-store` |
| `debtPredictionStore` | `isEnabled`, `autoScanOnSave`, `showOpportunityPanel`, `predictionFilter` | `debt-prediction-storage` |
| ~~`decisionQueueStore`~~ | *(cannot persist - contains callback functions)* | - |

### Cache Persist (cache)

| Store | Persisted Fields | TTL | Storage Key |
|-------|------------------|-----|-------------|
| *(none currently)* | - | - | - |

**Candidates for cache persistence:**
- `contextStore`: `contexts`, `groups` (TTL: 5 min)
- `goalHubStore`: `goals` (TTL: 5 min)

### Never Persist (volatile)

| Store | Reason |
|-------|--------|
| `realtimeStore` | Live polling state |
| `toastStore` | Ephemeral UI notifications |
| `tooltipStore` | Transient hover state |
| `analysisStore` | Temporary analysis state |
| `nodeStore` | Selection/highlight state |
| `xrayStore` | Live streaming state |
| `testResultStore` | Live test results |
| `projectsToolbarStore` | Modal open/close state |
| `automationSessionStore` | Live session state |
| `projectUpdatesStore` | Event notifications |
| `goalHubStore` | Live goal data (no persistence currently) |
| `decisionQueueStore` | Contains callback functions (non-serializable) |
| `contextStore` | Fetched from DB on demand |

---

## Fields That Should NEVER Persist

Across all stores, these field types should always be excluded from persistence:

1. **Loading states**: `loading`, `isLoading`, `isSaving`, etc.
2. **Error states**: `error`, `errorMessage`, etc.
3. **Temporary data**: `tempData`, `preview`, etc.
4. **Interval/Timer IDs**: `pollingInterval`, `_timerIntervalId`, etc.
5. **EventSource/WebSocket**: `eventSource`, `socket`, etc.
6. **Derived/Computed state**: State that can be recomputed

---

## Implementation Guidelines

### Adding Persistence to a New Store

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createPersistConfig, PersistenceCategory } from './utils/persistence';

interface MyStoreState {
  // User preferences (persist)
  theme: string;

  // Session work (persist)
  currentStep: number;

  // Volatile (never persist)
  isLoading: boolean;
  error: string | null;
}

export const useMyStore = create<MyStoreState>()(
  persist(
    (set, get) => ({
      theme: 'default',
      currentStep: 0,
      isLoading: false,
      error: null,
    }),
    createPersistConfig('my-store', {
      category: 'session_work',
      partialize: (state) => ({
        theme: state.theme,
        currentStep: state.currentStep,
        // Explicitly exclude: isLoading, error
      }),
    })
  )
);
```

### Adding Cache with TTL

```typescript
interface CachedDataStore {
  data: Item[];
  lastFetched: number | null;

  fetchData: () => Promise<void>;
}

export const useCachedDataStore = create<CachedDataStore>()(
  persist(
    (set, get) => ({
      data: [],
      lastFetched: null,

      fetchData: async () => {
        const { data, lastFetched } = get();
        const TTL = 5 * 60 * 1000; // 5 minutes

        // Return cached if still valid
        if (data.length > 0 && lastFetched && Date.now() - lastFetched < TTL) {
          return;
        }

        // Fetch fresh data
        const fresh = await fetchFromAPI();
        set({ data: fresh, lastFetched: Date.now() });
      },
    }),
    createPersistConfig('cached-data', {
      category: 'cache',
      ttl: 5 * 60 * 1000,
      partialize: (state) => ({
        data: state.data,
        lastFetched: state.lastFetched,
      }),
    })
  )
);
```

### Clearing State

```typescript
import { clearSessionState, clearCacheState, clearAllPersistedState } from './utils/persistence';

// On project switch
function onProjectSwitch() {
  clearSessionState();
}

// On data invalidation
function onDataInvalidation() {
  clearCacheState();
}

// On logout/reset
function onFullReset() {
  clearAllPersistedState();
}
```

---

## Migration Notes

### Upgrading Store Versions

When changing persisted state shape, increment the version and add migration:

```typescript
createPersistConfig('my-store', {
  category: 'session_work',
  version: 2,
  migrate: (persistedState, version) => {
    if (version === 1) {
      // Migrate from v1 to v2
      return {
        ...persistedState,
        newField: 'default',
      };
    }
    return persistedState;
  },
})
```

---

## Storage Limits

localStorage has a ~5-10MB limit. Monitor usage with:

```typescript
import { getStorageUsage } from './utils/persistence';

const { totalBytes, stores } = getStorageUsage();
console.log(`Total: ${(totalBytes / 1024).toFixed(2)} KB`);
console.log('Per store:', stores);
```

If approaching limits:
1. Reduce data stored (only essential fields)
2. Use shorter TTLs for cache
3. Consider IndexedDB for large data

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-18 | Initial persistence strategy documentation |
