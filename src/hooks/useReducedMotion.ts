import { useState, useEffect } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Returns `true` when the user's OS/browser requests reduced motion.
 *
 * Components should use this to disable non-essential animations
 * (decorative pulses, entrance slides, hover scaling) while keeping
 * functional animations (progress bars, loading spinners) intact.
 *
 * SSR-safe: defaults to `false` on the server, hydrates on mount.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    setReduced(mql.matches);

    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return reduced;
}
