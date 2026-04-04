import { useMemo } from 'react';
import { useReducedMotion } from './useReducedMotion';
import { duration, transition, reducedMotion, stagger } from '@/lib/motion';
import type { Transition } from 'framer-motion';

/**
 * Animation configuration returned by `useAnimationConfig`.
 *
 * Components can destructure what they need:
 * ```ts
 * const { shouldAnimate, springConfig, fadeConfig, staggerDelay } = useAnimationConfig();
 * ```
 */
export interface AnimationConfig {
  /** `true` when animations should play — `false` when reduced-motion is active */
  shouldAnimate: boolean;
  /** Spring transition — falls back to instant when reduced motion is on */
  springConfig: Transition;
  /** Simple opacity fade — always safe, but shortened for reduced motion */
  fadeConfig: Transition;
  /** Standard entrance transition — respects reduced motion */
  entranceConfig: Transition;
  /** Expand/collapse transition — respects reduced motion */
  expandConfig: Transition;
  /** Stagger delays — zeroed when reduced motion is active */
  staggerDelay: { row: number; card: number; panel: number };
}

/**
 * Returns animation configuration that automatically respects `prefers-reduced-motion`.
 *
 * When reduced motion is active:
 * - `shouldAnimate` is `false`
 * - Spring/entrance transitions collapse to near-instant opacity fades
 * - Stagger delays are zeroed
 *
 * Usage:
 * ```tsx
 * const { shouldAnimate, springConfig, fadeConfig } = useAnimationConfig();
 * <motion.div
 *   animate={shouldAnimate ? { y: 0, opacity: 1 } : reducedMotion.noAnimation}
 *   transition={springConfig}
 * />
 * ```
 */
export function useAnimationConfig(): AnimationConfig {
  const prefersReduced = useReducedMotion();

  return useMemo<AnimationConfig>(() => {
    if (prefersReduced) {
      return {
        shouldAnimate: false,
        springConfig: reducedMotion.transition,
        fadeConfig: { duration: 0.01 },
        entranceConfig: reducedMotion.transition,
        expandConfig: reducedMotion.transition,
        staggerDelay: { row: 0, card: 0, panel: 0 },
      };
    }

    return {
      shouldAnimate: true,
      springConfig: { type: 'spring' as const, stiffness: 300, damping: 30 },
      fadeConfig: { duration: duration.snappy },
      entranceConfig: transition.deliberate,
      expandConfig: transition.expand,
      staggerDelay: stagger,
    };
  }, [prefersReduced]);
}
