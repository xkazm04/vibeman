'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Loader2, LucideIcon } from 'lucide-react';
import { actionColorSchemes } from './types';

interface TableActionButtonProps {
  icon: LucideIcon;
  label: string;
  colorScheme: 'green' | 'red' | 'cyan' | 'purple' | 'gray' | 'amber';
  onClick: (e: React.MouseEvent) => void | Promise<void>;
  disabled?: boolean;
  /** Shows success animation briefly after action completes */
  showSuccessFlash?: boolean;
}

/**
 * Animated action button for table rows.
 * Features:
 * - Automatic loading state management for async actions
 * - Scale animation on hover/tap
 * - Success flash animation
 * - Prevents event bubbling
 */
export function TableActionButton({
  icon: Icon,
  label,
  colorScheme,
  onClick,
  disabled = false,
  showSuccessFlash = true,
}: TableActionButtonProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const colors = actionColorSchemes[colorScheme];

  const handleClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (loading || disabled) return;

    const result = onClick(e);

    // Handle async actions
    if (result instanceof Promise) {
      setLoading(true);
      try {
        await result;
        if (showSuccessFlash) {
          setSuccess(true);
          setTimeout(() => setSuccess(false), 600);
        }
      } finally {
        setLoading(false);
      }
    }
  }, [onClick, loading, disabled, showSuccessFlash]);

  const isDisabled = loading || disabled;

  return (
    <motion.button
      onClick={handleClick}
      disabled={isDisabled}
      className={`
        relative p-1.5 rounded-md transition-colors
        ${colors.base} ${colors.hover}
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-gray-900 focus:ring-cyan-500/50
      `}
      title={label}
      whileHover={isDisabled ? {} : { scale: 1.15 }}
      whileTap={isDisabled ? {} : { scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {/* Success flash overlay */}
      {success && (
        <motion.div
          className="absolute inset-0 rounded-md bg-green-500/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.6 }}
        />
      )}

      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Icon className="w-3.5 h-3.5" />
      )}
    </motion.button>
  );
}

export default TableActionButton;
