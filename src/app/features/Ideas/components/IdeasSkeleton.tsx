'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Skeleton, SkeletonText } from '@/components/ui';

/**
 * Skeleton loader for individual idea items
 */
export function IdeaItemSkeleton() {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-gray-600/40 bg-gray-800/20">
      <Skeleton variant="circular" className="w-5 h-5" />
      <Skeleton variant="text" className="flex-1 h-3" />
    </div>
  );
}

/**
 * Skeleton loader for a context column with multiple ideas
 */
export function ContextColumnSkeleton({ itemCount = 4 }: { itemCount?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-gray-800/40 backdrop-blur-sm border border-white/5 rounded-xl p-3"
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Skeleton variant="circular" className="w-3 h-3" />
          <Skeleton variant="text" className="w-24 h-4" />
        </div>
        <Skeleton variant="rounded" className="w-8 h-5" />
      </div>

      {/* Ideas List */}
      <div className="space-y-2">
        {Array.from({ length: itemCount }).map((_, i) => (
          <IdeaItemSkeleton key={i} />
        ))}
      </div>
    </motion.div>
  );
}

/**
 * Skeleton loader for a project section with multiple context columns
 */
export function ProjectSectionSkeleton({ columnCount = 4 }: { columnCount?: number }) {
  return (
    <div className="space-y-4">
      {/* Project Header */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-blue-400/50 rounded-full animate-pulse" />
        <Skeleton variant="text" className="w-32 h-5" />
        <Skeleton variant="text" className="w-16 h-4" />
      </div>

      {/* Columns Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: columnCount }).map((_, i) => (
          <ContextColumnSkeleton key={i} itemCount={Math.floor(Math.random() * 3) + 2} />
        ))}
      </div>
    </div>
  );
}

/**
 * Full Ideas buffer skeleton - shows 2 project sections
 */
export function IdeasBufferSkeleton() {
  return (
    <div className="space-y-8" data-testid="ideas-buffer-skeleton">
      <ProjectSectionSkeleton columnCount={4} />
      <ProjectSectionSkeleton columnCount={3} />
    </div>
  );
}

export default IdeasBufferSkeleton;
