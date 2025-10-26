'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState, useCallback } from 'react';

export function useSmoothNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);

  const navigateTo = useCallback((href: string) => {
    if (pathname === href || isNavigating) return; // Don't navigate if already on the page or navigating

    setIsNavigating(true);
    
    try {
      router.push(href);
    } catch (error) {
      console.error('Navigation error:', error);
    } finally {
      // Reset loading state after a reasonable delay
      setTimeout(() => setIsNavigating(false), 500);
    }
  }, [router, pathname, isNavigating]);

  return {
    navigateTo,
    isNavigating,
    currentPath: pathname,
  };
}