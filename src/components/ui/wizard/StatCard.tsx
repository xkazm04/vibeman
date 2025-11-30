'use client';

import { LucideIcon } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  className?: string;
  subtitle?: string;
}

/**
 * StatCard - Display metric or statistic
 *
 * Features:
 * - Large value display
 * - Optional icon
 * - Color variants for different states
 * - Optional subtitle
 */
export default function StatCard({
  label,
  value,
  icon: Icon,
  variant = 'default',
  className = '',
  subtitle
}: StatCardProps) {
  const { getThemeColors } = useThemeStore();
  const colors = getThemeColors();
  
  const variants = {
    default: 'text-white',
    success: 'text-green-400',
    warning: 'text-yellow-400',
    error: 'text-red-400',
    info: colors.text,
  };

  const iconVariants = {
    default: 'text-gray-400',
    success: 'text-green-400',
    warning: 'text-yellow-400',
    error: 'text-red-400',
    info: colors.text,
  };

  return (
    <div className={`text-center ${className}`}>
      {Icon && (
        <div className="flex justify-center mb-2">
          <Icon className={`w-5 h-5 ${iconVariants[variant]}`} />
        </div>
      )}
      <p className="text-gray-400 text-sm mb-2">{label}</p>
      <p className={`text-3xl font-light ${variants[variant]}`}>
        {value}
      </p>
      {subtitle && (
        <p className="text-gray-500 text-xs mt-1">{subtitle}</p>
      )}
    </div>
  );
}
