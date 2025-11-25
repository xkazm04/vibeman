'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  /** Icon component from lucide-react to display */
  icon: LucideIcon;
  /** Primary headline text */
  headline: string;
  /** Secondary subtext for additional context */
  subtext?: string;
  /** Optional call-to-action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Optional custom height (defaults to h-96) */
  height?: string;
  /** Additional CSS classes */
  className?: string;
  /** Enable/disable animations (defaults to true) */
  animated?: boolean;
}

/**
 * EmptyState Component
 *
 * A reusable component for displaying empty states with consistent styling.
 * Adapts to light/dark modes, responsive, and accessible.
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={Network}
 *   headline="No dependencies found"
 *   subtext="Run a scan to discover project dependencies"
 *   action={{
 *     label: "Start Scan",
 *     onClick: () => handleScan()
 *   }}
 * />
 * ```
 */
export default function EmptyState({
  icon: Icon,
  headline,
  subtext,
  action,
  height = 'h-96',
  className = '',
  animated = true,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={animated ? { opacity: 0 } : undefined}
      animate={{ opacity: 1 }}
      exit={animated ? { opacity: 0 } : undefined}
      className={`flex flex-col items-center justify-center ${height} bg-gray-900/30 rounded-lg border-2 border-dashed border-gray-700/50 ${className}`}
      role="status"
      aria-live="polite"
    >
      {/* Icon with subtle glow effect */}
      <motion.div
        initial={animated ? { scale: 0.8, opacity: 0 } : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={animated ? { delay: 0.1, duration: 0.3 } : undefined}
        className="relative mb-4"
      >
        {animated ? (
          <motion.div
            animate={{
              opacity: [0.4, 0.6, 0.4],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <Icon className="w-20 h-20 text-gray-600" aria-hidden="true" />
          </motion.div>
        ) : (
          <Icon className="w-20 h-20 text-gray-600" aria-hidden="true" />
        )}

        {/* Subtle glow ring */}
        {animated && (
          <motion.div
            className="absolute inset-0 -z-10"
            animate={{
              opacity: [0, 0.2, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              filter: 'blur(20px)',
              background: 'radial-gradient(circle, rgba(156, 163, 175, 0.3), transparent 70%)',
            }}
          />
        )}
      </motion.div>

      {/* Headline */}
      <motion.p
        initial={animated ? { opacity: 0, y: 10 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={animated ? { delay: 0.2, duration: 0.3 } : undefined}
        className="text-gray-400 text-lg mb-2 font-medium"
      >
        {headline}
      </motion.p>

      {/* Subtext */}
      {subtext && (
        <motion.p
          initial={animated ? { opacity: 0, y: 10 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={animated ? { delay: 0.3, duration: 0.3 } : undefined}
          className="text-gray-500 text-sm text-center max-w-md px-4"
        >
          {subtext}
        </motion.p>
      )}

      {/* Optional action button */}
      {action && (
        <motion.button
          initial={animated ? { opacity: 0, y: 10 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={animated ? { delay: 0.4, duration: 0.3 } : undefined}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={action.onClick}
          className="mt-6 px-6 py-2.5 bg-gray-700/50 hover:bg-gray-700/70 text-gray-300 rounded-lg border border-gray-600/50 backdrop-blur-sm transition-colors duration-200 font-medium text-sm"
          aria-label={action.label}
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
}
