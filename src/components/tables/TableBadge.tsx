'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { badgeColorSchemes, BadgeConfig } from './types';

interface TableBadgeProps {
  icon: LucideIcon;
  label: string;
  colorScheme: BadgeConfig['colorScheme'];
  /** Enable subtle pulse animation */
  animate?: boolean;
}

/**
 * Animated badge for table rows.
 * Features:
 * - Consistent styling across all tables
 * - Optional pulse animation for attention
 * - Multiple color schemes
 */
export function TableBadge({
  icon: Icon,
  label,
  colorScheme,
  animate = false,
}: TableBadgeProps) {
  const colors = badgeColorSchemes[colorScheme];

  return (
    <motion.span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1
        rounded-full text-xs font-medium
        border ${colors}
        select-none
      `}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: 1,
        scale: 1,
        ...(animate ? { boxShadow: ['0 0 0 0 currentColor', '0 0 0 4px transparent'] } : {})
      }}
      transition={{
        duration: 0.2,
        ...(animate ? { boxShadow: { duration: 1.5, repeat: Infinity } } : {}),
      }}
    >
      <Icon className="w-3 h-3" />
      {label}
    </motion.span>
  );
}

export default TableBadge;
