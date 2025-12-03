'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useThemeStore } from '@/stores/themeStore';
import { getFocusRingStyles } from '@/lib/ui/focusRing';
import { scales } from '@/lib/design-tokens';

interface CyberCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'dark' | 'glow';
  hover?: boolean;
  onClick?: () => void;
  'data-testid'?: string;
}

/**
 * CyberCard - Futuristic card component with gradient background
 *
 * Variants:
 * - default: Subtle white gradient
 * - dark: Darker background
 * - glow: With cyan glow effect
 *
 * Features Blueprint-inspired design with grid patterns
 */
export default function CyberCard({
  children,
  className = '',
  variant = 'default',
  hover = false,
  onClick,
  'data-testid': dataTestId,
}: CyberCardProps) {
  const { getThemeColors, theme } = useThemeStore();
  const colors = getThemeColors();
  const focusRingClasses = onClick ? getFocusRingStyles(theme) : '';

  const variants = {
    default: 'bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10',
    dark: 'bg-black/30 border-white/10',
    glow: `bg-gradient-to-br ${colors.bgLight} to-blue-500/5 ${colors.borderLight}`,
  };

  const Component = hover || onClick ? motion.div : 'div';
  const motionProps = hover || onClick ? {
    whileHover: { scale: scales.hoverMinimal, borderColor: 'rgba(6, 182, 212, 0.3)' },
    whileTap: onClick ? { scale: 0.99 } : undefined,
  } : {};

  // For clickable cards, we wrap in a button for proper keyboard accessibility
  if (onClick) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        className={`border rounded-xl p-6 transition-all duration-200 ${variants[variant]} cursor-pointer text-left w-full ${focusRingClasses} ${className}`}
        data-testid={dataTestId}
        whileHover={{ scale: scales.hoverMinimal, borderColor: 'rgba(6, 182, 212, 0.3)' }}
        whileTap={{ scale: 0.99 }}
      >
        {children}
      </motion.button>
    );
  }

  return (
    <Component
      className={`border rounded-xl p-6 transition-all duration-200 ${variants[variant]} ${className}`}
      data-testid={dataTestId}
      {...motionProps}
    >
      {children}
    </Component>
  );
}
