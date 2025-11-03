import { useGoalContext } from '@/contexts/GoalContext';

/**
 * @deprecated Use `useGoalContext()` directly instead.
 * This hook is maintained for backward compatibility.
 *
 * Migration guide:
 * ```tsx
 * // Old way
 * const { goals, loading } = useGoals(projectId);
 *
 * // New way
 * const { goals, loading } = useGoalContext();
 * ```
 */
export const useGoals = (projectId: string | null) => {
  if (process.env.NODE_ENV === 'development') {
    // Deprecation warning only in development
    console.warn(
      'useGoals is deprecated. Please use useGoalContext() from @/contexts/GoalContext instead.'
    );
  }
  return useGoalContext();
}; 