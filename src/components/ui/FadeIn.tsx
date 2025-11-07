'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';

interface FadeInProps extends Omit<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'exit'> {
  children: ReactNode;
  /**
   * Vertical offset for the initial position (default: 20)
   */
  y?: number;
  /**
   * Delay before animation starts in seconds (default: 0)
   */
  delay?: number;
  /**
   * Duration of the animation in seconds (default: 0.3)
   */
  duration?: number;
  /**
   * Custom className for the wrapper div
   */
  className?: string;
}

// Smooth easing curve constant
const SMOOTH_EASING = [0.22, 1, 0.36, 1] as const;

/**
 * FadeIn Component
 *
 * A reusable wrapper component that applies a consistent fade-in animation
 * using Framer Motion. Elements fade in with opacity transition and a subtle
 * upward motion (y-axis translation).
 *
 * @example
 * ```tsx
 * <FadeIn>
 *   <div>Content that fades in</div>
 * </FadeIn>
 *
 * <FadeIn delay={0.2} y={30}>
 *   <div>Content with custom delay and offset</div>
 * </FadeIn>
 * ```
 */
export function FadeIn({
  children,
  y = 20,
  delay = 0,
  duration = 0.3,
  className,
  ...motionProps
}: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y }}
      transition={{
        duration,
        delay,
        ease: SMOOTH_EASING,
      }}
      className={className}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}
