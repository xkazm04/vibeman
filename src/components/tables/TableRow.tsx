'use client';

import React, { ReactNode, useState } from 'react';
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
}: TableRowProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.tr
      layout
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
        border-b border-gray-800/50
        transition-colors cursor-pointer
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
