'use client';

import React, { ReactNode, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

interface TableRowProps {
  children: ReactNode;
  onClick?: () => void;
  /** Index for stagger animation */
  index?: number;
  /** Whether the row is in a highlighted state */
  highlighted?: boolean;
  /** Highlight color theme */
  highlightColor?: 'green' | 'purple' | 'cyan' | 'amber';
  /** Whether the row is being removed (for exit animation) */
  isRemoving?: boolean;
  /** Custom class name */
  className?: string;
  /** Accessible label for the row */
  ariaLabel?: string;
  /** Callback fired on keyboard shortcut keys when row is focused */
  onKeyAction?: (key: string) => void;
}

const highlightStyles: Record<string, string> = {
  green: 'bg-green-900/20 border-l-2 border-l-green-500/50',
  purple: 'bg-purple-900/20 border-l-2 border-l-purple-500/50',
  cyan: 'bg-cyan-900/20 border-l-2 border-l-cyan-500/50',
  amber: 'bg-amber-900/20 border-l-2 border-l-amber-500/50',
};

/**
 * Animated table row with hover effects.
 *
 * UI/UX Features:
 * 1. Staggered entrance animation
 * 2. Smooth hover glow effect
 * 3. Exit animation when removing
 * 4. Layout animation for reordering
 * 5. Highlight state for special rows
 */
export function TableRow({
  children,
  onClick,
  index = 0,
  highlighted = false,
  highlightColor = 'green',
  isRemoving = false,
  className = '',
  ariaLabel,
  onKeyAction,
}: TableRowProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    } else if (onKeyAction) {
      onKeyAction(e.key);
    }
  }, [onClick, onKeyAction]);

  return (
    <motion.tr
      layout
      tabIndex={0}
      role="row"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      initial={{ opacity: 0, x: -20 }}
      animate={{
        opacity: isRemoving ? 0 : 1,
        x: 0,
        scale: isRemoving ? 0.95 : 1,
        backgroundColor: isHovered
          ? 'rgba(55, 65, 81, 0.5)'
          : highlighted
            ? undefined
            : 'rgba(0, 0, 0, 0)',
      }}
      exit={{
        opacity: 0,
        x: 20,
        scale: 0.95,
        transition: { duration: 0.2 },
      }}
      transition={{
        layout: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.3, delay: index * 0.03 },
        x: { duration: 0.3, delay: index * 0.03 },
        backgroundColor: { duration: 0.15 },
      }}
      className={`
        group/row border-b border-gray-800/50
        transition-colors cursor-pointer
        outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-900
        ${highlighted ? highlightStyles[highlightColor] : ''}
        ${className}
      `}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </motion.tr>
  );
}

export default TableRow;
