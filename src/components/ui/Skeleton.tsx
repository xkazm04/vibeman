'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

/**
 * Base Skeleton component for loading placeholders
 */
export function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'pulse',
}: SkeletonProps) {
  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-lg',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: '',
    none: '',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  if (animation === 'wave') {
    return (
      <div
        className={`relative overflow-hidden bg-white/10 ${variantClasses[variant]} ${className}`}
        style={style}
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    );
  }

  return (
    <div
      className={`bg-white/10 ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
    />
  );
}

/**
 * Text skeleton - single line of text
 */
export function SkeletonText({ lines = 1, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={i === lines - 1 && lines > 1 ? '60%' : '100%'}
          className="h-4"
        />
      ))}
    </div>
  );
}

/**
 * Avatar skeleton
 */
export function SkeletonAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return <Skeleton variant="circular" className={sizes[size]} />;
}

/**
 * Button skeleton
 */
export function SkeletonButton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'h-8 w-20',
    md: 'h-10 w-24',
    lg: 'h-12 w-32',
  };

  return <Skeleton variant="rounded" className={sizes[size]} />;
}

/**
 * Card skeleton - common card layout
 */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white/5 border border-white/10 rounded-xl p-4 space-y-4 ${className}`}>
      <div className="flex items-center gap-3">
        <SkeletonAvatar />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} />
        </div>
      </div>
      <SkeletonText lines={3} />
      <div className="flex gap-2 pt-2">
        <SkeletonButton size="sm" />
        <SkeletonButton size="sm" />
      </div>
    </div>
  );
}

/**
 * Table row skeleton
 */
export function SkeletonTableRow({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-white/5">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className="flex-1"
          height={16}
        />
      ))}
    </div>
  );
}

/**
 * List item skeleton
 */
export function SkeletonListItem({ hasAvatar = true }: { hasAvatar?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-2">
      {hasAvatar && <SkeletonAvatar size="sm" />}
      <div className="flex-1 space-y-1">
        <Skeleton width="70%" height={14} />
        <Skeleton width="50%" height={12} />
      </div>
    </div>
  );
}

/**
 * Image/media skeleton
 */
export function SkeletonMedia({
  aspectRatio = '16/9',
  className = '',
}: {
  aspectRatio?: '1/1' | '16/9' | '4/3' | '21/9';
  className?: string;
}) {
  return (
    <div
      className={`bg-white/10 rounded-lg animate-pulse ${className}`}
      style={{ aspectRatio }}
    />
  );
}

/**
 * Stats card skeleton
 */
export function SkeletonStats() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
      <Skeleton width={80} height={12} />
      <Skeleton width={120} height={32} />
      <div className="flex items-center gap-2 pt-1">
        <Skeleton width={40} height={16} variant="rounded" />
        <Skeleton width={60} height={12} />
      </div>
    </div>
  );
}

export default Skeleton;
