import { useState, useEffect } from 'react';

const STORAGE_KEY = 'taskRunner_screenshotEnabled';

export function useScreenshotConfig() {
  const [screenshotEnabled, setScreenshotEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'true';
    }
    return false;
  });

  // Persist screenshot enabled state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, screenshotEnabled.toString());
    }
  }, [screenshotEnabled]);

  return {
    screenshotEnabled,
    setScreenshotEnabled,
  };
}
