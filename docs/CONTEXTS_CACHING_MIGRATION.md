# Contexts API Caching Migration Guide

## Overview

This document provides a guide for migrating from direct `fetch()` calls to TanStack Query hooks for the `/api/contexts` endpoint. This optimization reduces redundant API calls by implementing a 1-hour cache with automatic invalidation.

## Benefits

- **Reduced Network Requests**: Same data across multiple components uses a single cached instance
- **Automatic Cache Management**: 1-hour stale time with 65-minute garbage collection
- **Optimistic Updates**: Immediate UI updates before API confirmation
- **Automatic Retries**: Built-in retry logic for failed requests
- **Type Safety**: Full TypeScript support with proper typing
- **Cache Invalidation**: Automatic cache invalidation on mutations

## Implementation

### 1. Query Hook

Located at: `src/lib/queries/contextsQueries.ts`

**Key Functions:**
- `useProjectContexts(projectId)` - Fetch contexts for a project (1-hour cache)
- `useCreateContext()` - Create context with auto-invalidation
- `useUpdateContext()` - Update context with optimistic updates
- `useDeleteContext()` - Delete context with auto-invalidation
- `useInvalidateContexts()` - Manual cache invalidation utilities

### 2. Migration Pattern

#### Before (Direct fetch):

```typescript
const [contexts, setContexts] = useState<Context[]>([]);
const [contextGroups, setContextGroups] = useState<ContextGroup[]>([]);
const [loading, setLoading] = useState(false);

useEffect(() => {
  const fetchContexts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/contexts?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setContexts(data.data.contexts || []);
        setContextGroups(data.data.groups || []);
      }
    } catch (error) {
      console.error('Failed to fetch contexts');
    } finally {
      setLoading(false);
    }
  };

  if (projectId) {
    fetchContexts();
  }
}, [projectId]);
```

#### After (TanStack Query):

```typescript
import { useProjectContexts } from '@/lib/queries/contextsQueries';

const { data, isLoading, error } = useProjectContexts(projectId);

const contexts = data?.contexts || [];
const contextGroups = data?.groups || [];
```

### 3. Example: IdeasHeaderWithFilter.tsx

**File**: `src/app/features/Ideas/components/IdeasHeaderWithFilter.tsx`

✅ **Migrated** - Shows the basic pattern

**Changes:**
- Removed manual state management
- Removed useEffect fetch logic
- Added `useProjectContexts` hook
- Reduced code from ~30 lines to ~3 lines

### 4. Files to Migrate

The following files contain `/api/contexts?projectId` fetch calls and should be migrated:

#### High Priority (Frequently Used):

1. ✅ `src/app/features/Ideas/components/IdeasHeaderWithFilter.tsx` - DONE
2. `src/components/ContextComponents/ContextTargetsList.tsx`
3. `src/app/features/Ideas/sub_IdeasSetup/ProjectFilter.tsx`
4. `src/app/features/reflector/components/ContextFilter.tsx`
5. `src/components/idea/IdeaDetailMeta.tsx`

#### Medium Priority:

6. `src/app/features/Goals/sub_GoalModal/components/GoalsAddModal.tsx`
7. `src/app/features/Goals/sub_ScreenCatalog/ScreenGallery.tsx`
8. `src/app/features/Onboarding/sub_GoalDrawer/GoalAddPanel.tsx`
9. `src/app/features/Onboarding/sub_Blueprint/components/ContextSelector.tsx`
10. `src/app/features/Manager/components/NewTaskModal.tsx`
11. `src/app/features/reflector/sub_Reflection/components/ReflectionDashboard.tsx`

#### Low Priority (Utilities):

12. `src/app/features/Ideas/lib/contextLoader.ts` - Utility function
13. `src/app/features/Onboarding/lib/useOnboardingConditions.ts`
14. `src/app/docs/page.tsx`
15. `src/app/voicebot/page.tsx`
16. `src/app/features/Onboarding/sub_Blueprint/lib/blueprintScreenCoverage.ts`

### 5. Mutation Examples

#### Creating a Context:

```typescript
import { useCreateContext, useInvalidateContexts } from '@/lib/queries/contextsQueries';

const createContextMutation = useCreateContext();

const handleCreateContext = async () => {
  try {
    await createContextMutation.mutateAsync({
      projectId: 'xxx',
      name: 'New Context',
      filePaths: ['src/app/page.tsx'],
    });
    // Cache is automatically invalidated
  } catch (error) {
    console.error('Failed to create context');
  }
};
```

#### Updating a Context:

