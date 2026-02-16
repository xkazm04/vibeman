'use client';

import { motion } from 'framer-motion';
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

const baseBackground = 'linear-gradient(135deg, rgba(17, 24, 39, 0.9) 0%, rgba(3, 7, 18, 0.95) 100%)';

/**
 * Shared card chrome for Brain module panels.
 * Renders the gradient background, corner markers, grid overlay,
 * ambient glow, and bottom accent line.
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
  const cardStyle: CSSProperties = {
    background: baseBackground,
    boxShadow: `0 0 40px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.05)`,
    ...style,
  };

  const Wrapper = animate ? motion.div : 'div';
  const animateProps = animate
    ? { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }
    : {};

  return (
    <Wrapper
      {...animateProps}
      className={`relative overflow-hidden rounded-2xl border backdrop-blur-xl ${borderColorClass} ${className}`}
      style={cardStyle}
    >
      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(${accentColor} 1px, transparent 1px), linear-gradient(90deg, ${accentColor} 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
        }}
      />

      {/* Ambient glow */}
      <div
        className="absolute -top-1/2 -right-1/2 w-full h-full blur-3xl pointer-events-none opacity-20"
        style={{ background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)` }}
      />

      {/* Corner markers */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 rounded-tl-lg" style={{ borderColor: accentColor }} />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 rounded-tr-lg" style={{ borderColor: accentColor }} />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 rounded-bl-lg" style={{ borderColor: accentColor }} />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 rounded-br-lg" style={{ borderColor: accentColor }} />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-0.5"
        style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
      />
    </Wrapper>
  );
}
