'use client';

import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';
import { badgeSizes, badgeIconSizes, type BadgeSize } from '@/lib/design-tokens';

interface BadgeProps {
  children: ReactNode;
  icon?: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple' | 'orange';
  size?: BadgeSize;
  className?: string;
}

/**
 * Badge - Small labeled component for categories, tags, status, etc.
 *
 * Features:
 * - Multiple color variants (badge-specific; not yet centralized)
 * - Optional icon (auto-sized to match the badge size)
 * - Size variants from the central design-tokens badgeSizes scale
 */
export default function Badge({
  children,
  icon: Icon,
  variant = 'default',
  size = 'sm',
  className = ''
}: BadgeProps) {
  const variants = {
    default: 'bg-white/10 text-gray-300 border-white/20',
    success: 'bg-green-500/20 text-green-300 border-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    error: 'bg-red-500/20 text-red-300 border-red-500/30',
    info: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    orange: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-md border ${variants[variant]} ${badgeSizes[size]} font-medium ${className}`}>
      {Icon && <Icon className={badgeIconSizes[size]} />}
      {children}
    </span>
  );
}
