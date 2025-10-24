# create-usepollingtask-hook-with-abortcontroller

## Description

Create a reusable `usePollingTask` hook that abstracts polling logic with guaranteed cleanup using AbortController and proper React lifecycle management. This hook will replace manual setInterval patterns found in ClaudeRequirementsList and prevent race conditions from stale closures. The hook should accept a polling function, interval duration, and optional dependencies, returning loading/error states and a cancel function for manual cancellation.

## Implementation Steps

1. Create new file `app/lib/hooks/usePollingTask.ts` that exports a generic hook with TypeScript types for the polling function, options (interval, maxRetries, backoffMultiplier), and return values (isLoading, error, cancel, data)
2. Implement AbortController-based cancellation mechanism that propagates abort signals to the polling function, ensuring fetch requests and async operations respect the abort signal
3. Add cleanup logic in useEffect that calls abort() on component unmount and when dependencies change, eliminating race conditions from stale closures
4. Implement exponential backoff retry logic with maxRetries option to handle transient failures gracefully, resetting retry count on successful polls
5. Add stale-while-revalidate pattern: if a poll fails, continue showing previous data while attempting to fetch new data, preventing UI flicker
6. Create comprehensive tests in `app/lib/hooks/__tests__/usePollingTask.test.ts` covering: cleanup on unmount, abort signal propagation, dependency changes, retry behavior, and race condition scenarios

## Files to Modify

- app/lib/hooks/usePollingTask.ts
- app/lib/hooks/__tests__/usePollingTask.test.ts

## UI/UX Innovation Experiment

Implement a subtle pulse animation on polling indicators that accelerates during retry attempts, giving visual feedback of the hook's internal state without requiring UI changes in consuming components

## Recommended Next Goal

Refactor ClaudeRequirementsList polling to use the new usePollingTask hook, removing manual setInterval and isExecutingRef logic

