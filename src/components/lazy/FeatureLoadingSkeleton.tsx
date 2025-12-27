'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useThemeStore } from '@/stores/themeStore';

interface FeatureLoadingSkeletonProps {
  /** Feature name to display while loading */
  featureName?: string;
  /** Skeleton layout variant */
  variant?: 'default' | 'sidebar' | 'cards' | 'table' | 'minimal';
  /** Custom height for the skeleton */
  height?: string;
  /** Test ID for automated testing */
  'data-testid'?: string;
}

/**
 * Animated loading skeleton for lazily-loaded feature modules.
 * Uses theme colors and provides visual feedback during chunk loading.
 */
export default function FeatureLoadingSkeleton({
  featureName,
  variant = 'default',
  height = 'min-h-[400px]',
  'data-testid': testId,
}: FeatureLoadingSkeletonProps) {
  const { getThemeColors } = useThemeStore();
  const colors = getThemeColors();

  const shimmerClass = 'animate-pulse bg-gradient-to-r from-transparent via-white/5 to-transparent';

  const renderContent = () => {
    switch (variant) {
      case 'sidebar':
        return (
          <div className="flex h-full">
            {/* Sidebar */}
            <div className={`w-64 ${colors.bg} border-r ${colors.border} p-6`}>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className={`h-10 ${colors.bgHover} rounded-lg ${shimmerClass}`}
                  />
                ))}
              </div>
            </div>
            {/* Main content */}
            <div className="flex-1 p-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className={`h-12 w-64 ${colors.bgHover} rounded-lg ${shimmerClass} mb-8`}
              />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className={`h-64 ${colors.bgHover} rounded-xl ${shimmerClass}`}
              />
            </div>
          </div>
        );

      case 'cards':
        return (
          <div className="p-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`h-10 w-48 ${colors.bgHover} rounded-lg ${shimmerClass} mb-6`}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className={`h-40 ${colors.bgHover} rounded-xl ${shimmerClass}`}
                />
              ))}
            </div>
          </div>
        );

      case 'table':
        return (
          <div className="p-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`h-10 w-48 ${colors.bgHover} rounded-lg ${shimmerClass} mb-6`}
            />
            <div className={`${colors.bg} rounded-xl border ${colors.border} overflow-hidden`}>
              {/* Table header */}
              <div className={`h-12 ${colors.bgHover} border-b ${colors.border}`} />
              {/* Table rows */}
              {[1, 2, 3, 4, 5].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.06 }}
                  className={`h-14 border-b ${colors.borderLight} ${shimmerClass}`}
                />
              ))}
            </div>
          </div>
        );

      case 'minimal':
        return (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center space-y-4">
              <div className={`w-10 h-10 border-2 ${colors.border} border-t-transparent rounded-full animate-spin`} />
              {featureName && (
                <span className={`text-sm ${colors.textDark}`}>
                  Loading {featureName}...
                </span>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="p-6 space-y-6">
            {/* Header skeleton */}
            <div className="flex items-center justify-between">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`h-8 w-48 ${colors.bgHover} rounded-lg ${shimmerClass}`}
              />
              <div className="flex gap-2">
                {[1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className={`h-8 w-20 ${colors.bgHover} rounded-lg ${shimmerClass}`}
                  />
                ))}
              </div>
            </div>

            {/* Content skeleton */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`h-48 ${colors.bgHover} rounded-xl ${shimmerClass}`}
            />

            {/* Bottom section skeleton */}
            <div className="grid grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className={`h-32 ${colors.bgHover} rounded-xl ${shimmerClass}`}
              />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className={`h-32 ${colors.bgHover} rounded-xl ${shimmerClass}`}
              />
            </div>
          </div>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`${height} ${colors.bg} rounded-xl`}
      data-testid={testId || `feature-loading-skeleton-${variant}`}
    >
      {renderContent()}
    </motion.div>
  );
}