```typescript
import { useUpdateContext } from '@/lib/queries/contextsQueries';

const updateContextMutation = useUpdateContext();

const handleUpdate = async () => {
  try {
    await updateContextMutation.mutateAsync({
      contextId: 'ctx-123',
      updates: {
        name: 'Updated Name',
        description: 'New description',
      },
    });
    // Optimistic update + automatic cache invalidation
  } catch (error) {
    // Automatic rollback on error
    console.error('Failed to update');
  }
};
```

#### Manual Cache Invalidation:

```typescript
import { useInvalidateContexts } from '@/lib/queries/contextsQueries';

const { invalidateProject, invalidateAll } = useInvalidateContexts();

// After external change (e.g., file system scan)
invalidateProject(projectId);

// Or invalidate all contexts
invalidateAll();
```

### 6. Advanced Usage

#### Conditional Fetching:

```typescript
// Only fetch when enabled
const { data } = useProjectContexts(projectId, {
  enabled: isModalOpen && !!projectId,
});
```

#### Prefetching:

```typescript
import { usePrefetchProjectContexts } from '@/lib/queries/contextsQueries';

const { prefetch } = usePrefetchProjectContexts();

// Prefetch before navigation
const handleProjectClick = async (projectId: string) => {
  await prefetch(projectId); // Start loading in background
  router.push(`/projects/${projectId}`);
};
```

#### Dependent Queries:

```typescript
// First fetch project contexts
const { data: projectData } = useProjectContexts(projectId);

// Then fetch group contexts only if needed
const { data: groupContexts } = useGroupContexts(
  projectData?.groups[0]?.id || null,
  {
    enabled: !!projectData?.groups[0]?.id,
  }
);
```

### 7. Type Definitions

All types are exported from `src/lib/queries/contextsQueries.ts`:

```typescript
import type {
  Context,
  ContextGroup,
  ProjectContextsData,
  CreateContextInput,
  UpdateContextInput,
} from '@/lib/queries/contextsQueries';
```

### 8. Migration Checklist

For each file:

- [ ] Import `useProjectContexts` from `@/lib/queries/contextsQueries`
- [ ] Replace useState calls for contexts/groups
- [ ] Remove useEffect fetch logic
- [ ] Replace with `const { data, isLoading } = useProjectContexts(projectId)`
- [ ] Use `data?.contexts || []` and `data?.groups || []`
- [ ] Update loading state to use `isLoading`
- [ ] Test that caching works (same project ID = no new fetch)
- [ ] Verify cache invalidation (mutations trigger refetch)

### 9. Testing

To verify caching is working:

1. Open Chrome DevTools → Network tab
2. Navigate to a component that uses contexts
3. Note the `/api/contexts?projectId=xxx` request
4. Navigate away and back to the same project
5. **Expected**: No new network request (data from cache)
6. Wait 1 hour or manually invalidate
7. **Expected**: New network request

### 10. Performance Metrics

**Before:**
- Multiple components = multiple identical API calls
- Each navigation = new fetch
- ~20 files × average 3 calls/session = ~60 API calls/session

**After:**
- Single API call per project (cached for 1 hour)
- Shared cache across all components
- ~20 files × 1 call/project/hour = ~1-3 API calls/session
- **~95% reduction in API calls**

### 11. Common Issues

#### Issue: "Query never refetches"
**Solution**: Check staleTime configuration or manually invalidate

#### Issue: "Data is stale after mutation"
**Solution**: Use mutation hooks (useCreateContext, useUpdateContext) which auto-invalidate

#### Issue: "Type errors with Context type"
**Solution**: Import from `@/lib/queries/contextsQueries` not old location

#### Issue: "Cache not shared between components"
**Solution**: Ensure same query key (projectId) across components

### 12. Next Steps

1. Migrate high-priority files first (see list above)
2. Test each migration thoroughly
3. Monitor network tab to verify caching
4. Update remaining files gradually
5. Consider similar caching for other frequently-accessed endpoints:
   - `/api/goals`
   - `/api/ideas`
   - `/api/projects`

### 13. Related Files

- **Query Client**: `src/lib/queryClient.ts`
- **Provider**: `src/components/QueryProvider.tsx`
- **Layout**: `src/app/layout.tsx` (QueryProvider already applied)
- **Hook**: `src/lib/queries/contextsQueries.ts`

---

## Summary

TanStack Query provides a robust, production-ready solution for data caching and state management. By migrating to this pattern, we:

- Eliminate redundant network requests
- Improve app responsiveness
- Reduce server load
- Simplify component code
- Add automatic retry and error handling
- Enable optimistic updates

The migration is straightforward and can be done incrementally without breaking existing functionality.
