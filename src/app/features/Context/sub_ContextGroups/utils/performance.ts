import { useMemo, useCallback, useState, useEffect } from 'react';

// Utility for memoizing expensive calculations
export const useMemoizedLayoutConfig = (contextCount: number) => {
  return useMemo(() => {
    if (contextCount === 1) return {
      gridCols: 'grid-cols-1',
      cellHeight: 'h-64',
      fontSize: 'text-4xl',
      showDividers: false
    };
    if (contextCount === 2) return {
      gridCols: 'grid-cols-2',
      cellHeight: 'h-64',
      fontSize: 'text-2xl',
      showDividers: true
    };
    if (contextCount <= 4) return {
      gridCols: 'grid-cols-2',
      cellHeight: 'h-32',
      fontSize: 'text-lg',
      showDividers: true
    };
    return {
      gridCols: 'grid-cols-3',
      cellHeight: 'h-28',
      fontSize: 'text-base',
      showDividers: true
    };
  }, [contextCount]);
};

// Utility for creating stable animation variants
export const createAnimationVariants = () => ({
  initial: { opacity: 0, scale: 0.9, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0 },
  hover: { scale: 1.02 },
  exit: { opacity: 0, scale: 0.9, y: -20 }
});

// Utility for creating stable transition configs
export const createTransitionConfig = (index: number, delay: number = 0.1) => ({
  duration: 0.3,
  delay: index * delay,
  type: "spring" as const,
  stiffness: 300,
  damping: 30
});

// Debounced callback utility
export const useDebounceCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  return useCallback(
    (...args: Parameters<T>) => {
      const timeoutId = setTimeout(() => callback(...args), delay);
      return () => clearTimeout(timeoutId);
    },
    [callback, delay]
  ) as T;
};

// Throttled callback utility
export const useThrottleCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  let lastCall = 0;
  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        return callback(...args);
      }
    },
    [callback, delay]
  ) as T;
};

// Intersection Observer hook for lazy loading
export const useIntersectionObserver = (
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) => {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry.isIntersecting),
      options
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [ref, options]);

  return isIntersecting;
};