'use client';

import { motion } from 'framer-motion';

interface LoadingSkeletonProps {
  /** Test ID for automated testing */
  'data-testid'?: string;
}

/**
 * LoadingSkeleton - Animated loading placeholder
 *
 * Displays a pulsing skeleton UI while step content is loading.
 * Uses Blueprint-inspired design with grid patterns.
 */
export function LoadingSkeleton({
  'data-testid': testId = 'loading-skeleton',
}: LoadingSkeletonProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
      data-testid={testId}
    >
      {/* Main content skeleton */}
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-white/10 rounded-xl p-6">
        {/* Blueprint grid overlay */}
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(cyan 1px, transparent 1px), linear-gradient(90deg, cyan 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        {/* Animated gradient overlay */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent"
          animate={{
            x: ['-100%', '200%'],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'linear',
          }}
        />

        <div className="relative space-y-4">
          {/* Header skeleton */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 rounded-lg animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-white/10 rounded w-1/3 animate-pulse" />
              <div className="h-3 bg-white/5 rounded w-2/3 animate-pulse" />
            </div>
          </div>

          {/* Content skeleton */}
          <div className="space-y-3">
            <div className="h-20 bg-white/5 rounded-lg animate-pulse" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-16 bg-white/5 rounded-lg animate-pulse" />
              <div className="h-16 bg-white/5 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Secondary skeleton elements */}
      <div className="grid grid-cols-3 gap-3">
        <div className="h-24 bg-gradient-to-br from-gray-800/30 to-gray-900/30 border border-white/5 rounded-lg animate-pulse" />
        <div className="h-24 bg-gradient-to-br from-gray-800/30 to-gray-900/30 border border-white/5 rounded-lg animate-pulse" />
        <div className="h-24 bg-gradient-to-br from-gray-800/30 to-gray-900/30 border border-white/5 rounded-lg animate-pulse" />
      </div>

      {/* Loading indicator */}
      <div className="flex items-center justify-center py-4">
        <div className="flex items-center gap-2">
          <motion.div
            className="w-2 h-2 bg-cyan-400 rounded-full"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [1, 0.5, 1],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: 0,
            }}
          />
          <motion.div
            className="w-2 h-2 bg-cyan-400 rounded-full"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [1, 0.5, 1],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: 0.2,
            }}
          />
          <motion.div
            className="w-2 h-2 bg-cyan-400 rounded-full"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [1, 0.5, 1],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: 0.4,
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}
