'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, Inbox } from 'lucide-react';

interface TableEmptyStateProps {
  icons?: LucideIcon[];
  title: string;
  description?: string;
}

/**
 * Animated empty state for tables.
 * Features:
 * - Floating icon animation
 * - Staggered text entrance
 * - Multiple icon support
 */
export function TableEmptyState({
  icons = [Inbox],
  title,
  description,
}: TableEmptyStateProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-16 text-gray-400"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Floating icons */}
      <motion.div
        className="flex items-center gap-3 mb-6"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        {icons.map((Icon, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 0.5, scale: 1 }}
            transition={{ delay: idx * 0.1, duration: 0.3 }}
          >
            <Icon className="w-10 h-10" />
          </motion.div>
        ))}
      </motion.div>

      {/* Title */}
      <motion.p
        className="text-lg font-medium"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        {title}
      </motion.p>

      {/* Description */}
      {description && (
        <motion.p
          className="text-sm text-gray-500 mt-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          {description}
        </motion.p>
      )}
    </motion.div>
  );
}

export default TableEmptyState;
