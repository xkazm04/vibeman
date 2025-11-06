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
  // Note: Deprecation warning removed. Developers should use useGoalContext() directly.
  // See JSDoc comment above for migration guide.
  return useGoalContext();
}; 