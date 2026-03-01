'use client';

import type { ReactNode, CSSProperties } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';

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
 * Brain-specific GlowCard — wraps the unified GlassCard primitive
 * and adds the Brain module decorative chrome (corner markers, grid overlay,
 * ambient glow, bottom accent line).
 */
export default function GlowCard({
  accentColor,
  glowColor,
  borderColorClass = '',
  children,
  className = '',
  style,
  animate = true,
}: GlowCardProps) {
  return (
    <GlassCard
      accentColor={accentColor}
      glowColor={glowColor}
      className={`rounded-2xl ${borderColorClass} ${className}`}
      style={style}
      animate={animate}
      mouseGlow
      padding="none"
    >
      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none z-0"
        style={{
          backgroundImage: `linear-gradient(${accentColor} 1px, transparent 1px), linear-gradient(90deg, ${accentColor} 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
        }}
      />

      {/* Ambient glow */}
      <div
        className="absolute -top-1/2 -right-1/2 w-full h-full blur-3xl pointer-events-none opacity-20 z-0"
        style={{ background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)` }}
      />

      {/* Corner markers */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 rounded-tl-lg z-0" style={{ borderColor: accentColor }} />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 rounded-tr-lg z-0" style={{ borderColor: accentColor }} />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 rounded-bl-lg z-0" style={{ borderColor: accentColor }} />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 rounded-br-lg z-0" style={{ borderColor: accentColor }} />

      {/* Content */}
      {children}

      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-0.5 z-0"
        style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
      />
    </GlassCard>
  );
}
