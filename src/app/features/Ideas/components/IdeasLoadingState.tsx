'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

type IdeasLoadingSize = 'sm' | 'md' | 'lg';

interface IdeasLoadingStateProps {
  size?: IdeasLoadingSize;
  label?: string;
  'data-testid'?: string;
}

const sizeConfig: Record<IdeasLoadingSize, { icon: string; text: string; gap: string }> = {
  sm: { icon: 'w-5 h-5', text: 'text-xs', gap: 'gap-2' },
  md: { icon: 'w-8 h-8', text: 'text-sm', gap: 'gap-3' },
  lg: { icon: 'w-12 h-12', text: 'text-base', gap: 'gap-4' },
};

const containerConfig: Record<IdeasLoadingSize, string> = {
  sm: 'py-4',
  md: 'py-8',
  lg: 'min-h-[400px]',
};

/**
 * Standardized loading state for the Ideas subsystem.
 * - sm: sidebar/inline spinners
 * - md: panel/section spinners
 * - lg: full-page loading states
 */
export default function IdeasLoadingState({
  size = 'md',
  label,
  'data-testid': testId,
}: IdeasLoadingStateProps) {
  const config = sizeConfig[size];
  const container = containerConfig[size];

  return (
    <div
      className={`flex flex-col items-center justify-center ${container} ${config.gap}`}
      data-testid={testId}
    >
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.7, 1, 0.7],
        }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <Sparkles className={`${config.icon} text-purple-400`} />
      </motion.div>
      {label && (
        <span className={`${config.text} text-gray-400`}>{label}</span>
      )}
    </div>
  );
}
