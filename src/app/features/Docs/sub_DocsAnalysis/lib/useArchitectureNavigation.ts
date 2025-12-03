/**
 * useArchitectureNavigation Hook
 *
 * A custom hook that manages the complete 3-level navigation state machine
 * for the Architecture Explorer. Provides a single source of truth for
 * navigation state, eliminating prop drilling and making the pattern reusable.
 *
 * Navigation Levels:
 * - Level 1: System Map (overview of all context groups)
 * - Level 2: Module Explorer (contexts within a group)
 * - Level 3: Context Documentation (detailed markdown view)
 */

import { useState, useCallback, useMemo } from 'react';
import { ZoomLevel, NavigationState } from './types';

// Zoom level metadata
export const ZOOM_CONFIGS: Record<ZoomLevel, { scale: number; label: string }> = {
  1: { scale: 1, label: 'System Overview' },
  2: { scale: 1.5, label: 'Module Details' },
  3: { scale: 2, label: 'Documentation' },
};

// Initial navigation state
const INITIAL_STATE: NavigationState = {
  level: 1,
  selectedModuleId: null,
  selectedUseCaseId: null,
  transitionDirection: null,
};

export interface UseArchitectureNavigationReturn {
  // Current state
  state: NavigationState;

  // Computed values
  currentLevel: ZoomLevel;
  currentLevelLabel: string;
  selectedModuleId: string | null;
  selectedUseCaseId: string | null;
  transitionDirection: 'in' | 'out' | null;

  // Level checks
  isAtSystemLevel: boolean;
  isAtModuleLevel: boolean;
  isAtDocumentationLevel: boolean;

  // Navigation handlers
  navigateToModule: (moduleId: string) => void;
  navigateToUseCase: (useCaseId: string) => void;
  navigateBackToSystem: () => void;
  navigateBackToModule: () => void;
  navigateToLevel: (level: ZoomLevel) => void;

  // Reset
  reset: () => void;
}

/**
 * Custom hook for managing 3-level architecture navigation
 *
 * @example
 * ```tsx
 * const {
 *   state,
 *   currentLevelLabel,
 *   navigateToModule,
 *   navigateToUseCase,
 *   navigateBackToSystem,
 *   navigateBackToModule,
 *   navigateToLevel,
 *   isAtSystemLevel,
 * } = useArchitectureNavigation();
 * ```
 */
export function useArchitectureNavigation(): UseArchitectureNavigationReturn {
  const [state, setState] = useState<NavigationState>(INITIAL_STATE);

  // Memoized computed values
  const currentLevel = state.level;
  const currentLevelLabel = ZOOM_CONFIGS[state.level].label;
  const selectedModuleId = state.selectedModuleId;
  const selectedUseCaseId = state.selectedUseCaseId;
  const transitionDirection = state.transitionDirection;

  // Level checks
  const isAtSystemLevel = currentLevel === 1;
  const isAtModuleLevel = currentLevel === 2;
  const isAtDocumentationLevel = currentLevel === 3;

  /**
   * Navigate to a module (Level 1 → Level 2)
   * Zooms into a specific context group
   */
  const navigateToModule = useCallback((moduleId: string) => {
    setState({
      level: 2,
      selectedModuleId: moduleId,
      selectedUseCaseId: null,
      transitionDirection: 'in',
    });
  }, []);

  /**
   * Navigate to a use case/context (Level 2 → Level 3)
   * Zooms into a specific context's documentation
   */
  const navigateToUseCase = useCallback((useCaseId: string) => {
    setState((prev) => ({
      ...prev,
      level: 3,
      selectedUseCaseId: useCaseId,
      transitionDirection: 'in',
    }));
  }, []);

  /**
   * Navigate back to system level (Any Level → Level 1)
   * Returns to the system overview
   */
  const navigateBackToSystem = useCallback(() => {
    setState({
      level: 1,
      selectedModuleId: null,
      selectedUseCaseId: null,
      transitionDirection: 'out',
    });
  }, []);

  /**
   * Navigate back to module level (Level 3 → Level 2)
   * Returns to the module explorer while keeping the selected module
   */
  const navigateBackToModule = useCallback(() => {
    setState((prev) => ({
      ...prev,
      level: 2,
      selectedUseCaseId: null,
      transitionDirection: 'out',
    }));
  }, []);

  /**
   * Navigate to a specific level via breadcrumb
   * Calculates transition direction automatically based on target level
   *
   * Note: Cannot navigate directly to Level 3 as it requires a use case selection
   */
  const navigateToLevel = useCallback((level: ZoomLevel) => {
    setState((prev) => {
      if (level === prev.level) return prev;

      const direction = level > prev.level ? 'in' : 'out';

      if (level === 1) {
        return {
          level: 1,
          selectedModuleId: null,
          selectedUseCaseId: null,
          transitionDirection: direction,
        };
      } else if (level === 2) {
        return {
          ...prev,
          level: 2,
          selectedUseCaseId: null,
          transitionDirection: direction,
        };
      }

      // Level 3 requires a use case selection, can't navigate directly
      return prev;
    });
  }, []);

  /**
   * Reset navigation to initial state
   */
  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return useMemo(() => ({
    // Current state
    state,

    // Computed values
    currentLevel,
    currentLevelLabel,
    selectedModuleId,
    selectedUseCaseId,
    transitionDirection,

    // Level checks
    isAtSystemLevel,
    isAtModuleLevel,
    isAtDocumentationLevel,

    // Navigation handlers
    navigateToModule,
    navigateToUseCase,
    navigateBackToSystem,
    navigateBackToModule,
    navigateToLevel,

    // Reset
    reset,
  }), [
    state,
    currentLevel,
    currentLevelLabel,
    selectedModuleId,
    selectedUseCaseId,
    transitionDirection,
    isAtSystemLevel,
    isAtModuleLevel,
    isAtDocumentationLevel,
    navigateToModule,
    navigateToUseCase,
    navigateBackToSystem,
    navigateBackToModule,
    navigateToLevel,
    reset,
  ]);
}

export default useArchitectureNavigation;
