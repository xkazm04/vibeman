'use client';

import React from 'react';
import { GlassCard, type GlassIntent } from '@/components/ui/GlassCard';

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  glowColor?: 'cyan' | 'blue' | 'green' | 'red';
  onClick?: () => void;
  'data-testid'?: string;
}

const GLOW_TO_INTENT: Record<string, GlassIntent> = {
  cyan: 'info',
  blue: 'accent',
  green: 'success',
  red: 'danger',
};

/**
 * Generic GlowCard — wraps the unified GlassCard primitive
 * with theme-aware glow color presets.
 */
export const GlowCard: React.FC<GlowCardProps> = ({
  children,
  className = '',
  glow = false,
  glowColor = 'cyan',
  onClick,
  'data-testid': dataTestId,
}) => {
  const intent: GlassIntent = glow ? (GLOW_TO_INTENT[glowColor] ?? 'neutral') : 'neutral';

  return (
    <GlassCard
      intent={intent}
      padding="none"
      mouseGlow={glow}
      clickable={!!onClick}
      onClick={onClick}
      className={`rounded-lg ${className}`}
      animate={false}
      data-testid={dataTestId}
    >
      {children}
    </GlassCard>
  );
};
