# create-use-polling-task-hook-with-abort-controller

## Description

Create a reusable `usePollingTask` hook that abstracts polling logic with AbortController-based cleanup guarantees. This hook will eliminate race conditions and manual cleanup flags by leveraging React's effect cleanup and AbortSignal. It should handle stale closures through proper dependency tracking, support configurable intervals, and provide automatic cleanup on unmount or explicit cancellation. This addresses the core issue in ClaudeRequirementsList where setInterval with isExecutingRef flags create race conditions.

## Implementation Steps

1. Create new file `app/lib/hooks/usePollingTask.ts` that exports a hook with signature: `usePollingTask<T>(task: (signal: AbortSignal) => Promise<T>, interval: number, options?: { immediate?: boolean; onError?: (error: Error) => void }): { isLoading: boolean; error: Error | null; cancel: () => void }`
2. Implement AbortController creation in useEffect with proper cleanup: abort() called in cleanup function to guarantee signal propagation to the polling task
3. Use useCallback for the polling function to prevent stale closures, with interval and task in dependency array
4. Implement automatic retry logic with exponential backoff on AbortError vs other errors - propagate AbortError silently (expected cancellation) and call onError for unexpected errors
5. Add TypeScript generics to support any Promise-returning task, ensuring type safety across different polling scenarios
6. Create comprehensive JSDoc documentation with examples showing usage in ClaudeRequirementsList (log refresh) and other polling scenarios (status checks)

## Files to Modify

- app/lib/hooks/usePollingTask.ts

## UI/UX Innovation Experiment

Add optional visual feedback: a subtle pulsing indicator that shows polling is active, with color change on error (red pulse) or success (green flash). Include a micro-animation when canceling - a smooth fade-out of the indicator.

## Recommended Next Goal

After hook creation, refactor ClaudeRequirementsList to use usePollingTask, removing setInterval and isExecutingRef, then apply the hook to other polling scenarios in the codebase (log refresh, status checks)

