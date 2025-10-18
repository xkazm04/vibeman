import { useState, useCallback, useEffect } from 'react';

/**
 * Custom hook for managing performance optimizations when panel is expanded
 */
export const usePerformanceOptimization = () => {
  const [shouldFreezeComponents, setShouldFreezeComponents] = useState(false);

  const freezeComponents = useCallback(() => {
    setShouldFreezeComponents(true);
  }, []);

  const unfreezeComponents = useCallback(() => {
    setShouldFreezeComponents(false);
  }, []);

  // Debounce unfreeze to allow smooth transitions
  const debouncedUnfreeze = useCallback(() => {
    const timeoutId = setTimeout(() => {
      unfreezeComponents();
    }, 300); // Wait for panel close animation to complete

    return () => clearTimeout(timeoutId);
  }, [unfreezeComponents]);

  return {
    shouldFreezeComponents,
    freezeComponents,
    unfreezeComponents: debouncedUnfreeze
  };
};