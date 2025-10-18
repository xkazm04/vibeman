'use client';
import { useState, useCallback } from 'react';
import { usePerformanceOptimization } from './usePerformanceOptimization';

/**
 * Custom hook for managing project manager panel visibility and state
 */
export const useProjectManager = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { shouldFreezeComponents, freezeComponents, unfreezeComponents } = usePerformanceOptimization();

  const togglePanel = useCallback(() => {
    console.log('ProjectManager togglePanel called');
    setIsExpanded(prev => {
      const newValue = !prev;
      console.log(`ProjectManager panel ${newValue ? 'opening' : 'closing'}`);
      if (newValue) {
        freezeComponents();
      } else {
        unfreezeComponents();
      }
      return newValue;
    });
  }, [freezeComponents, unfreezeComponents]);

  const closePanel = useCallback(() => {
    setIsExpanded(false);
    unfreezeComponents();
  }, [unfreezeComponents]);

  const openPanel = useCallback(() => {
    setIsExpanded(true);
    freezeComponents();
  }, [freezeComponents]);

  return {
    isExpanded,
    shouldFreezeComponents,
    togglePanel,
    closePanel,
    openPanel
  };
};