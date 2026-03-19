'use client';

import type { ReactNode, CSSProperties } from 'react';

interface GlowCardProps {
  accentColor: string;
  glowColor: string;
  borderColorClass?: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  animate?: boolean;
}

/**
 * GlowCard — now a clean bordered panel (Grid style).
 * Retains the same prop interface for backward compat but renders
 * as a simple bordered container with no glow/blur/chrome.
 */
export default function GlowCard({
  children,
  className = '',
  style,
}: GlowCardProps) {
  return (
    <div
      className={`border border-zinc-800/70 rounded-sm ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
