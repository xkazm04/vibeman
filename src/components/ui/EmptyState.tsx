'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { transition, hover as hoverPresets, tap } from '@/lib/motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type ActionVariant = 'primary' | 'secondary' | 'ghost';
type EmptyStateVariant = 'default' | 'compact';

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
  /** Optional tertiary hint text below description */
  hint?: string;
  /** Layout variant: default (full padding) or compact (tighter spacing) */
  variant?: EmptyStateVariant;
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

const pulseAnimation = {
  opacity: [0.5, 0.8, 0.5],
  transition: {
    duration: 2.5,
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

const layoutStyles: Record<EmptyStateVariant, { container: string; icon: string; title: string; desc: string; hint: string; gap: string }> = {
  default: {
    container: 'py-16 px-8',
    icon: 'w-12 h-12',
    title: 'text-lg font-semibold text-gray-300 mb-2',
    desc: 'text-sm text-gray-500 max-w-md mb-6 leading-relaxed',
    hint: 'text-xs text-slate-600 mt-1',
    gap: 'mb-5',
  },
  compact: {
    container: 'py-8 px-4',
    icon: 'w-6 h-6',
    title: 'text-xs font-medium text-slate-400 mb-1',
    desc: 'text-xs text-slate-500 max-w-xs leading-relaxed',
    hint: 'text-2xs text-slate-600 mt-0.5',
    gap: 'mb-2.5',
  },
};

/**
 * Unified empty state component for consistent empty views across the app.
 *
 * Renders a centered icon with ambient glow background, optional pulse animation,
 * title, description, hint, and up to 2 action buttons.
 *
 * Variants:
 * - `default` — full-size with generous padding (panels, full pages)
 * - `compact` — tight layout for sidebars, inline sections
 */
const EmptyState = React.memo(function EmptyState({
  icon: Icon,
  title,
  description,
  hint,
  variant = 'default',
  actions,
  className = '',
  testId,
}: EmptyStateProps) {
  const prefersReduced = useReducedMotion();
  const displayActions = actions?.slice(0, 2);
  const layout = layoutStyles[variant];
  const isCompact = variant === 'compact';

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: isCompact ? 8 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={prefersReduced ? undefined : { opacity: 0, y: isCompact ? -8 : -20 }}
      transition={transition.expand}
      className={`relative flex flex-col items-center justify-center text-center ${layout.container} ${className}`}
      role="status"
      aria-live="polite"
      data-testid={testId}
    >
      {/* Ambient radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(30,41,59,0.20) 0%, transparent 70%)',
        }}
      />

      {/* Floating / pulsing icon */}
      <motion.div
        className={`relative z-10 ${layout.gap}`}
        animate={prefersReduced ? undefined : (isCompact ? pulseAnimation : floatAnimation)}
      >
        <Icon className={`${layout.icon} text-gray-400 opacity-50`} />
      </motion.div>

      {/* Title */}
      <h3 className={`relative z-10 ${layout.title}`}>{title}</h3>

      {/* Description */}
      <p className={`relative z-10 ${layout.desc}`}>
        {description}
      </p>

      {/* Hint */}
      {hint && (
        <p className={`relative z-10 ${layout.hint}`}>
          {hint}
        </p>
      )}

      {/* Action buttons */}
      {displayActions && displayActions.length > 0 && (
        <div className={`relative z-10 flex items-center gap-3 ${hint ? 'mt-4' : ''}`}>
          {displayActions.map((action) => {
            const v = action.variant ?? 'primary';
            return (
              <motion.button
                key={action.label}
                whileHover={!prefersReduced ? (v === 'ghost' ? hoverPresets.button : hoverPresets.card) : undefined}
                whileTap={!prefersReduced ? tap.press : undefined}
                onClick={action.onClick}
                className={`flex items-center gap-2 transition-all ${variantStyles[v]}`}
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
export type { EmptyStateProps, EmptyStateAction, ActionVariant, EmptyStateVariant };
