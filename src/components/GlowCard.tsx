'use client';

import React from 'react';
import { useThemeStore } from '@/stores/themeStore';
import { getFocusRingStyles } from '@/lib/ui/focusRing';
import { shadows, backgrounds } from '@/lib/design-tokens';

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  glowColor?: 'cyan' | 'blue' | 'green' | 'red';
  onClick?: () => void;
  'data-testid'?: string;
}

export const GlowCard: React.FC<GlowCardProps> = ({
  children,
  className = '',
  glow = false,
  glowColor = 'cyan',
  onClick,
  'data-testid': dataTestId,
}) => {
  const { getThemeColors, theme } = useThemeStore();
  const colors = getThemeColors();
  const focusRingClasses = onClick ? getFocusRingStyles(theme) : '';

  const glowColors = {
    cyan: colors.glow,
    blue: shadows.blue.glow,
    green: shadows.green.glow,
    red: shadows.red.glow,
  };

  const baseClasses = `
    bg-gray-900/70 backdrop-blur-xl border border-gray-700/50 rounded-lg
    ${glow ? `shadow-lg ${glowColors[glowColor]}` : ''}
    ${onClick ? `cursor-pointer hover:bg-gray-800/70 transition-colors ${focusRingClasses}` : ''}
    ${className}
  `.trim();

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseClasses} text-left w-full`}
        data-testid={dataTestId}
      >
        {children}
      </button>
    );
  }

  return (
    <div className={baseClasses} data-testid={dataTestId}>
      {children}
    </div>
  );
}; 