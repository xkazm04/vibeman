'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { transition, hover as hoverPresets, tap } from '@/lib/motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type ActionVariant = 'primary' | 'secondary' | 'ghost';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: ActionVariant;
  icon?: LucideIcon;
}

interface EmptyStateProps {
  /** Lucide icon component to display */
  icon: LucideIcon;
  /** Primary title text */
  title: string;
  /** Secondary description text */
  description: string;
  /** Up to 2 action buttons */
  actions?: EmptyStateAction[];
  /** Additional CSS classes */
  className?: string;
  /** Test ID for the component */
  testId?: string;
}

const floatAnimation = {
  y: [0, -4, 0],
  transition: {
    duration: 3,
    ease: 'easeInOut' as const,
    repeat: Infinity,
  },
};

const variantStyles: Record<ActionVariant, string> = {
  primary:
    'px-5 py-2.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-400 rounded-xl border border-cyan-500/30 backdrop-blur-sm font-medium',
  secondary:
    'px-5 py-2.5 bg-gray-800/40 hover:bg-gray-700/50 text-gray-300 rounded-xl border border-gray-600/30 backdrop-blur-sm font-medium',
  ghost: 'px-4 py-2 text-gray-400 hover:text-gray-300 text-sm',
};

/**
 * Unified empty state component for consistent empty views across the app.
 *
 * Renders a centered icon with float animation, title, description,
 * and up to 2 action buttons.
 */
const EmptyState = React.memo(function EmptyState({
  icon: Icon,
  title,
  description,
  actions,
  className = '',
  testId,
}: EmptyStateProps) {
  const prefersReduced = useReducedMotion();
  const displayActions = actions?.slice(0, 2);

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={prefersReduced ? undefined : { opacity: 0, y: -20 }}
      transition={transition.expand}
      className={`flex flex-col items-center justify-center py-16 px-8 text-center ${className}`}
      role="status"
      aria-live="polite"
      data-testid={testId}
    >
      {/* Floating icon */}
      <motion.div className="mb-5" animate={prefersReduced ? undefined : floatAnimation}>
        <Icon className="w-12 h-12 text-gray-400 opacity-50" />
      </motion.div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-300 mb-2">{title}</h3>

      {/* Description */}
      <p className="text-sm text-gray-500 max-w-md mb-6 leading-relaxed">
        {description}
      </p>

      {/* Action buttons */}
      {displayActions && displayActions.length > 0 && (
        <div className="flex items-center gap-3">
          {displayActions.map((action) => {
            const variant = action.variant ?? 'primary';
            return (
              <motion.button
                key={action.label}
                whileHover={!prefersReduced ? (variant === 'ghost' ? hoverPresets.button : hoverPresets.card) : undefined}
                whileTap={!prefersReduced ? tap.press : undefined}
                onClick={action.onClick}
                className={`flex items-center gap-2 transition-all ${variantStyles[variant]}`}
              >
                {action.icon && <action.icon className="w-4 h-4" />}
                {action.label}
              </motion.button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
});

export default EmptyState;
export type { EmptyStateProps, EmptyStateAction, ActionVariant };
