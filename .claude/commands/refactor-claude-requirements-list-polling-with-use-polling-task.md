# refactor-claude-requirements-list-polling-with-use-polling-task

## Description

Refactor ClaudeRequirementsList component to replace its setInterval-based polling with the new `usePollingTask` hook. This eliminates manual cleanup flags (isExecutingRef), removes race conditions from concurrent polling calls, and guarantees cleanup on unmount. The refactored component will be cleaner, more maintainable, and serve as a reference implementation for other polling scenarios.

## Implementation Steps

1. In ClaudeRequirementsList component, identify the current polling logic using setInterval and isExecutingRef flag (likely in a useEffect hook)
2. Replace the entire polling setup with a call to `usePollingTask(fetchRequirements, POLLING_INTERVAL, { onError: handlePollingError })` where fetchRequirements accepts AbortSignal parameter
3. Update the fetchRequirements function to accept AbortSignal and pass it to fetch calls: `fetch(url, { signal })` to enable proper cancellation propagation
4. Remove all manual cleanup logic: delete isExecutingRef, remove manual clearInterval calls, and eliminate manual abort/cancellation flags
5. Update component state to use the hook's return values (isLoading, error, cancel) instead of local state variables
6. Add error handling that displays polling errors gracefully without breaking the component (use error boundary or toast notification pattern already in codebase)

## Files to Modify

- app/features/claude-requirements/components/ClaudeRequirementsList.tsx
- app/lib/hooks/usePollingTask.ts

## UI/UX Innovation Experiment

Implement a smooth polling state indicator in the header of ClaudeRequirementsList: when polling is active, show a subtle animated loader; when an error occurs, display a retry button with a gentle shake animation; on successful refresh, show a brief green checkmark animation.

## Recommended Next Goal

Apply usePollingTask to other polling scenarios in the codebase (log refresh polling, status check polling) to standardize polling patterns and eliminate similar race conditions across the application

