import { useState, useEffect } from 'react';

const STORAGE_KEY = 'taskRunner_uiVerificationEnabled';

/**
 * Hook for managing UI verification configuration
 * Uses localStorage to persist the enabled state across sessions
 *
 * When enabled, tasks will use agent-browser to verify UI changes
 * after implementation, attempting auto-fix on failures.
 */
export function useUIVerificationConfig() {
  const [uiVerificationEnabled, setUIVerificationEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'true';
    }
    return false;
  });

  // Persist UI verification enabled state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, uiVerificationEnabled.toString());
    }
  }, [uiVerificationEnabled]);

  return {
    uiVerificationEnabled,
    setUIVerificationEnabled,
  };
}
