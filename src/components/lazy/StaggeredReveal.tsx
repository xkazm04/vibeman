'use client';

import React, { Children } from 'react';
import { motion } from 'framer-motion';

interface StaggeredRevealProps {
  children: React.ReactNode;
  /** Delay between each child appearing (seconds) */
  stagger?: number;
  /** Initial delay before the first child appears (seconds) */
  initialDelay?: number;
  /** Slide direction */
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  /** Slide distance in pixels */
  distance?: number;
  /** Animation duration per child (seconds) */
  duration?: number;
  className?: string;
}

const directionOffset = {
  up: { x: 0, y: 1 },
  down: { x: 0, y: -1 },
  left: { x: 1, y: 0 },
  right: { x: -1, y: 0 },
  none: { x: 0, y: 0 },
} as const;

const SMOOTH_EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Wraps children to cascade them into view with staggered fade + slide.
 * Each direct child gets its own reveal animation offset by `stagger` seconds.
 *
 * Defaults tuned for a 0.8-1.2s total cascade across 4-6 children,
 * giving a visible "paint down the page" effect.
 */
export default function StaggeredReveal({
  children,
  stagger = 0.12,
  initialDelay = 0.05,
  direction = 'up',
  distance = 24,
  duration = 0.5,
  className = '',
}: StaggeredRevealProps) {
  const offset = directionOffset[direction];
  const items = Children.toArray(children);

  return (
    <div className={className}>
      {items.map((child, i) => (
        <motion.div
          key={i}
          initial={{
            opacity: 0,
            x: offset.x * distance,
            y: offset.y * distance,
          }}
          animate={{
            opacity: 1,
            x: 0,
            y: 0,
          }}
          transition={{
            duration,
            delay: initialDelay + i * stagger,
            ease: SMOOTH_EASE,
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}
