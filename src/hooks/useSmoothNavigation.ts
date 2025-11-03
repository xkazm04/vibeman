'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState, useCallback } from 'react';

export function useSmoothNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);

  const navigateTo = useCallback((href: string) => {
    if (pathname === href || isNavigating) return;

    setIsNavigating(true);

    try {
      router.push(href);
    } catch (_error) {
      // Navigation error occurred
    } finally {
      setTimeout(() => setIsNavigating(false), 500);
    }
  }, [router, pathname, isNavigating]);

  return {
    navigateTo,
    isNavigating,
    currentPath: pathname,
  };
}